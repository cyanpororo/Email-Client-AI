import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { MobileView } from "../components/pages/inbox/types";

export function useInboxNavigation() {
    const location = useLocation();
    const navigate = useNavigate();

    const [selectedMailboxId, setSelectedMailboxId] = useState("INBOX");

    // Determine view mode from route
    const viewMode: 'list' | 'kanban' = location.pathname.includes('/inbox/kanban') ? 'kanban' : 'list';

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

    // Function to change view mode by navigating to the appropriate route
    const setViewMode = useCallback((mode: 'list' | 'kanban') => {
        navigate(`/inbox/${mode}`);
    }, [navigate]);

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
