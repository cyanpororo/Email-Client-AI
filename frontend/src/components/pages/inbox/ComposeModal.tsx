import type { Dispatch, SetStateAction, FormEvent } from "react";
import { useEffect } from "react";
import { Card } from "../../ui/card";
import { Button } from "../../ui/button";
import type { ComposeMode } from "./types";

interface ComposeModalProps {
    mode: ComposeMode;
    to: string;
    setTo: Dispatch<SetStateAction<string>>;
    cc: string;
    setCc: Dispatch<SetStateAction<string>>;
    subject: string;
    setSubject: Dispatch<SetStateAction<string>>;
    body: string;
    setBody: Dispatch<SetStateAction<string>>;
    attachments: File[];
    onAttachFile: (files: FileList | null) => void;
    onRemoveAttachment: (index: number) => void;
    sending: boolean;
    onClose: () => void;
    onSend: (e: FormEvent) => void;
}

export function ComposeModal({
    mode,
    to,
    setTo,
    cc,
    setCc,
    subject,
    setSubject,
    body,
    setBody,
    attachments,
    onAttachFile,
    onRemoveAttachment,
    sending,
    onClose,
    onSend,
}: ComposeModalProps) {
    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !sending) {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, sending]);

    const getTitle = () => {
        switch (mode) {
            case "reply":
                return "Reply";
            case "forward":
                return "Forward";
            default:
                return "New Message";
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
            <Card className="w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-auto">
                <div className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h2 className="text-lg md:text-xl font-bold">{getTitle()}</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-xl"
                            aria-label="Close compose window"
                        >
                            ✕
                        </button>
                    </div>

                    <form className="space-y-3 md:space-y-4" onSubmit={onSend}>
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                To:
                            </label>
                            <input
                                type="text"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="recipient@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Cc: (optional)
                            </label>
                            <input
                                type="text"
                                value={cc}
                                onChange={(e) => setCc(e.target.value)}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="cc@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Subject:
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Email subject"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Message:
                            </label>
                            <textarea
                                rows={8}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Write your message..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                Attachments:
                            </label>
                            <div className="space-y-2">
                                <label className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => onAttachFile(e.target.files)}
                                        className="hidden"
                                    />
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                        <span className="text-xs md:text-sm">Attach files</span>
                                    </div>
                                </label>

                                {attachments.length > 0 && (
                                    <div className="space-y-1">
                                        {attachments.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-xs md:text-sm"
                                            >
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="truncate font-medium" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="text-gray-500 flex-shrink-0">
                                                        ({Math.round(file.size / 1024)}KB)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => onRemoveAttachment(index)}
                                                    className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
                                                    aria-label="Remove attachment"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                className="text-xs md:text-sm h-8 md:h-9"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={sending}
                                className="text-xs md:text-sm h-8 md:h-9"
                            >
                                {sending ? "Sending..." : "Send"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}
