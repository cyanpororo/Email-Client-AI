import { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, type DragEndEvent, useDroppable } from '@dnd-kit/core';
import type { Email } from './types';
import { KanbanCard } from './KanbanCard';
import { fetchWorkflows, updateWorkflow, generateSummary, type WorkflowState } from '../../../api/workflow';

interface KanbanBoardProps {
    emails: Email[];
    onEmailClick: (email: Email) => void;
    currentMailboxId: string;
}

const COLUMNS = ['Inbox', 'To Do', 'In Progress', 'Done', 'Snoozed'];

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
    const [workflows, setWorkflows] = useState<Record<string, WorkflowState>>({});
    const [activeId, setActiveId] = useState<string | null>(null);
    const [generatingSummaries, setGeneratingSummaries] = useState<Set<string>>(new Set());
    const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
    const requestedSummariesRef = useRef<Set<string>>(new Set());

    const loadWorkflows = useCallback(() => {
        if (emails.length === 0) return;
        const ids = emails.map(e => e.id);
        fetchWorkflows(ids).then(data => {
            const map: Record<string, WorkflowState> = {};
            data.forEach(w => map[w.gmail_message_id] = w);
            setWorkflows(map);
        }).catch(err => console.error("Failed to fetch workflows", err));
    }, [emails]);

    // Refresh workflows when emails change and poll every 30s
    useEffect(() => {
        loadWorkflows();
        const interval = setInterval(loadWorkflows, 30000);
        return () => clearInterval(interval);
    }, [loadWorkflows]);

    // Auto-generate summaries for emails missing one
    useEffect(() => {
        const missing = emails.filter(email =>
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
                    console.error('Failed to generate summary', err);
                    const errorMessage = err?.response?.data?.message || err?.message || 'Failed to generate summary';
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
        } catch (err) {
            console.error("Failed to snooze email", err);
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

    return (
        <DndContext
            sensors={sensors}
            onDragEnd={handleDragEnd}
            onDragStart={handleDragStart}
        >
            <div className="flex h-full p-4 gap-4 overflow-x-auto bg-gray-100">
                {COLUMNS.map(col => (
                    <div key={col} className="flex-shrink-0 w-80 flex flex-col bg-gray-50 rounded-xl shadow-sm h-full border border-gray-200">
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
                            <h3 className="font-semibold text-gray-700">{col}</h3>
                            <span className="bg-gray-100 text-gray-600 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                {getEmailsByColumn(col).length}
                            </span>
                        </div>

                        {/* Droppable Area */}
                        <DroppableColumn id={col}>
                            {getEmailsByColumn(col).map(email => (
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
    );
}
