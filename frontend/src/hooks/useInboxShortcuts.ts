import { useEffect } from "react";
import type { Email } from "../components/pages/inbox/types";

interface UseInboxShortcutsProps {
    emails: Email[];
    selectedEmailId: string | null;
    selectedEmail: Email | null;
    handleEmailClick: (email: Email) => void;
    toggleStarMutation: any; // Using any for brevity mostly due to complex mutation type
    handleDeleteEmail: (id: string) => void;
    handleReply: (email: Email) => void;
    setShowCompose: (show: boolean) => void;
}

export function useInboxShortcuts({
    emails,
    selectedEmailId,
    selectedEmail,
    handleEmailClick,
    toggleStarMutation,
    handleDeleteEmail,
    handleReply,
    setShowCompose,
}: UseInboxShortcutsProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const currentIndex = emails.findIndex(
                (email: Email) => email.id === selectedEmailId
            );

            switch (e.key) {
                case "ArrowDown":
                case "j":
                    e.preventDefault();
                    if (currentIndex < emails.length - 1) {
                        handleEmailClick(emails[currentIndex + 1]);
                    }
                    break;
                case "ArrowUp":
                case "k":
                    e.preventDefault();
                    if (currentIndex > 0) {
                        handleEmailClick(emails[currentIndex - 1]);
                    }
                    break;
                case "r":
                    if (selectedEmail && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handleReply(selectedEmail);
                    }
                    break;
                case "s":
                    if (selectedEmailId && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        const email = emails.find((e) => e.id === selectedEmailId);
                        if (email) {
                            toggleStarMutation.mutate({
                                emailId: selectedEmailId,
                                starred: !email.isStarred,
                            });
                        }
                    }
                    break;
                case "Delete":
                    if (selectedEmailId && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        handleDeleteEmail(selectedEmailId);
                    }
                    break;
                case "c":
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        setShowCompose(true);
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        emails,
        selectedEmailId,
        selectedEmail,
        handleEmailClick,
        toggleStarMutation,
        handleDeleteEmail,
        handleReply,
        setShowCompose,
    ]);
}
