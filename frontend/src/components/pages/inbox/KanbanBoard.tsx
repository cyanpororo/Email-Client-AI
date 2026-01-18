import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import type { Email } from './types';
import { KanbanCard } from './KanbanCard';
import { fetchWorkflows, updateWorkflow, generateSummary, type WorkflowState } from '../../../api/workflow';
import { useKanbanColumns } from '../../../hooks/useKanbanColumns';
import { KanbanSettings } from './KanbanSettings';
import { getGmailLabels, type GmailLabel } from '../../../api/gmail';
import { getOperationErrorMessage, formatErrorForLogging } from '../../../lib/errorHandler';

interface KanbanBoardProps {
    emails: Email[];
    onEmailClick: (email: Email) => void;
    currentMailboxId: string;
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 min-h-[100px] rounded-b-lg transition-colors p-2 ${isOver ? 'bg-blue-50/50' : ''}`}
        >
            {children}
        </div>
    );
}

export function KanbanBoard({ emails, onEmailClick }: KanbanBoardProps) {
    const queryClient = useQueryClient();
    const [workflows, setWorkflows] = useState<Record<string, WorkflowState>>({});
    const [fetchedWorkflowIds, setFetchedWorkflowIds] = useState<Set<string>>(new Set());
    const [activeId, setActiveId] = useState<string | null>(null);
    const [generatingSummaries, setGeneratingSummaries] = useState<Set<string>>(new Set());
    const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
    const requestedSummariesRef = useRef<Set<string>>(new Set());
    const [showSettings, setShowSettings] = useState(false);
    const [gmailLabels, setGmailLabels] = useState<GmailLabel[]>([]);

    // Use dynamic columns from hook
    const {
        columns,
        isLoading: columnsLoading,
        error: columnsError,
        createColumn,
        updateColumn,
        deleteColumn
    } = useKanbanColumns();

    const loadWorkflows = useCallback(() => {
        if (emails.length === 0) return;
        const ids = emails.map(e => e.id);
        fetchWorkflows(ids).then(data => {
            const map: Record<string, WorkflowState> = {};
            data.forEach(w => map[w.gmail_message_id] = w);
            setWorkflows(prev => ({ ...prev, ...map }));
            setFetchedWorkflowIds(prev => new Set([...prev, ...ids]));
        }).catch(err => console.error("Failed to fetch workflows", err));
    }, [emails]);

    // Refresh workflows when emails change and poll every 30s
    useEffect(() => {
        loadWorkflows();
        const interval = setInterval(loadWorkflows, 30000);
        return () => clearInterval(interval);
    }, [loadWorkflows]);

    // Load Gmail labels for settings
    useEffect(() => {
        getGmailLabels()
            .then(labels => setGmailLabels(labels))
            .catch(err => console.error('Failed to load Gmail labels:', err));
    }, []);

    // Auto-generate summaries for emails missing one
    useEffect(() => {
        const missing = emails.filter(email =>
            fetchedWorkflowIds.has(email.id) &&
            !workflows[email.id]?.summary &&
            !requestedSummariesRef.current.has(email.id)
        );

        if (!missing.length) return;

        missing.forEach(email => {
            requestedSummariesRef.current.add(email.id);
            setGeneratingSummaries(prev => new Set(prev).add(email.id));
            setSummaryErrors(prev => {
                const next = { ...prev };
                delete next[email.id];
                return next;
            });

            generateSummary(email.id)
                .then(data => {
                    setWorkflows(prev => ({
                        ...prev,
                        [email.id]: {
                            ...(prev[email.id] || { id: data.id || 'temp', gmail_message_id: email.id }),
                            ...data,
                            gmail_message_id: email.id,
                        } as WorkflowState
                    }));
                    setGeneratingSummaries(prev => {
                        const next = new Set(prev);
                        next.delete(email.id);
                        return next;
                    });
                })
                .catch(err => {
                    console.error(formatErrorForLogging(err, 'generateSummary'));
                    const errorMessage = getOperationErrorMessage('generate-summary', err);
                    setSummaryErrors(prev => ({
                        ...prev,
                        [email.id]: errorMessage
                    }));
                    setGeneratingSummaries(prev => {
                        const next = new Set(prev);
                        next.delete(email.id);
                        return next;
                    });
                    requestedSummariesRef.current.delete(email.id);
                });
        });
    }, [emails, workflows]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor)
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const emailId = active.id as string;
        const newStatus = over.id as string;

        // Optimistic update
        const currentWorkflow = workflows[emailId];
        const oldStatus = currentWorkflow?.status || 'Inbox';

        if (oldStatus === newStatus) {
            return;
        }

        let snoozedUntil: string | null | undefined = undefined;
        if (newStatus === 'Snoozed') {
            const d = new Date();
            const snoozeMinutes = parseInt(import.meta.env.VITE_SNOOZE_DURATION_MINUTES || '1', 10);
            d.setMinutes(d.getMinutes() + snoozeMinutes);
            snoozedUntil = d.toISOString();
        } else if (oldStatus === 'Snoozed') {
            snoozedUntil = null;
        }

        setWorkflows(prev => ({
            ...prev,
            [emailId]: {
                ...(prev[emailId] || { id: 'temp', gmail_message_id: emailId, snoozed_until: null, summary: null }),
                status: newStatus,
                gmail_message_id: emailId,
                ...(snoozedUntil !== undefined && { snoozed_until: snoozedUntil })
            } as WorkflowState
        }));

        // API Call
        try {
            await updateWorkflow(emailId, {
                status: newStatus,
                ...(snoozedUntil !== undefined && { snoozedUntil }),
                ...(newStatus === 'Snoozed' && { previousStatus: oldStatus })
            });

            // Invalidate email queries to refetch with updated labels
            // Use a small delay to allow backend to sync labels with Gmail
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['gmailEmails'] });
                queryClient.invalidateQueries({ queryKey: ['gmailEmailDetail'] });
            }, 500);
        } catch (err) {
            console.error("Failed to update status", err);
            // Rollback
            setWorkflows(prev => ({
                ...prev,
                [emailId]: {
                    ...prev[emailId],
                    status: oldStatus,
                    // Note: strictly we should rollback snoozed_until too but it's complex to track prev state entirely easily here without full object.
                    // Assuming partial rollback of status is good enough or we accept minor desync on error.
                } as WorkflowState
            }));
        }
    };

    const handleSnooze = async (emailId: string, snoozedUntil: string) => {
        const currentWorkflow = workflows[emailId];
        const oldStatus = currentWorkflow?.status || 'Inbox';

        // Optimistic update
        setWorkflows(prev => ({
            ...prev,
            [emailId]: {
                ...(prev[emailId] || { id: 'temp', gmail_message_id: emailId, summary: null }),
                status: 'Snoozed',
                gmail_message_id: emailId,
                snoozed_until: snoozedUntil,
                previous_status: oldStatus,
            } as WorkflowState
        }));

        try {
            await updateWorkflow(emailId, {
                status: 'Snoozed',
                previousStatus: oldStatus,
                snoozedUntil,
            });

            // Invalidate queries to refetch with updated labels
            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['gmailEmails'] });
            }, 500);
        } catch (err) {
            console.error(formatErrorForLogging(err, 'snoozeEmail'));
            // Rollback
            setWorkflows(prev => ({
                ...prev,
                [emailId]: {
                    ...(prev[emailId] || { id: 'temp', gmail_message_id: emailId, summary: null }),
                    status: oldStatus,
                    gmail_message_id: emailId,
                } as WorkflowState
            }));
        }
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    }

    // Group emails by column
    const getEmailsByColumn = (col: string) => {
        return emails.filter(email => {
            const status = workflows[email.id]?.status || 'Inbox';
            return status === col;
        });
    };

    const activeEmail = activeId ? emails.find(e => e.id === activeId) : null;

    // Show loading state
    if (columnsLoading) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading Kanban board...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (columnsError) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-100">
                <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        Failed to Load Columns
                    </h2>
                    <p className="text-gray-600 mb-4">
                        {columnsError}
                    </p>
                    <div className="text-sm text-gray-500 mb-4">
                        Check the browser console for more details.
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Show empty state if no columns
    if (columns.length === 0) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-100">
                <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg">
                    <div className="text-6xl mb-4">📋</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        No Columns Found
                    </h2>
                    <p className="text-gray-600 mb-4">
                        Default columns should have been created automatically. This might indicate a database issue.
                    </p>
                    <div className="text-sm text-gray-500 mb-4">
                        Please check:
                        <ul className="list-disc list-inside mt-2 text-left">
                            <li>Backend is running</li>
                            <li>Database table exists</li>
                            <li>RLS policies are correct</li>
                        </ul>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                        Create Column Manually
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <DndContext
                sensors={sensors}
                onDragEnd={handleDragEnd}
                onDragStart={handleDragStart}
            >
                <div className="flex flex-col h-full bg-gray-100">
                    {/* Settings Button */}
                    <div className="px-4 pt-4 pb-2 flex justify-end">
                        <button
                            onClick={() => setShowSettings(true)}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <span>⚙️</span>
                            Configure Columns
                        </button>
                    </div>

                    {/* Kanban Board */}
                    <div className="flex flex-1 px-4 pb-4 gap-4 overflow-x-auto">
                        {columns.map(col => (
                            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col bg-gray-50 rounded-xl shadow-sm h-full border border-gray-200">
                                <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-700">{col.name}</h3>
                                        {col.gmail_label && (
                                            <span className="text-xs text-gray-500" title={`Syncs with Gmail label: ${col.gmail_label}`}>
                                                🔗
                                            </span>
                                        )}
                                    </div>
                                    <span className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                        {getEmailsByColumn(col.name).length}
                                    </span>
                                </div>

                                {/* Droppable Area */}
                                <DroppableColumn id={col.name}>
                                    {getEmailsByColumn(col.name).map(email => (
                                        <KanbanCard
                                            key={email.id}
                                            email={email}
                                            workflow={workflows[email.id]}
                                            onClick={onEmailClick}
                                            onSnooze={handleSnooze}
                                            isGeneratingSummary={generatingSummaries.has(email.id)}
                                            summaryError={summaryErrors[email.id]}
                                        />
                                    ))}
                                </DroppableColumn>
                            </div>
                        ))}
                    </div>
                </div>
                <DragOverlay>
                    {activeEmail ? (
                        <div className="transform rotate-2 cursor-grabbing w-80 opacity-90">
                            <KanbanCard
                                email={activeEmail}
                                workflow={workflows[activeEmail.id]}
                                onClick={() => { }}
                                onSnooze={handleSnooze}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Settings Modal */}
            <KanbanSettings
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                columns={columns}
                gmailLabels={gmailLabels.map(l => ({ id: l.id, name: l.name }))}
                onCreateColumn={createColumn}
                onUpdateColumn={updateColumn}
                onDeleteColumn={deleteColumn}
            />
        </>
    );
}
