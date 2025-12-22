import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as gmailApi from "../api/gmail";
import type { Email, ComposeMode } from "../components/pages/inbox/types";

export function useComposeFlow() {
    const [showCompose, setShowCompose] = useState(false);
    const [composeMode, setComposeMode] = useState<ComposeMode>("new");
    const [composeTo, setComposeTo] = useState("");
    const [composeCc, setComposeCc] = useState("");
    const [composeSubject, setComposeSubject] = useState("");
    const [composeBody, setComposeBody] = useState("");
    const [replyToEmailId, setReplyToEmailId] = useState<string | null>(null);

    const queryClient = useQueryClient();

    // Helper: Reset compose form
    const resetComposeForm = () => {
        setComposeMode("new");
        setComposeTo("");
        setComposeCc("");
        setComposeSubject("");
        setComposeBody("");
        setReplyToEmailId(null);
    };

    // Send email mutation
    const sendEmailMutation = useMutation({
        mutationFn: (emailData: {
            to: string[];
            cc?: string[];
            subject: string;
            body: string;
            inReplyTo?: string;
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
            alert("Email sent successfully!");
        },
        onError: (error: any) => {
            console.error("Failed to send email:", error);
            if (error.response?.data) {
                console.error("Error details:", error.response.data);
                alert(
                    `Failed to send email: ${error.response.data.message || "Unknown error"}`
                );
            } else {
                alert("Failed to send email. Please try again.");
            }
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
    const handleComposeSubmit = (e: React.FormEvent) => {
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

        sendEmailMutation.mutate({
            to: toEmails,
            cc: ccEmails,
            subject: composeSubject,
            body: composeBody,
            inReplyTo: replyToEmailId || undefined,
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
        sendEmailMutation,
        handleReply,
        handleReplyAll,
        handleForward,
        handleNewCompose,
        handleComposeSubmit
    };
}
