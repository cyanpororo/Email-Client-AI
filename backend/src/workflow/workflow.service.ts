import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { GmailService } from '../gmail/gmail.service';
import { SummarizationService } from './summarization.service';

@Injectable()
export class WorkflowService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly gmailService: GmailService,
    private readonly summarizationService: SummarizationService,
  ) {}

  async getWorkflow(userId: string, gmailMessageId: string) {
    const supabase = this.supabaseService.getClient();
    let { data, error } = await supabase
      .from('email_workflows')
      .select('*')
      .eq('user_id', userId)
      .eq('gmail_message_id', gmailMessageId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is 'not found'
      console.error('Error fetching workflow:', error);
    }

    // Check for expired snooze
    if (data && data.status === 'Snoozed' && data.snoozed_until) {
      const snoozeTime = new Date(data.snoozed_until).getTime();
      if (snoozeTime <= Date.now()) {
        // Wake up!
        const newStatus = data.previous_status || 'Inbox';
        await this.updateWorkflow(userId, gmailMessageId, {
          status: newStatus,
          snoozedUntil: null,
        });
        data.status = newStatus;
        data.snoozed_until = null;
      }
    }

    return data;
  }

  /**
   * Generate and persist an AI summary for the given Gmail message.
   * Returns the summary text and the updated workflow row.
   */
  async generateSummary(userId: string, gmailMessageId: string, force = false) {
    const existing = await this.getWorkflow(userId, gmailMessageId);
    if (existing?.summary && !force) {
      return existing;
    }

    const email = await this.gmailService.getEmailById(userId, gmailMessageId);
    if (!email) {
      throw new NotFoundException('Email not found for summarization');
    }

    const summary = await this.summarizationService.summarizeEmail({
      subject: email.subject,
      snippet: email.snippet ?? '',
      body: email.body ?? '',
    });

    const updated = await this.updateWorkflow(userId, gmailMessageId, {
      summary,
    });
    return updated;
  }

  // Batch fetch for a list of message IDs
  async getWorkflows(userId: string, gmailMessageIds: string[]) {
    if (!gmailMessageIds.length) return [];
    const supabase = this.supabaseService.getClient();
    let { data, error } = await supabase
      .from('email_workflows')
      .select('*')
      .eq('user_id', userId)
      .in('gmail_message_id', gmailMessageIds);

    if (error) {
      console.error('Error fetching workflows:', error);
      throw new InternalServerErrorException('Failed to fetch workflows');
    }

    // Check for expired snoozes in batch
    const updates: Promise<any>[] = [];
    const now = Date.now();

    // We modify the data in-place to return the correct state to the user immediately
    // and fire off updates to the DB.
    if (data) {
      for (const workflow of data) {
        if (workflow.status === 'Snoozed' && workflow.snoozed_until) {
          const snoozeTime = new Date(workflow.snoozed_until).getTime();
          if (snoozeTime <= now) {
            const newStatus = workflow.previous_status || 'Inbox';
            workflow.status = newStatus;
            workflow.snoozed_until = null;
            updates.push(
              this.updateWorkflow(userId, workflow.gmail_message_id, {
                status: newStatus,
                snoozedUntil: null,
              }),
            );
          }
        }
      }
    }

    // Execute updates in background (or await if critical, but for read performance better not to block too long)
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return data;
  }

  async updateWorkflow(
    userId: string,
    gmailMessageId: string,
    updateDto: UpdateWorkflowDto,
  ) {
    const supabase = this.supabaseService.getClient();
    const { status, snoozedUntil, summary, previousStatus } = updateDto;

    // Prepare update object. Explicitly handle null for snoozedUntil to allow clearing it.
    const updateData: any = {
      user_id: userId,
      gmail_message_id: gmailMessageId,
      updated_at: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (snoozedUntil !== undefined) updateData.snoozed_until = snoozedUntil;
    if (summary !== undefined) updateData.summary = summary;
    if (previousStatus !== undefined)
      updateData.previous_status = previousStatus;

    const { data, error } = await supabase
      .from('email_workflows')
      .upsert(updateData, { onConflict: 'user_id,gmail_message_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating workflow:', error);
      throw new InternalServerErrorException('Failed to update workflow');
    }

    // Apply Gmail label based on column configuration (background, non-blocking)
    if (status !== undefined && status !== 'Snoozed') {
      this.gmailService.applyColumnLabel(userId, gmailMessageId, status)
        .catch(err => console.error('Failed to sync Gmail label:', err));
    }

    return data;
  }
}
