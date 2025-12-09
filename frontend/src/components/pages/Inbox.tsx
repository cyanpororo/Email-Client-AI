import { useState, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as gmailApi from "../../api/gmail";
import { Button } from "../ui/button";
import { OfflineIndicator, useOnlineStatus } from "../OfflineIndicator";
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

// Import extracted components
import type { Email, ComposeMode, MobileView } from "./inbox/types";
import { GmailConnectionPrompt } from "./inbox/GmailConnectionPrompt";
import { MailboxSidebar } from "./inbox/MailboxSidebar";
import { EmailListView } from "./inbox/EmailListView";
import { EmailDetail } from "./inbox/EmailDetail";
import { ComposeModal } from "./inbox/ComposeModal";
import { KanbanBoard } from "./inbox/KanbanBoard";

export default function Inbox() {
  const [selectedMailboxId, setSelectedMailboxId] = useState("INBOX");
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  // Compose form state
  const [composeMode, setComposeMode] = useState<ComposeMode>("new");
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
          `Failed to send email: ${error.response.data.message || "Unknown error"
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
      <GmailConnectionPrompt
        isOnline={isOnline}
        onConnect={handleConnectGmail}
      />
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
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200 mr-2">
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
            </div>
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
        {(!isMobileView || mobileView === "folders") && viewMode !== 'kanban' && (
          <MailboxSidebar
            standardMailboxes={standardMailboxes}
            customMailboxes={customMailboxes}
            selectedMailboxId={selectedMailboxId}
            onMailboxClick={handleMailboxClick}
            onCompose={handleNewCompose}
          />
        )}

        {/* Column 2: Email List */}
        {/* Column 2: Email List OR Kanban */}
        {(!isMobileView || mobileView === "list") && (
          viewMode === 'kanban' ? (
            <div className="flex-1 h-full overflow-hidden">
              <KanbanBoard
                emails={emails}
                currentMailboxId={selectedMailboxId}
                onEmailClick={(email) => {
                  setSelectedEmailId(email.id);
                  if (isMobileView) {
                    setMobileView("detail");
                  } else {
                    // On desktop, user might want to see detail. 
                    // Since Kanban replaces the list view, we can either switch back to List view
                    // or maybe we can keep Detail view visible if we modify layout logic?
                    // For now, let's switch to List view to show detail as requested "navigate to... detailed view from Week 1"
                    setViewMode('list');
                  }
                }}
              />
            </div>
          ) : (
            <EmailListView
              emails={emails}
              selectedEmailId={selectedEmailId}
              selectedEmails={selectedEmails}
              selectedMailboxId={selectedMailboxId}
              isLoading={emailsLoading}
              isError={emailsError}
              isFetching={emailsFetching}
              isFromCache={emailsFromCache}
              isStale={emailsStale}
              isOnline={isOnline}
              isSyncing={isSyncing}
              lastSyncTime={lastSyncTime}
              onEmailClick={handleEmailClick}
              onToggleSelection={toggleEmailSelection}
              onSelectAll={selectAllEmails}
              onToggleStar={(emailId, starred) =>
                toggleStarMutation.mutate({ emailId, starred })
              }
              onSync={sync}
              onMarkAsRead={() => markSelectedAsReadMutation.mutate()}
              onDelete={() => deleteSelectedMutation.mutate()}
              isMarkingAsRead={markSelectedAsReadMutation.isPending}
              isDeleting={deleteSelectedMutation.isPending}
            />
          )
        )}

        {/* Column 3: Email Detail (Only show in List mode or if Mobile detail view) */}
        {(!isMobileView || mobileView === "detail") && viewMode === 'list' && (
          <EmailDetail
            email={selectedEmail}
            customMailboxes={customMailboxes}
            showMoveMenu={showMoveMenu}
            moveEmailId={moveEmailId}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            onDelete={handleDeleteEmail}
            onToggleStar={(emailId, starred) =>
              toggleStarMutation.mutate({ emailId, starred })
            }
            onToggleRead={(emailId, isRead) =>
              isRead
                ? markAsUnreadMutation.mutate(emailId)
                : markAsReadMutation.mutate(emailId)
            }
            onMoveToFolder={(emailId, labelId) =>
              moveToFolderMutation.mutate({ emailId, labelId })
            }
            onShowMoveMenu={(show, emailId) => {
              setShowMoveMenu(show);
              setMoveEmailId(emailId);
            }}
            isDeleting={deleteEmailMutation.isPending}
            isMoving={moveToFolderMutation.isPending}
          />
        )}

        {/* Compose Modal */}
        {showCompose && (
          <ComposeModal
            composeTo={composeTo}
            composeCc={composeCc}
            composeSubject={composeSubject}
            composeBody={composeBody}
            isSending={sendEmailMutation.isPending}
            onClose={() => {
              setShowCompose(false);
              resetComposeForm();
            }}
            onToChange={setComposeTo}
            onCcChange={setComposeCc}
            onSubjectChange={setComposeSubject}
            onBodyChange={setComposeBody}
            onSubmit={handleComposeSubmit}
          />
        )}
      </div>
    </>
  );
}
