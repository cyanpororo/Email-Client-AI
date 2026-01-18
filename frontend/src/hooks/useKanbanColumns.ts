import { useState, useEffect, useCallback } from 'react';
import * as gmailApi from '../api/gmail';
import { getOperationErrorMessage, formatErrorForLogging } from '../lib/errorHandler';

export function useKanbanColumns() {
    const [columns, setColumns] = useState<gmailApi.KanbanColumn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch columns
    const fetchColumns = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await gmailApi.getKanbanColumns();
            setColumns(data);
        } catch (err: any) {
            console.error(formatErrorForLogging(err, 'fetchColumns'));
            setError(getOperationErrorMessage('load-labels', err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchColumns();
    }, [fetchColumns]);

    // Create column
    const createColumn = useCallback(async (data: gmailApi.CreateColumnRequest) => {
        try {
            const newColumn = await gmailApi.createKanbanColumn(data);
            setColumns(prev => [...prev, newColumn].sort((a, b) => a.position - b.position));
            return newColumn;
        } catch (err: any) {
            console.error(formatErrorForLogging(err, 'createColumn'));
            throw new Error(getOperationErrorMessage('create-column', err));
        }
    }, []);

    // Update column
    const updateColumn = useCallback(async (columnId: string, data: gmailApi.UpdateColumnRequest) => {
        try {
            const updatedColumn = await gmailApi.updateKanbanColumn(columnId, data);
            setColumns(prev => prev.map(col => col.id === columnId ? updatedColumn : col));
            return updatedColumn;
        } catch (err: any) {
            console.error(formatErrorForLogging(err, 'updateColumn'));
            throw new Error(getOperationErrorMessage('update-column', err));
        }
    }, []);

    // Delete column
    const deleteColumn = useCallback(async (columnId: string) => {
        try {
            await gmailApi.deleteKanbanColumn(columnId);
            setColumns(prev => prev.filter(col => col.id !== columnId));
        } catch (err: any) {
            console.error('Failed to delete column:', err);
            throw new Error(err?.response?.data?.message || 'Failed to delete column');
        }
    }, []);

    // Reorder columns
    const reorderColumns = useCallback(async (columnIds: string[]) => {
        try {
            const reordered = await gmailApi.reorderKanbanColumns(columnIds);
            setColumns(reordered);
        } catch (err: any) {
            console.error('Failed to reorder columns:', err);
            throw new Error(err?.response?.data?.message || 'Failed to reorder columns');
        }
    }, []);

    // Get column by name (for workflow status matching)
    const getColumnByName = useCallback((name: string): gmailApi.KanbanColumn | undefined => {
        return columns.find(col => col.name === name);
    }, [columns]);

    return {
        columns,
        isLoading,
        error,
        fetchColumns,
        createColumn,
        updateColumn,
        deleteColumn,
        reorderColumns,
        getColumnByName,
    };
}

