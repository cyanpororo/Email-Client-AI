import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateColumnDto, UpdateColumnDto, KanbanColumn } from './dto/kanban-column.dto';

@Injectable()
export class KanbanColumnService {
    constructor(private readonly supabaseService: SupabaseService) { }

    /**
     * Get all columns for a user, ordered by position
     */
    async getUserColumns(userId: string): Promise<KanbanColumn[]> {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('user_id', userId)
            .order('position', { ascending: true });

        if (error) {
            console.error('[KanbanColumn] Error fetching columns:', error);
            throw new Error('Failed to fetch columns');
        }

        // If no columns exist, create default columns
        if (!data || data.length === 0) {
            return this.createDefaultColumns(userId);
        }

        return data as KanbanColumn[];
    }

    /**
     * Create default columns for a new user
     */
    async createDefaultColumns(userId: string): Promise<KanbanColumn[]> {
        const defaultColumns = [
            { name: 'Inbox', gmail_label: 'INBOX', position: 0, is_default: true },
            { name: 'To Do', gmail_label: 'STARRED', position: 1, is_default: false },
            { name: 'In Progress', gmail_label: null, position: 2, is_default: false },
            { name: 'Done', gmail_label: null, position: 3, is_default: false },
            { name: 'Snoozed', gmail_label: null, position: 4, is_default: false },
        ];

        const supabase = this.supabaseService.getClient();

        const columnsToInsert = defaultColumns.map(col => ({
            user_id: userId,
            name: col.name,
            gmail_label: col.gmail_label,
            position: col.position,
            is_default: col.is_default,
        }));

        const { data, error } = await supabase
            .from('kanban_columns')
            .insert(columnsToInsert)
            .select();

        if (error) {
            console.error('[KanbanColumn] Error creating default columns:', error);
            throw new Error(`Failed to create default columns: ${error.message}`);
        }

        return data as KanbanColumn[];
    }

    /**
     * Create a new column
     */
    async createColumn(userId: string, dto: CreateColumnDto): Promise<KanbanColumn> {
        const supabase = this.supabaseService.getClient();

        // Get the max position for user's columns
        const { data: existingColumns } = await supabase
            .from('kanban_columns')
            .select('position')
            .eq('user_id', userId)
            .order('position', { ascending: false })
            .limit(1);

        const nextPosition = existingColumns && existingColumns.length > 0
            ? existingColumns[0].position + 1
            : 0;

        const { data, error } = await supabase
            .from('kanban_columns')
            .insert({
                user_id: userId,
                name: dto.name,
                gmail_label: dto.gmailLabel || null,
                position: nextPosition,
                is_default: dto.isDefault || false,
            })
            .select()
            .single();

        if (error) {
            console.error('[KanbanColumn] Error creating column:', error);
            throw new Error('Failed to create column');
        }

        return data as KanbanColumn;
    }

    /**
     * Update a column
     */
    async updateColumn(userId: string, columnId: string, dto: UpdateColumnDto): Promise<KanbanColumn> {
        const supabase = this.supabaseService.getClient();

        // Verify ownership
        const { data: existing } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('id', columnId)
            .eq('user_id', userId)
            .single();

        if (!existing) {
            throw new NotFoundException('Column not found');
        }

        // Prevent modifying default Inbox column
        if (existing.is_default && dto.name && dto.name !== existing.name) {
            throw new BadRequestException('Cannot rename default Inbox column');
        }

        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.gmailLabel !== undefined) updateData.gmail_label = dto.gmailLabel;
        if (dto.isDefault !== undefined) updateData.is_default = dto.isDefault;

        const { data, error } = await supabase
            .from('kanban_columns')
            .update(updateData)
            .eq('id', columnId)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            console.error('[KanbanColumn] Error updating column:', error);
            throw new Error('Failed to update column');
        }

        // If the column name changed, update all workflows with the old status to the new status
        if (dto.name && dto.name !== existing.name) {
            const { error: workflowError } = await supabase
                .from('email_workflows')
                .update({ status: dto.name })
                .eq('user_id', userId)
                .eq('status', existing.name);

            if (workflowError) {
                console.error('[KanbanColumn] Error updating workflow statuses:', workflowError);
                // Don't throw - column was updated successfully, just log the error
            }
        }

        return data as KanbanColumn;
    }

    /**
     * Delete a column
     */
    async deleteColumn(userId: string, columnId: string): Promise<void> {
        const supabase = this.supabaseService.getClient();

        // Verify ownership and check if it's default
        const { data: existing } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('id', columnId)
            .eq('user_id', userId)
            .single();

        if (!existing) {
            throw new NotFoundException('Column not found');
        }

        if (existing.is_default) {
            throw new BadRequestException('Cannot delete default Inbox column');
        }

        // Move all emails in this column to Inbox
        const { data: inboxColumn } = await supabase
            .from('kanban_columns')
            .select('name')
            .eq('user_id', userId)
            .eq('is_default', true)
            .single();

        if (inboxColumn) {
            await supabase
                .from('workflows')
                .update({ status: inboxColumn.name })
                .eq('status', existing.name);
        }

        const { error } = await supabase
            .from('kanban_columns')
            .delete()
            .eq('id', columnId)
            .eq('user_id', userId);

        if (error) {
            console.error('[KanbanColumn] Error deleting column:', error);
            throw new Error('Failed to delete column');
        }
    }

    /**
     * Reorder columns
     */
    async reorderColumns(userId: string, columnIds: string[]): Promise<KanbanColumn[]> {
        const supabase = this.supabaseService.getClient();

        // Verify all columns belong to user
        const { data: existingColumns } = await supabase
            .from('kanban_columns')
            .select('id')
            .eq('user_id', userId);

        const userColumnIds = new Set(existingColumns?.map(col => col.id) || []);
        const invalidIds = columnIds.filter(id => !userColumnIds.has(id));

        if (invalidIds.length > 0) {
            throw new BadRequestException('Invalid column IDs');
        }

        // Update positions
        const updates = columnIds.map((id, index) => ({
            id,
            position: index,
            updated_at: new Date().toISOString(),
        }));

        for (const update of updates) {
            await supabase
                .from('kanban_columns')
                .update({ position: update.position, updated_at: update.updated_at })
                .eq('id', update.id)
                .eq('user_id', userId);
        }

        // Fetch and return updated columns
        return this.getUserColumns(userId);
    }

    /**
     * Get column by ID
     */
    async getColumnById(userId: string, columnId: string): Promise<KanbanColumn> {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('id', columnId)
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            throw new NotFoundException('Column not found');
        }

        return data as KanbanColumn;
    }

    /**
     * Get column by name
     */
    async getColumnByName(userId: string, columnName: string): Promise<KanbanColumn | null> {
        const supabase = this.supabaseService.getClient();

        const { data, error } = await supabase
            .from('kanban_columns')
            .select('*')
            .eq('user_id', userId)
            .eq('name', columnName)
            .maybeSingle();

        if (error) {
            console.error('[KanbanColumn] Error fetching column by name:', error);
            return null;
        }

        return data as KanbanColumn | null;
    }
}

