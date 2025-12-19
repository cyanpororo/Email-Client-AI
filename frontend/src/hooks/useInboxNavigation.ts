import { useState, useEffect, useCallback } from "react";
import type { MobileView } from "../components/pages/inbox/types";

export function useInboxNavigation() {
    const [selectedMailboxId, setSelectedMailboxId] = useState("INBOX");
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [isMobileView, setIsMobileView] = useState(false);
    const [mobileView, setMobileView] = useState<MobileView>("list");

    // Kanban Filter/Sort State
    const [kanbanSortOrder, setKanbanSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [filterUnread, setFilterUnread] = useState(false);
    const [filterHasAttachment, setFilterHasAttachment] = useState(false);

    // Responsive handling
    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth < 1024);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleMailboxClick = useCallback(
        (mailboxId: string) => {
            setSelectedMailboxId(mailboxId);
            if (isMobileView) {
                setMobileView("list");
            }
        },
        [isMobileView]
    );

    return {
        selectedMailboxId,
        setSelectedMailboxId,
        viewMode,
        setViewMode,
        isMobileView,
        mobileView,
        setMobileView,
        kanbanSortOrder,
        setKanbanSortOrder,
        filterUnread,
        setFilterUnread,
        filterHasAttachment,
        setFilterHasAttachment,
        handleMailboxClick,
    };
}
