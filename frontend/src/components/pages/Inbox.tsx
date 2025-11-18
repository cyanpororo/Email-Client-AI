import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as emailApi from "../../api/email";
import type { Email } from "../../api/email";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { OfflineIndicator, useOnlineStatus } from "../OfflineIndicator";

export default function Inbox() {
  const [selectedMailboxId, setSelectedMailboxId] = useState("inbox");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showCompose, setShowCompose] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  // Responsive handling
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch mailboxes with offline-first strategy
  const { data: mailboxes = [] } = useQuery({
    queryKey: ["mailboxes"],
    queryFn: emailApi.getMailboxes,
    staleTime: 10 * 60 * 1000, // Mailboxes stay fresh for 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Fetch emails for selected mailbox with stale-while-revalidate
  const {
    data: emails = [],
    isLoading: emailsLoading,
    isFetching: emailsFetching,
  } = useQuery({
    queryKey: ["emails", selectedMailboxId],
    queryFn: () => emailApi.getEmailsByMailbox(selectedMailboxId),
    staleTime: 3 * 60 * 1000, // Emails stay fresh for 3 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnMount: false, // Use cached data first
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Fetch selected email details with aggressive caching
  const { data: selectedEmail } = useQuery({
    queryKey: ["email", selectedEmailId],
    queryFn: () =>
      selectedEmailId ? emailApi.getEmailById(selectedEmailId) : null,
    enabled: !!selectedEmailId,
    staleTime: 5 * 60 * 1000, // Email content stays fresh for 5 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: emailApi.markEmailAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["emails", selectedMailboxId],
      });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

  // Mark as unread mutation
  const markAsUnreadMutation = useMutation({
    mutationFn: emailApi.markEmailAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["emails", selectedMailboxId],
      });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

  // Toggle star mutation
  const toggleStarMutation = useMutation({
    mutationFn: emailApi.toggleEmailStar,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["emails", selectedMailboxId],
      });
      queryClient.invalidateQueries({ queryKey: ["email", selectedEmailId] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: emailApi.deleteEmail,
    onSuccess: () => {
      setSelectedEmailId(null);
      queryClient.invalidateQueries({
        queryKey: ["emails", selectedMailboxId],
      });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

  // Bulk operations
  const markSelectedAsReadMutation = useMutation({
    mutationFn: () => emailApi.markMultipleAsRead(Array.from(selectedEmails)),
    onSuccess: () => {
      setSelectedEmails(new Set());
      queryClient.invalidateQueries({
        queryKey: ["emails", selectedMailboxId],
      });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: () => emailApi.deleteMultiple(Array.from(selectedEmails)),
    onSuccess: () => {
      setSelectedEmails(new Set());
      setSelectedEmailId(null);
      queryClient.invalidateQueries({
        queryKey: ["emails", selectedMailboxId],
      });
      queryClient.invalidateQueries({ queryKey: ["mailboxes"] });
    },
  });

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
            console.log("Reply to:", selectedEmail.subject);
          }
          break;
        case "s":
          if (selectedEmailId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleStarMutation.mutate(selectedEmailId);
          }
          break;
        case "Delete":
          if (selectedEmailId && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            deleteMutation.mutate(selectedEmailId);
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
    deleteMutation,
  ]);

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

  return (
    <>
      <OfflineIndicator />
      {/* Inbox Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
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
        {(!isMobileView || mobileView === "list") && (
          <div className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <Button
                onClick={() => setShowCompose(true)}
                className="w-full"
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
                {mailboxes.map((mailbox) => (
                  <button
                    key={mailbox.id}
                    onClick={() => handleMailboxClick(mailbox.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
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

            <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
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
          <div className="w-full md:w-2/5 bg-white border-r border-gray-200 flex flex-col">
            {/* Action bar */}
            <div className="p-4 border-b border-gray-200 flex items-center gap-2 flex-wrap">
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
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["emails", selectedMailboxId],
                  })
                }
                aria-label="Refresh email list"
                className={emailsFetching ? "animate-spin" : ""}
              >
                🔄
              </Button>
              {emailsFetching && (
                <span className="text-xs text-blue-600 animate-pulse">
                  Syncing...
                </span>
              )}
              {!isOnline && emails.length > 0 && (
                <span className="text-xs text-amber-600">📦 Cached</span>
              )}
              {selectedEmails.size > 0 && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markSelectedAsReadMutation.mutate()}
                    disabled={markSelectedAsReadMutation.isPending}
                  >
                    ✓ Mark Read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteSelectedMutation.mutate()}
                    disabled={deleteSelectedMutation.isPending}
                  >
                    🗑️ Delete
                  </Button>
                  <span className="text-sm text-gray-600">
                    {selectedEmails.size} selected
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
                    className={`border-b border-gray-100 p-4 cursor-pointer transition-colors ${
                      selectedEmailId === email.id
                        ? "bg-blue-50 border-l-4 border-l-blue-600"
                        : "hover:bg-gray-50"
                    } ${!email.isRead ? "bg-blue-50/30" : ""}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="flex items-start gap-3">
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
                          toggleStarMutation.mutate(email.id);
                        }}
                        className="mt-1 text-lg"
                        aria-label={
                          email.isStarred ? "Unstar email" : "Star email"
                        }
                      >
                        {email.isStarred ? "⭐" : "☆"}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`font-medium truncate ${
                              !email.isRead ? "text-gray-900" : "text-gray-700"
                            }`}
                          >
                            {email.from.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {formatTimestamp(email.timestamp)}
                          </span>
                        </div>
                        <div
                          className={`text-sm truncate mb-1 ${
                            !email.isRead
                              ? "font-semibold text-gray-900"
                              : "text-gray-600"
                          }`}
                        >
                          {email.subject}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {email.preview}
                        </div>
                        {email.hasAttachments && (
                          <div className="text-xs text-gray-400 mt-1">
                            📎 Has attachments
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
            {isMobileView && mobileView === "detail" && (
              <div className="p-4 border-b border-gray-200">
                <Button
                  variant="ghost"
                  onClick={() => setMobileView("list")}
                  aria-label="Back to email list"
                >
                  ← Back
                </Button>
              </div>
            )}

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
                <div className="border-b border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h1 className="text-2xl font-bold text-gray-900 flex-1">
                      {selectedEmail.subject}
                    </h1>
                    <button
                      onClick={() =>
                        toggleStarMutation.mutate(selectedEmail.id)
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
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => console.log("Reply")}>Reply</Button>
                    <Button
                      variant="outline"
                      onClick={() => console.log("Reply All")}
                    >
                      Reply All
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => console.log("Forward")}
                    >
                      Forward
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => deleteMutation.mutate(selectedEmail.id)}
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
                    >
                      Mark as {selectedEmail.isRead ? "Unread" : "Read"}
                    </Button>
                  </div>
                </div>

                {/* Email body */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                  />

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
                                  {emailApi.formatFileSize(attachment.size)}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  console.log("Download:", attachment.name)
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">New Message</h2>
                  <button
                    onClick={() => setShowCompose(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Close compose window"
                  >
                    ✕
                  </button>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log("Send email");
                    setShowCompose(false);
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To:
                    </label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="recipient@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject:
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Email subject"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message:
                    </label>
                    <textarea
                      rows={10}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Write your message..."
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCompose(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Send</Button>
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
