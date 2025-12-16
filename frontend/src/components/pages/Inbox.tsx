import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { SearchResults } from "./inbox/SearchResults";

export default function Inbox() {
  const [selectedMailboxId, setSelectedMailboxId] = useState("INBOX");
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);

  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  // Kanban Filter/Sort State
  const [kanbanSortOrder, setKanbanSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterHasAttachment, setFilterHasAttachment] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  const {
    data: searchResults,
    isLoading: searchLoading,
    isError: searchError,
  } = useQuery({
    queryKey: ["gmailSearch", debouncedQuery],
    queryFn: () => gmailApi.searchGmailEmails(debouncedQuery),
    enabled: searchActive && debouncedQuery.trim().length > 0,
  });

  // Map search results to Email format
  const searchEmails: Email[] = searchResults
    ? searchResults.emails.map(gmailApi.mapGmailEmailToEmail)
    : [];

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

  // Filter and Sort emails for Kanban
  const processedEmails = useMemo(() => {
    let result = [...emails];

    if (viewMode === 'kanban') {
      if (filterUnread) {
        result = result.filter(e => !e.isRead);
      }
      if (filterHasAttachment) {
        result = result.filter(e => e.hasAttachments);
      }

      result.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();
        return kanbanSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
    }
    return result;
  }, [emails, viewMode, filterUnread, filterHasAttachment, kanbanSortOrder]);

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

  // Handle search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length > 0) {
      setSearchActive(true);
      setViewMode('list'); // Switch to list view for search results
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchActive(false);
    setDebouncedQuery("");
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
            {!searchActive && (
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
            )}
            {viewMode === 'kanban' && !searchActive && (
              <div className="hidden md:flex items-center gap-2 mr-2 border-l border-gray-300 pl-4 transition-all duration-300 ease-in-out">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 border border-gray-200 hover:border-blue-300 transition-colors">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort:</span>
                  <select
                    value={kanbanSortOrder}
                    onChange={(e) => setKanbanSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-1"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterUnread(!filterUnread)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 ${filterUnread
                      ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${filterUnread ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                    Unread
                  </button>
                  <button
                    onClick={() => setFilterHasAttachment(!filterHasAttachment)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 ${filterHasAttachment
                      ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                  >
                    <span>📎</span>
                    Attachments
                  </button>
                </div>
              </div>
            )}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 lg:flex-initial">
              <input
                type="text"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full lg:w-64 px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
      <div className="h-[calc(100vh-8rem)] flex overflow-hidden bg-gray-50">
        {/* Show Search Results when search is active */}
        {searchActive ? (
          <>
            <SearchResults
              query={debouncedQuery}
              results={searchEmails}
              totalResults={searchResults?.totalResults}
              isLoading={searchLoading}
              isError={searchError}
              onEmailClick={handleEmailClick}
              onClose={handleClearSearch}
            />
            {/* Column 3: Email Detail for search results */}
            {(!isMobileView || mobileView === "detail") && (
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
          </>
        ) : (
          <>
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
                    emails={processedEmails}
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
          </>
        )}

        {/* Column 3: Email Detail (Only show in List mode or if Mobile detail view, and when not searching) */}
        {!searchActive && (!isMobileView || mobileView === "detail") && viewMode === 'list' && (
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
