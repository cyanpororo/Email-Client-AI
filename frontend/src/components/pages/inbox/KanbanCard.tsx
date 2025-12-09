import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Email } from './types';
import type { WorkflowState } from '../../../api/workflow';
import { getGmailUrl } from '../../../api/gmail';
import { SnoozeModal } from './SnoozeModal';

interface KanbanCardProps {
    email: Email;
    workflow?: WorkflowState;
    onClick: (email: Email) => void;
    onSnooze?: (emailId: string, snoozedUntil: string) => void;
    isGeneratingSummary?: boolean;
    summaryError?: string;
}

export function KanbanCard({ email, workflow, onClick, onSnooze, isGeneratingSummary, summaryError }: KanbanCardProps) {
    const [showSnoozeModal, setShowSnoozeModal] = useState(false);
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: email.id,
        data: { email, workflow },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    const handleSnoozeClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowSnoozeModal(true);
    };

    const handleSnoozeConfirm = (snoozedUntil: string) => {
        if (onSnooze) {
            onSnooze(email.id, snoozedUntil);
        }
        setShowSnoozeModal(false);
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group relative"
            onClick={() => onClick(email)}
        >
            <div className="flex justify-between items-start mb-1.5">
                <span className="font-semibold text-sm text-gray-900 truncate pr-2 flex-1">
                    {email.from.name || email.from.email}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(email.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                    {onSnooze && (
                        <button
                            className="text-[10px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            onClick={handleSnoozeClick}
                        >
                            {workflow?.status === 'Snoozed' ? 'Resnooze' : 'Snooze'}
                        </button>
                    )}
                </div>
            </div>
            <div className="font-medium text-sm text-gray-800 mb-1.5 leading-tight line-clamp-2">
                {email.subject}
            </div>
            <div className="text-xs text-gray-500 line-clamp-3 mb-2">
                {isGeneratingSummary ? (
                    <div className="flex items-center gap-2 text-gray-400">
                        <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
                        <span>Generating summary...</span>
                    </div>
                ) : summaryError ? (
                    <div className="text-red-600 text-xs">
                        ⚠️ {summaryError}
                    </div>
                ) : (
                    workflow?.summary || email.preview
                )}
            </div>

            {workflow?.summary && !isGeneratingSummary && !summaryError && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-indigo-600 flex items-center font-medium">
                    <span className="mr-1">✨</span> AI Summary
                </div>
            )}

            {/* Snooze indicator */}
            {workflow?.status === 'Snoozed' && workflow?.snoozed_until && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    ⏰ Snoozed until {new Date(workflow.snoozed_until).toLocaleString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}
                </div>
            )}

            {/* Gmail link */}
            <div className="mt-2 pt-2 border-t border-gray-100">
                <a
                    href={getGmailUrl(email.id, email.threadId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                    <span>🔗</span>
                    Open in Gmail
                </a>
            </div>

            {/* Decorative colored strip based on logic if needed, left side */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${email.isRead ? 'bg-transparent' : 'bg-blue-500'}`}></div>

            {/* Snooze Modal */}
            {onSnooze && (
                <SnoozeModal
                    isOpen={showSnoozeModal}
                    onClose={() => setShowSnoozeModal(false)}
                    onConfirm={handleSnoozeConfirm}
                    currentSnoozeUntil={workflow?.snoozed_until || null}
                />
            )}
        </div>
    );
}
