import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as gmailApi from "../api/gmail";

export function useGmailAuth() {
    const queryClient = useQueryClient();

    // Handle OAuth callback
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const gmailStatus = params.get("gmail");
        const errorMessage = params.get("message");

        if (gmailStatus === "connected") {
            // Gmail connected successfully
            alert("Gmail connected successfully!");
            // Remove query params
            window.history.replaceState({}, "", "/inbox");
            queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
        } else if (gmailStatus === "error") {
            alert(`Failed to connect Gmail: ${errorMessage || "Unknown error"}`);
            // Remove query params
            window.history.replaceState({}, "", "/inbox");
        }
    }, [queryClient]);

    const handleConnectGmail = async () => {
        try {
            const authUrl = await gmailApi.getGmailAuthUrl();
            window.location.href = authUrl;
        } catch (error) {
            console.error("Failed to get Gmail auth URL:", error);
            alert("Failed to connect Gmail. Please try again.");
        }
    };

    return { handleConnectGmail };
}
