import { useState } from 'react';
import { Button } from '../../ui/button';
import type { KanbanColumn } from '../../../api/gmail';

interface KanbanSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    columns: KanbanColumn[];
    gmailLabels: Array<{ id: string; name: string }>;
    onCreateColumn: (data: { name: string; gmailLabel?: string }) => Promise<void>;
    onUpdateColumn: (columnId: string, data: { name?: string; gmailLabel?: string }) => Promise<void>;
    onDeleteColumn: (columnId: string) => Promise<void>;
}

export function KanbanSettings({
    isOpen,
    onClose,
    columns,
    gmailLabels,
    onCreateColumn,
    onUpdateColumn,
    onDeleteColumn,
}: KanbanSettingsProps) {
    const [newColumnName, setNewColumnName] = useState('');
    const [newColumnLabel, setNewColumnLabel] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editLabel, setEditLabel] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCreate = async () => {
        if (!newColumnName.trim()) {
            setError('Column name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onCreateColumn({
                name: newColumnName.trim(),
                gmailLabel: newColumnLabel || undefined,
            });
            setNewColumnName('');
            setNewColumnLabel('');
        } catch (err: any) {
            setError(err.message || 'Failed to create column');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (columnId: string) => {
        if (!editName.trim()) {
            setError('Column name is required');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onUpdateColumn(columnId, {
                name: editName.trim(),
                gmailLabel: editLabel || undefined,
            });
            setEditingId(null);
            setEditName('');
            setEditLabel('');
        } catch (err: any) {
            setError(err.message || 'Failed to update column');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (columnId: string) => {
        if (!confirm('Are you sure you want to delete this column? Emails will be moved to Inbox.')) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await onDeleteColumn(columnId);
        } catch (err: any) {
            setError(err.message || 'Failed to delete column');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startEdit = (column: KanbanColumn) => {
        setEditingId(column.id);
        setEditName(column.name);
        setEditLabel(column.gmail_label || '');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditLabel('');
        setError(null);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">⚙️ Kanban Settings</h2>
                        <p className="text-sm text-gray-600 mt-1">Customize your workflow columns and Gmail label mappings</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Create New Column */}
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span>➕</span> Create New Column
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Column Name *
                                </label>
                                <input
                                    type="text"
                                    value={newColumnName}
                                    onChange={(e) => setNewColumnName(e.target.value)}
                                    placeholder="e.g., Follow Up"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gmail Label (Optional)
                                </label>
                                <select
                                    value={newColumnLabel}
                                    onChange={(e) => setNewColumnLabel(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isSubmitting}
                                >
                                    <option value="">No label sync</option>
                                    {gmailLabels.map(label => (
                                        <option key={label.id} value={label.id}>
                                            {label.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button
                            onClick={handleCreate}
                            disabled={isSubmitting || !newColumnName.trim()}
                            className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Column'}
                        </Button>
                    </div>

                    {/* Existing Columns */}
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span>📋</span> Existing Columns ({columns.length})
                        </h3>
                        <div className="space-y-2">
                            {columns.map((column) => (
                                <div
                                    key={column.id}
                                    className={`p-4 rounded-lg border ${column.is_default
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-white border-gray-200'
                                        }`}
                                >
                                    {editingId === column.id ? (
                                        // Edit Mode
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Column Name *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={isSubmitting || column.is_default}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Gmail Label
                                                    </label>
                                                    <select
                                                        value={editLabel}
                                                        onChange={(e) => setEditLabel(e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        disabled={isSubmitting}
                                                    >
                                                        <option value="">No label sync</option>
                                                        {gmailLabels.map(label => (
                                                            <option key={label.id} value={label.id}>
                                                                {label.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => handleUpdate(column.id)}
                                                    disabled={isSubmitting}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    size="sm"
                                                >
                                                    Save
                                                </Button>
                                                <Button
                                                    onClick={cancelEdit}
                                                    disabled={isSubmitting}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // View Mode
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900">
                                                        {column.name}
                                                    </h4>
                                                    {column.is_default && (
                                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                                                            Default
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {column.gmail_label ? (
                                                        <>
                                                            <span className="font-medium">Gmail Label:</span>{' '}
                                                            {gmailLabels.find(l => l.id === column.gmail_label)?.name || column.gmail_label}
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-400">No Gmail label sync</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => startEdit(column)}
                                                    disabled={isSubmitting}
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Edit
                                                </Button>
                                                {!column.is_default && (
                                                    <Button
                                                        onClick={() => handleDelete(column.id)}
                                                        disabled={isSubmitting}
                                                        className="bg-red-600 hover:bg-red-700 text-white"
                                                        size="sm"
                                                    >
                                                        Delete
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Info Box */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <span>ℹ️</span> How Gmail Label Mapping Works
                        </h4>
                        <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
                            <li>When you drag an email to a column with a Gmail label, that label is automatically applied in Gmail</li>
                            <li>Common labels: INBOX, STARRED, IMPORTANT, TRASH, etc.</li>
                            <li>You can also map to custom Gmail labels you've created</li>
                            <li>The default Inbox column cannot be deleted or renamed for safety</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="px-6"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

