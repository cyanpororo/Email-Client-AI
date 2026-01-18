import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';

interface SnoozeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (snoozedUntil: string) => void;
    currentSnoozeUntil?: string | null;
}

const PRESET_OPTIONS = [
    { label: '1 hour', minutes: 60 },
    { label: '3 hours', minutes: 180 },
    {
        label: 'Tomorrow 9 AM', getDate: () => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(9, 0, 0, 0);
            return d;
        }
    },
    {
        label: 'Next week', getDate: () => {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            d.setHours(9, 0, 0, 0);
            return d;
        }
    },
];

export function SnoozeModal({ isOpen, onClose, onConfirm, currentSnoozeUntil }: SnoozeModalProps) {
    const toLocalISOString = (date: Date) => {
        const tzOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [customDateTime, setCustomDateTime] = useState(() => {
        // Default to 1 hour from now
        const d = new Date();
        d.setHours(d.getHours() + 1);
        return toLocalISOString(d);
    });

    // Handle ESC key to close modal
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handlePresetClick = (preset: typeof PRESET_OPTIONS[0]) => {
        let date: Date;
        if (preset.getDate) {
            date = preset.getDate();
        } else {
            date = new Date();
            date.setMinutes(date.getMinutes() + (preset.minutes || 0));
        }
        setSelectedPreset(preset.label);
        setCustomDateTime(toLocalISOString(date));
    };

    const handleConfirm = () => {
        const date = new Date(customDateTime);
        if (isNaN(date.getTime())) {
            toast.error('Invalid date/time. Please select a valid date and time.');
            return;
        }
        if (date.getTime() <= Date.now()) {
            toast.error('Please select a future date and time.');
            return;
        }
        onConfirm(date.toISOString());
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Snooze Email</h2>

                {currentSnoozeUntil && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            Currently snoozed until: <strong>{new Date(currentSnoozeUntil).toLocaleString()}</strong>
                        </p>
                    </div>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quick Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {PRESET_OPTIONS.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() => handlePresetClick(preset)}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${selectedPreset === preset.label
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="snooze-datetime" className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Date & Time
                    </label>
                    <input
                        id="snooze-datetime"
                        type="datetime-local"
                        value={customDateTime}
                        onChange={(e) => {
                            setCustomDateTime(e.target.value);
                            setSelectedPreset(null);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min={toLocalISOString(new Date())}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Selected: {new Date(customDateTime).toLocaleString()}
                    </p>
                </div>

                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                        Snooze
                    </Button>
                </div>
            </div>
        </div>
    );
}

