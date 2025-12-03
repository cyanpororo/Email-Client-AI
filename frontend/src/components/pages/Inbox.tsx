import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as gmailApi from "../../api/gmail";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { OfflineIndicator, useOnlineStatus } from "../OfflineIndicator";
import { EmailFrame } from "../EmailFrame";
import {
  useGmailLabels,
  useGmailEmails,
  useGmailEmailDetail,
  useMarkAsReadMutation,
  useMarkAsUnreadMutation,
  useToggleStarMutation,
  useDeleteEmailMutation,
  useEmailSync,
} from "../../hooks/useOfflineEmails";

// Type for mapped email (UI-compatible format)
type Email = {
  id: string;
  mailboxId: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc?: Array<{ name: string; email: string }>;
  subject: string;
  preview: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  attachments?: Array<{ id: string; name: string; size: number; type: string }>;
};

export default function Inbox() {
  const [selectedMailboxId, setSelectedMailboxId] = useState("INBOX");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileView, setMobileView] = useState<"folders" | "list" | "detail">(
    "list"
  );

  // Compose form state
  const [composeMode, setComposeMode] = useState<"new" | "reply" | "forward">(
    "new"
  );
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [replyToEmailId, setReplyToEmailId] = useState<string | null>(null);

  // Move to folder menu state
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moveEmailId, setMoveEmailId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { isSyncing, lastSyncTime, sync } = useEmailSync();

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch Gmail labels (mailboxes) using offline-first hook
  const {
    labels: gmailLabels,
    isLoading: labelsLoading,
    isError: labelsError,
    isFromCache: labelsFromCache,
  } = useGmailLabels();

  // Map labels to mailbox format
  const mailboxes = gmailLabels.map(gmailApi.mapLabelToMailbox);

  // Separate standard folders from custom folders
  const standardFolderIds = ["INBOX", "STARRED", "SENT", "DRAFT", "TRASH"];
  const standardMailboxes = mailboxes.filter((m) =>
    standardFolderIds.includes(m.id)
  );
  const customMailboxes = mailboxes.filter(
    (m) => !standardFolderIds.includes(m.id)
  );

  // Check if Gmail is connected
  const isGmailConnected = gmailLabels.length > 0 && !labelsError;

  // Show loading while checking Gmail connection (only on initial load, not refetch)
  const isCheckingConnection = labelsLoading && gmailLabels.length === 0;

  // Fetch emails for selected mailbox using offline-first hook
  const {
    emails: gmailEmailsRaw,
    isLoading: emailsLoading,
    isFetching: emailsFetching,
    isError: emailsError,
    isFromCache: emailsFromCache,
    isStale: emailsStale,
  } = useGmailEmails(selectedMailboxId, 50, isGmailConnected);

  // Map Gmail emails to UI format
  const emails: Email[] = (gmailEmailsRaw || []).map(
    gmailApi.mapGmailEmailToEmail
  );

  // Fetch selected email details using offline-first hook
  const { email: selectedGmailEmail } = useGmailEmailDetail(
    selectedEmailId,
    isGmailConnected
  );

  const selectedEmail = selectedGmailEmail
    ? gmailApi.mapGmailEmailToEmail(selectedGmailEmail)
    : null;

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
    [deleteEmailMutation]
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
          `Failed to send email: ${
            error.response.data.message || "Unknown error"
          }`
        );
      } else {
        alert("Failed to send email. Please try again.");
      }
    },
  });

  // Helper: Reset compose form
  const resetComposeForm = () => {
    setComposeMode("new");
    setComposeTo("");
    setComposeCc("");
    setComposeSubject("");
    setComposeBody("");
    setReplyToEmailId(null);
  };

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
      .filter((t) => t.email !== email.from.email)
      .map((t) => t.email);
    if (email.cc) {
      ccEmails.push(...email.cc.map((c) => c.email));
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

  // Handle email selection
  const handleEmailClick = useCallback(
    (email: Email) => {
      setSelectedEmailId(email.id);
      if (!email.isRead) {
        markAsReadMutation.mutate(email.id);
      }
      if (isMobileView) {
        setMobileView("detail");
      }
    },
    [isMobileView, markAsReadMutation]
  );

  // Handle mailbox selection
  const handleMailboxClick = useCallback(
    (mailboxId: string) => {
      setSelectedMailboxId(mailboxId);
      setSelectedEmailId(null);
      setSelectedEmails(new Set());
      if (isMobileView) {
        setMobileView("list");
      }
    },
    [isMobileView]
  );

  // Handle Gmail connection
  const handleConnectGmail = async () => {
    try {
      const authUrl = await gmailApi.getGmailAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Failed to get Gmail auth URL:", error);
      alert("Failed to connect Gmail. Please try again.");
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailStatus = params.get("gmail");
    const errorMessage = params.get("message");

    if (gmailStatus === "connected") {
      // Gmail connected successfully, refresh the page to load emails
      alert("Gmail connected successfully!");
      // Remove query params and refresh
      window.history.replaceState({}, "", "/inbox");
      queryClient.invalidateQueries({ queryKey: ["gmailLabels"] });
    } else if (gmailStatus === "error") {
      alert(`Failed to connect Gmail: ${errorMessage || "Unknown error"}`);
      // Remove query params
      window.history.replaceState({}, "", "/inbox");
    }
  }, [queryClient]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  ]);

  // Close move menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMoveMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest(".move-menu-container")) {
          setShowMoveMenu(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMoveMenu]);

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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // Format relative time for last sync
  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutes < 1) return "just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Show loading while checking Gmail connection
  if (isCheckingConnection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Checking Gmail connection...</p>
        </div>
      </div>
    );
  }

  // Show Gmail connection prompt if not connected (only when online and no cached data)
  if (!isGmailConnected && labelsError && !labelsFromCache) {
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
              onClick={handleConnectGmail}
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

  return (
    <>
      <OfflineIndicator />
      {/* Inbox Header */}
      <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between">
          {isMobileView && mobileView !== "list" ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={() => {
                  if (mobileView === "detail") {
                    setMobileView("list");
                  } else if (mobileView === "folders") {
                    setMobileView("list");
                  }
                }}
                aria-label="Back"
                className="p-1.5 h-8"
              >
                ← Back
              </Button>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                {mobileView === "detail" && selectedEmail
                  ? "Email"
                  : mobileView === "folders"
                  ? "Folders"
                  : "Inbox"}
              </h1>
            </div>
          ) : (
            <>
              {isMobileView && (
                <Button
                  variant="ghost"
                  onClick={() => setMobileView("folders")}
                  aria-label="Show folders"
                  className="p-1.5 h-8 mr-1"
                >
                  ☰
                </Button>
              )}
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                Gmail Inbox
              </h1>
            </>
          )}
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <input
                type="text"
                placeholder="Search emails..."
                className="w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-[calc(100vh-8rem)] flex overflow-hidden bg-gray-50">
        {/* Column 1: Mailboxes/Folders */}
        {(!isMobileView || mobileView === "folders") && (
          <div className="w-full lg:w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-3 md:p-4 border-b border-gray-200">
              <Button
                onClick={handleNewCompose}
                className="w-full text-sm md:text-base"
                aria-label="Compose new email"
              >
                ✏️ Compose
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <nav
                className="p-2"
                role="navigation"
                aria-label="Mailbox folders"
              >
                {/* Standard folders */}
                {standardMailboxes.map((mailbox) => (
                  <button
                    key={mailbox.id}
                    onClick={() => handleMailboxClick(mailbox.id)}
                    className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg mb-1 transition-colors text-sm md:text-base ${
                      selectedMailboxId === mailbox.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                    aria-current={
                      selectedMailboxId === mailbox.id ? "page" : undefined
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true">{mailbox.icon}</span>
                        <span>{mailbox.name}</span>
                      </span>
                      {mailbox.unreadCount > 0 && (
                        <span
                          className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
                          aria-label={`${mailbox.unreadCount} unread emails`}
                        >
                          {mailbox.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}

                {/* Divider between standard and custom folders */}
                {customMailboxes.length > 0 && (
                  <div className="border-t border-gray-200 my-2 mx-2"></div>
                )}

                {/* Custom folders */}
                {customMailboxes.map((mailbox) => (
                  <button
                    key={mailbox.id}
                    onClick={() => handleMailboxClick(mailbox.id)}
                    className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg mb-1 transition-colors text-sm md:text-base ${
                      selectedMailboxId === mailbox.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                    aria-current={
                      selectedMailboxId === mailbox.id ? "page" : undefined
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span aria-hidden="true">{mailbox.icon}</span>
                        <span>{mailbox.name}</span>
                      </span>
                      {mailbox.unreadCount > 0 && (
                        <span
                          className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
                          aria-label={`${mailbox.unreadCount} unread emails`}
                        >
                          {mailbox.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </nav>
            </div>

            <div className="hidden lg:block p-4 border-t border-gray-200 text-xs text-gray-500">
              <p>Keyboard shortcuts:</p>
              <ul className="mt-2 space-y-1">
                <li>↑/k: Previous email</li>
                <li>↓/j: Next email</li>
                <li>c: Compose</li>
                <li>r: Reply</li>
                <li>s: Star</li>
              </ul>
            </div>
          </div>
        )}

        {/* Column 2: Email List */}
        {(!isMobileView || mobileView === "list") && (
          <div className="w-full lg:w-2/5 bg-white border-r border-gray-200 flex flex-col">
            {/* Action bar */}
            <div className="p-2 md:p-4 border-b border-gray-200 flex items-center gap-1.5 md:gap-2 flex-wrap">
              <input
                type="checkbox"
                checked={
                  selectedEmails.size === emails.length && emails.length > 0
                }
                onChange={selectAllEmails}
                className="rounded"
                aria-label="Select all emails"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sync()}
                aria-label="Sync emails"
                disabled={!isOnline || isSyncing}
                className={`h-7 md:h-8 px-2 ${isSyncing ? "animate-spin" : ""}`}
              >
                🔄
              </Button>
              {isSyncing && (
                <span className="text-xs text-blue-600 animate-pulse hidden md:inline">
                  Syncing...
                </span>
              )}
              {emailsFetching && !isSyncing && (
                <span className="text-xs text-blue-600 animate-pulse hidden md:inline">
                  Updating...
                </span>
              )}
              {/* Cache status indicators */}
              {emailsFromCache && (
                <span
                  className="text-xs text-amber-600"
                  title={
                    emailsStale
                      ? "Cached data may be outdated"
                      : "Using cached data"
                  }
                >
                  📦{" "}
                  <span className="hidden sm:inline">
                    {emailsStale ? "Stale Cache" : "Cached"}
                  </span>
                </span>
              )}
              {!isOnline && emails.length > 0 && (
                <span className="text-xs text-gray-500 hidden md:inline">
                  • Offline Mode
                </span>
              )}
              {lastSyncTime && (
                <span
                  className="text-xs text-gray-400 hidden lg:inline"
                  title={`Last synced: ${new Date(
                    lastSyncTime
                  ).toLocaleString()}`}
                >
                  • Synced {formatRelativeTime(lastSyncTime)}
                </span>
              )}
              {selectedEmails.size > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markSelectedAsReadMutation.mutate()}
                    disabled={markSelectedAsReadMutation.isPending}
                    className="h-7 md:h-8 px-2 text-xs md:text-sm"
                  >
                    ✓ <span className="hidden sm:inline">Mark Read</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSelectedMutation.mutate()}
                    disabled={deleteSelectedMutation.isPending}
                    className="h-7 md:h-8 px-2 text-xs md:text-sm"
                  >
                    🗑️ <span className="hidden sm:inline">Delete</span>
                  </Button>
                  <span className="text-xs md:text-sm text-gray-600">
                    {selectedEmails.size}{" "}
                    <span className="hidden sm:inline">selected</span>
                  </span>
                </>
              )}
            </div>

            {/* Email list */}
            <div
              className="flex-1 overflow-y-auto"
              role="list"
              aria-label="Email list"
            >
              {emailsLoading ? (
                <div className="p-8 text-center text-gray-500">
                  Loading emails...
                </div>
              ) : emailsError ? (
                <div className="p-8 text-center text-red-500">
                  <div className="text-4xl mb-2">⚠️</div>
                  <p>Failed to load emails</p>
                  <Button
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: ["gmailEmails", selectedMailboxId],
                      })
                    }
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              ) : emails.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p>No emails in this folder</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div
                    key={email.id}
                    role="listitem"
                    className={`border-b border-gray-100 p-2.5 md:p-4 cursor-pointer transition-colors ${
                      selectedEmailId === email.id
                        ? "bg-blue-50 border-l-4 border-l-blue-600"
                        : "hover:bg-gray-50"
                    } ${!email.isRead ? "bg-blue-50/30" : ""}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="flex items-start gap-2 md:gap-3">
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(email.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleEmailSelection(email.id);
                        }}
                        className="mt-1 rounded"
                        aria-label={`Select email: ${email.subject}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStarMutation.mutate({
                            emailId: email.id,
                            starred: !email.isStarred,
                          });
                        }}
                        className="mt-1 text-lg"
                        aria-label={
                          email.isStarred ? "Unstar email" : "Star email"
                        }
                      >
                        {email.isStarred ? "⭐" : "☆"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5 md:mb-1">
                          <span
                            className={`text-sm md:text-base font-medium truncate ${
                              !email.isRead ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {email.from.name || email.from.email}
                          </span>
                          <span className="text-[10px] md:text-xs text-gray-500 ml-1 md:ml-2 flex-shrink-0">
                            {formatTimestamp(email.timestamp)}
                          </span>
                        </div>
                        <div
                          className={`text-xs md:text-sm truncate mb-0.5 md:mb-1 ${
                            !email.isRead
                              ? "font-semibold text-gray-900"
                              : "text-gray-600"
                          }`}
                        >
                          {email.subject}
                        </div>
                        <div className="text-xs md:text-sm text-gray-500 truncate">
                          {email.preview}
                        </div>
                        {email.hasAttachments && (
                          <div className="text-[10px] md:text-xs text-gray-400 mt-0.5 md:mt-1">
                            📎{" "}
                            <span className="hidden sm:inline">
                              Has attachments
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Column 3: Email Detail */}
        {(!isMobileView || mobileView === "detail") && (
          <div className="flex-1 bg-white flex flex-col">
            {!selectedEmail ? (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">📧</div>
                  <p className="text-lg">Select an email to view details</p>
                  <p className="text-sm mt-2">Use ↑/↓ or j/k to navigate</p>
                </div>
              </div>
            ) : (
              <>
                {/* Email header */}
                <div className="border-b border-gray-200 p-3 md:p-6">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex-1 pr-2">
                      {selectedEmail.subject}
                    </h1>
                    <button
                      onClick={() =>
                        toggleStarMutation.mutate({
                          emailId: selectedEmail.id,
                          starred: !selectedEmail.isStarred,
                        })
                      }
                      className="text-2xl ml-4"
                      aria-label={
                        selectedEmail.isStarred ? "Unstar email" : "Star email"
                      }
                    >
                      {selectedEmail.isStarred ? "⭐" : "☆"}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">From:</span>
                      <span className="text-gray-900">
                        {selectedEmail.from.name} &lt;{selectedEmail.from.email}
                        &gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">To:</span>
                      <span className="text-gray-900">
                        {selectedEmail.to
                          .map((t) => `${t.name} <${t.email}>`)
                          .join(", ")}
                      </span>
                    </div>
                    {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Cc:</span>
                        <span className="text-gray-900">
                          {selectedEmail.cc
                            .map((c) => `${c.name} <${c.email}>`)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Date:</span>
                      <span className="text-gray-900">
                        {new Date(selectedEmail.timestamp).toLocaleString(
                          "en-US",
                          {
                            dateStyle: "full",
                            timeStyle: "short",
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3 md:mt-4">
                    <Button
                      onClick={() => handleReply(selectedEmail)}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      Reply
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleReplyAll(selectedEmail)}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      Reply All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleForward(selectedEmail)}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      Forward
                    </Button>

                    {/* Move to Folder dropdown */}
                    {customMailboxes.length > 0 && (
                      <div className="relative move-menu-container">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setMoveEmailId(selectedEmail.id);
                            setShowMoveMenu(!showMoveMenu);
                          }}
                          className="text-xs md:text-sm h-8 md:h-9"
                        >
                          📁 Move to...
                        </Button>

                        {showMoveMenu && moveEmailId === selectedEmail.id && (
                          <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                            <div className="py-1 max-h-64 overflow-y-auto">
                              {customMailboxes.map((mailbox) => (
                                <button
                                  key={mailbox.id}
                                  onClick={() => {
                                    moveToFolderMutation.mutate({
                                      emailId: selectedEmail.id,
                                      labelId: mailbox.id,
                                    });
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
                                  disabled={moveToFolderMutation.isPending}
                                >
                                  <span>{mailbox.icon}</span>
                                  <span>{mailbox.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => handleDeleteEmail(selectedEmail.id)}
                      disabled={deleteEmailMutation.isPending}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        selectedEmail.isRead
                          ? markAsUnreadMutation.mutate(selectedEmail.id)
                          : markAsReadMutation.mutate(selectedEmail.id)
                      }
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      Mark as {selectedEmail.isRead ? "Unread" : "Read"}
                    </Button>
                  </div>
                </div>

                {/* Email body */}
                <div className="flex-1 overflow-y-auto p-3 md:p-6">
                  <EmailFrame content={selectedEmail.body} />

                  {/* Attachments */}
                  {selectedEmail.attachments &&
                    selectedEmail.attachments.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-3">
                          Attachments ({selectedEmail.attachments.length})
                        </h3>
                        <div className="space-y-2">
                          {selectedEmail.attachments.map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <span className="text-2xl">📎</span>
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-900">
                                  {attachment.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {gmailApi.formatFileSize(attachment.size)}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  gmailApi.downloadGmailAttachment(
                                    selectedEmail.id,
                                    attachment.id,
                                    attachment.name
                                  )
                                }
                              >
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Compose Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4">
            <Card className="w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-auto">
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <h2 className="text-lg md:text-xl font-bold">New Message</h2>
                  <button
                    onClick={() => setShowCompose(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl"
                    aria-label="Close compose window"
                  >
                    ✕
                  </button>
                </div>

                <form
                  className="space-y-3 md:space-y-4"
                  onSubmit={(e) => {
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
                  }}
                >
                  <div>
                    <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                      To:
                    </label>
                    <input
                      type="text"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
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
                      onChange={(e) => setComposeCc(e.target.value)}
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
                      onChange={(e) => setComposeSubject(e.target.value)}
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
                      onChange={(e) => setComposeBody(e.target.value)}
                      className="w-full px-3 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Write your message..."
                      required
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCompose(false);
                        resetComposeForm();
                      }}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={sendEmailMutation.isPending}
                      className="text-xs md:text-sm h-8 md:h-9"
                    >
                      {sendEmailMutation.isPending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
