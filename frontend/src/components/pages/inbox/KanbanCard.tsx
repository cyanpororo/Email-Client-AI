import { useDraggable } from '@dnd-kit/core';
import type { Email } from './types';
import type { WorkflowState } from '../../../api/workflow';

interface KanbanCardProps {
    email: Email;
    workflow?: WorkflowState;
    onClick: (email: Email) => void;
}

export function KanbanCard({ email, workflow, onClick }: KanbanCardProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: email.id,
        data: { email, workflow },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

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
                <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(email.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
            </div>
            <div className="font-medium text-sm text-gray-800 mb-1.5 leading-tight line-clamp-2">
                {email.subject}
            </div>
            <div className="text-xs text-gray-500 line-clamp-3 mb-2">
                {workflow?.summary || email.preview}
            </div>

            {workflow?.summary && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-indigo-600 flex items-center font-medium">
                    <span className="mr-1">✨</span> AI Summary
                </div>
            )}

            {/* Decorative colored strip based on logic if needed, left side */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${email.isRead ? 'bg-transparent' : 'bg-blue-500'}`}></div>
        </div>
    );
}
