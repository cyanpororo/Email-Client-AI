import { useState, useCallback } from "react";
import type { Email, MobileView } from "../components/pages/inbox/types";

export function useEmailSelection(
    emails: Email[],
    isMobileView: boolean,
    setMobileView: (view: MobileView) => void
) {
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

    // Toggle email selection
    const toggleEmailSelection = (emailId: string) => {
        setSelectedEmails((prev: Set<string>) => {
            const newSet = new Set(prev);
            if (newSet.has(emailId)) {
                newSet.delete(emailId);
            } else {
                newSet.add(emailId);
            }
            return newSet;
        });
    };

    // Select all emails
    const selectAllEmails = () => {
        if (selectedEmails.size === emails.length) {
            setSelectedEmails(new Set());
        } else {
            setSelectedEmails(new Set(emails.map((e: Email) => e.id)));
        }
    };

    // Handle email selection (single click)
    const handleEmailClick = useCallback(
        (email: Email, markAsRead?: (id: string) => void) => {
            setSelectedEmailId(email.id);
            if (!email.isRead && markAsRead) {
                markAsRead(email.id);
            }
            if (isMobileView) {
                setMobileView("detail");
            }
        },
        [isMobileView, setMobileView]
    );

    return {
        selectedEmailId,
        setSelectedEmailId,
        selectedEmails,
        setSelectedEmails,
        toggleEmailSelection,
        selectAllEmails,
        handleEmailClick
    };
}
