import { Card } from "../../ui/card";
import { Button } from "../../ui/button";

interface GmailConnectionPromptProps {
    isOnline: boolean;
    onConnect: () => void;
}

export function GmailConnectionPrompt({
    isOnline,
    onConnect,
}: GmailConnectionPromptProps) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md p-6">
                <div className="text-center">
                    <div className="text-6xl mb-4">📧</div>
                    <h2 className="text-2xl font-bold mb-4">Connect Your Gmail</h2>
                    <p className="text-gray-600 mb-6">
                        To use this email client, you need to connect your Gmail account.
                        This will allow you to read, send, and manage your emails.
                    </p>
                    {!isOnline && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                            <p className="text-amber-700 text-sm">
                                📡 You're offline. Connect to the internet to set up your
                                Gmail account.
                            </p>
                        </div>
                    )}
                    <Button
                        onClick={onConnect}
                        className="w-full"
                        disabled={!isOnline}
                    >
                        {isOnline ? "Connect Gmail Account" : "Offline - Cannot Connect"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
