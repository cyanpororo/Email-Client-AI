import { api } from './client';

export interface WorkflowState {
    id: string;
    gmail_message_id: string;
    status: string;
    snoozed_until: string | null;
    summary: string | null;
    previous_status?: string | null;
}

export const fetchWorkflows = async (messageIds: string[]) => {
    const response = await api.post('/workflow/batch', { messageIds });
    return response.data as WorkflowState[];
};

export const updateWorkflow = async (messageId: string, data: { status?: string, previousStatus?: string, snoozedUntil?: string | null, summary?: string }) => {
    const response = await api.put(`/workflow/${messageId}`, data);
    return response.data;
};

export const generateSummary = async (messageId: string, force = false) => {
    const response = await api.post(`/workflow/${messageId}/summary`, { force });
    return response.data as WorkflowState;
};
