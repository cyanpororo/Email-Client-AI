import { Card } from "../../ui/card";
import { Button } from "../../ui/button";

interface ComposeModalProps {
    composeTo: string;
    composeCc: string;
    composeSubject: string;
    composeBody: string;
    isSending: boolean;
    onClose: () => void;
    onToChange: (value: string) => void;
    onCcChange: (value: string) => void;
    onSubjectChange: (value: string) => void;
    onBodyChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function ComposeModal({
    composeTo,
    composeCc,
    composeSubject,
    composeBody,
    isSending,
    onClose,
    onToChange,
    onCcChange,
    onSubjectChange,
    onBodyChange,
    onSubmit,
}: ComposeModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
            <Card className="w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-auto">
                <div className="p-4 md:p-6">
                    <div className="flex items-center justify-between mb-3 md:mb-4">
                        <h2 className="text-lg md:text-xl font-bold">New Message</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-xl"
                            aria-label="Close compose window"
                        >
                            ✕
                        </button>
                    </div>

                    <form className="space-y-3 md:space-y-4" onSubmit={onSubmit}>
                        <div>
                            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                                To:
                            </label>
                            <input
                                type="text"
                                value={composeTo}
                                onChange={(e) => onToChange(e.target.value)}
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
                                value={composeCc}
                                onChange={(e) => onCcChange(e.target.value)}
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
                                value={composeSubject}
                                onChange={(e) => onSubjectChange(e.target.value)}
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
                                value={composeBody}
                                onChange={(e) => onBodyChange(e.target.value)}
                                className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Write your message..."
                                required
                            />
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
                                disabled={isSending}
                                className="text-xs md:text-sm h-8 md:h-9"
                            >
                                {isSending ? "Sending..." : "Send"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}
