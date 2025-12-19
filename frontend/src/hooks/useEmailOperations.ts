import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as gmailApi from "../api/gmail";
import {
    useMarkAsReadMutation,
    useMarkAsUnreadMutation,
    useToggleStarMutation,
    useDeleteEmailMutation,
} from "./useOfflineEmails";

interface UseEmailOperationsProps {
    selectedMailboxId: string;
    selectedEmails: Set<string>;
    setSelectedEmails: (emails: Set<string>) => void;
    setSelectedEmailId: (id: string | null) => void;
}

export function useEmailOperations({
    selectedMailboxId,
    selectedEmails,
    setSelectedEmails,
    setSelectedEmailId,
}: UseEmailOperationsProps) {
    const queryClient = useQueryClient();

    // Move to folder menu state
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [moveEmailId, setMoveEmailId] = useState<string | null>(null);

    // Use optimistic update mutations from hooks
    const markAsReadMutation = useMarkAsReadMutation(selectedMailboxId);
    const markAsUnreadMutation = useMarkAsUnreadMutation(selectedMailboxId);
    const toggleStarMutation = useToggleStarMutation(selectedMailboxId);
    const deleteEmailMutation = useDeleteEmailMutation(selectedMailboxId);

    // Wrap delete mutation to also clear selectedEmailId
    const handleDeleteEmail = useCallback(
        (emailId: string) => {
            deleteEmailMutation.mutate(emailId, {
                onSuccess: () => {
                    setSelectedEmailId(null);
                },
            });
        },
        [deleteEmailMutation, setSelectedEmailId]
    );

    // Bulk mark as read
    const markSelectedAsReadMutation = useMutation({
        mutationFn: async () => {
            const promises = Array.from(selectedEmails).map((id) =>
                gmailApi.markGmailAsRead(id)
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            setSelectedEmails(new Set());
            queryClient.invalidateQueries({
                queryKey: ["gmailEmails", selectedMailboxId],
            });
            queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
        },
    });

    // Bulk delete
    const deleteSelectedMutation = useMutation({
        mutationFn: async () => {
            const promises = Array.from(selectedEmails).map((id) =>
                gmailApi.deleteGmailEmail(id)
            );
            await Promise.all(promises);
        },
        onSuccess: () => {
            setSelectedEmails(new Set());
            setSelectedEmailId(null);
            queryClient.invalidateQueries({
                queryKey: ["gmailEmails", selectedMailboxId],
            });
            queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
        },
    });

    // Move to folder mutation
    const moveToFolderMutation = useMutation({
        mutationFn: ({ emailId, labelId }: { emailId: string; labelId: string }) =>
            gmailApi.moveGmailToLabel(emailId, labelId),
        onSuccess: () => {
            setShowMoveMenu(false);
            setMoveEmailId(null);
            queryClient.invalidateQueries({
                queryKey: ["gmailEmails", selectedMailboxId],
            });
            queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
        },
    });

    return {
        markAsReadMutation,
        markAsUnreadMutation,
        toggleStarMutation,
        deleteEmailMutation,
        handleDeleteEmail,
        markSelectedAsReadMutation,
        deleteSelectedMutation,
        moveToFolderMutation,
        showMoveMenu,
        setShowMoveMenu,
        moveEmailId,
        setMoveEmailId,
    };
}
