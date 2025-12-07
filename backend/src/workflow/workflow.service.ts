import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async getWorkflow(userId: string, gmailMessageId: string) {
        const supabase = this.supabaseService.getClient();
        const { data, error } = await supabase
            .from('email_workflows')
            .select('*')
            .eq('user_id', userId)
            .eq('gmail_message_id', gmailMessageId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found'
            console.error('Error fetching workflow:', error);
        }
        return data;
    }

    // Batch fetch for a list of message IDs
    async getWorkflows(userId: string, gmailMessageIds: string[]) {
        if (!gmailMessageIds.length) return [];
        const supabase = this.supabaseService.getClient();
        const { data, error } = await supabase
            .from('email_workflows')
            .select('*')
            .eq('user_id', userId)
            .in('gmail_message_id', gmailMessageIds);

        if (error) {
            console.error('Error fetching workflows:', error);
            throw new InternalServerErrorException('Failed to fetch workflows');
        }
        return data;
    }

    async updateWorkflow(userId: string, gmailMessageId: string, updateDto: UpdateWorkflowDto) {
        const supabase = this.supabaseService.getClient();
        const { status, snoozedUntil, summary } = updateDto;

        const { data, error } = await supabase
            .from('email_workflows')
            .upsert(
                {
                    user_id: userId,
                    gmail_message_id: gmailMessageId,
                    // Only update fields that are defined
                    ...(status !== undefined && { status }),
                    ...(snoozedUntil !== undefined && { snoozed_until: snoozedUntil }),
                    ...(summary !== undefined && { summary }),
                    updated_at: new Date(),
                },
                { onConflict: 'user_id,gmail_message_id' },
            )
            .select()
            .single();

        if (error) {
            console.error('Error updating workflow:', error);
            throw new InternalServerErrorException('Failed to update workflow');
        }
        return data;
    }
}
