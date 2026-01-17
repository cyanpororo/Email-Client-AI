import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as gmailApi from "../api/gmail";
import type { Email, ComposeMode } from "../components/pages/inbox/types";
import { getOperationErrorMessage, formatErrorForLogging } from '../lib/errorHandler';

export function useComposeFlow() {
    const [showCompose, setShowCompose] = useState(false);
    const [composeMode, setComposeMode] = useState<ComposeMode>("new");
    const [composeTo, setComposeTo] = useState("");
    const [composeCc, setComposeCc] = useState("");
    const [composeSubject, setComposeSubject] = useState("");
    const [composeBody, setComposeBody] = useState("");
    const [replyToEmailId, setReplyToEmailId] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<File[]>([]);

    const queryClient = useQueryClient();

    // Helper: Reset compose form
    const resetComposeForm = () => {
        setComposeMode("new");
        setComposeTo("");
        setComposeCc("");
        setComposeSubject("");
        setComposeBody("");
        setReplyToEmailId(null);
        setAttachments([]);
    };

    // Helper: Convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result as string;
                // Remove the data URL prefix (e.g., "data:image/png;base64,")
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = error => reject(error);
        });
    };

    // Helper: Handle file selection
    const handleAttachFile = (files: FileList | null) => {
        if (!files) return;
        const newFiles = Array.from(files);
        setAttachments(prev => [...prev, ...newFiles]);
    };

    // Helper: Remove attachment
    const handleRemoveAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Send email mutation
    const sendEmailMutation = useMutation({
        mutationFn: async (emailData: {
            to: string[];
            cc?: string[];
            subject: string;
            body: string;
            inReplyTo?: string;
            attachments?: Array<{
                filename: string;
                mimeType: string;
                data: string;
            }>
        }) => {
            if (composeMode === "reply" && replyToEmailId) {
                return gmailApi.replyToGmailEmail(replyToEmailId, emailData);
            }
            return gmailApi.sendGmailEmail(emailData);
        },
        onSuccess: () => {
            setShowCompose(false);
            resetComposeForm();
            queryClient.invalidateQueries({ queryKey: ["gmailEmails", "SENT"] });
            toast.success("Email sent successfully!");
        },
        onError: (error: any) => {
            console.error(formatErrorForLogging(error, 'sendEmail'));
            const errorMessage = getOperationErrorMessage('send-email', error);
            toast.error(errorMessage);
        },
    });

    // Helper: Open compose for reply
    const handleReply = useCallback((email: Email) => {
        setComposeMode("reply");
        setReplyToEmailId(email.id);
        setComposeTo(email.from.email);
        setComposeSubject(
            email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
        );
        setComposeBody("");
        setShowCompose(true);
    }, []);

    // Helper: Open compose for reply all
    const handleReplyAll = (email: Email) => {
        setComposeMode("reply");
        setReplyToEmailId(email.id);
        setComposeTo(email.from.email);
        const ccEmails = email.to
            .filter((t: any) => t.email !== email.from.email)
            .map((t: any) => t.email);
        if (email.cc) {
            ccEmails.push(...email.cc.map((c: any) => c.email));
        }
        setComposeCc(ccEmails.join(", "));
        setComposeSubject(
            email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`
        );
        setComposeBody("");
        setShowCompose(true);
    };

    // Helper: Open compose for forward
    const handleForward = (email: Email) => {
        setComposeMode("forward");
        setComposeTo("");
        setComposeSubject(
            email.subject.startsWith("Fwd:") ? email.subject : `Fwd: ${email.subject}`
        );
        setComposeBody("");
        setShowCompose(true);
    };

    // Helper: Open new compose
    const handleNewCompose = () => {
        resetComposeForm();
        setShowCompose(true);
    };

    // Handle compose form submission
    const handleComposeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toEmails = composeTo
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
        const ccEmails = composeCc
            ? composeCc
                .split(",")
                .map((e) => e.trim())
                .filter(Boolean)
            : undefined;

        // Convert attachments to base64
        let attachmentsData: Array<{
            filename: string;
            mimeType: string;
            data: string;
        }> | undefined;

        if (attachments.length > 0) {
            attachmentsData = await Promise.all(
                attachments.map(async (file) => ({
                    filename: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    data: await fileToBase64(file),
                }))
            );
        }

        sendEmailMutation.mutate({
            to: toEmails,
            cc: ccEmails,
            subject: composeSubject,
            body: composeBody,
            inReplyTo: replyToEmailId || undefined,
            attachments: attachmentsData,
        });
    };

    return {
        showCompose,
        setShowCompose,
        composeMode,
        composeTo,
        setComposeTo,
        composeCc,
        setComposeCc,
        composeSubject,
        setComposeSubject,
        composeBody,
        setComposeBody,
        attachments,
        handleAttachFile,
        handleRemoveAttachment,
        sendEmailMutation,
        handleReply,
        handleReplyAll,
        handleForward,
        handleNewCompose,
        handleComposeSubmit
    };
}
