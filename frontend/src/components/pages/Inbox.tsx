import { useMemo, useState, useEffect } from "react";
import * as gmailApi from "../../api/gmail";
import { OfflineIndicator, useOnlineStatus } from "../OfflineIndicator";
import {
  useGmailLabels,
  useGmailEmails,
  useGmailEmailDetail,
  useEmailSync,
} from "../../hooks/useOfflineEmails";

// Import extracted components
import type { Email } from "./inbox/types";
import { GmailConnectionPrompt } from "./inbox/GmailConnectionPrompt";
import { MailboxSidebar } from "./inbox/MailboxSidebar";
import { EmailListView } from "./inbox/EmailListView";
import { EmailDetail } from "./inbox/EmailDetail";
import { ComposeModal } from "./inbox/ComposeModal";
import { KanbanBoard } from "./inbox/KanbanBoard";
import { SearchResults } from "./inbox/SearchResults";
import { InboxHeader } from "./inbox/InboxHeader";

// Import custom hooks
import { useInboxNavigation } from "../../hooks/useInboxNavigation";
import { useInboxSearch } from "../../hooks/useInboxSearch";
import { useEmailSelection } from "../../hooks/useEmailSelection";
import { useComposeFlow } from "../../hooks/useComposeFlow";
import { useEmailOperations } from "../../hooks/useEmailOperations";
import { useInboxShortcuts } from "../../hooks/useInboxShortcuts";
import { useGmailAuth } from "../../hooks/useGmailAuth";

/* ... */

export default function Inbox() {
  // 1. Hooks initialization and State Management
  const nav = useInboxNavigation();
  const [pageHistory, setPageHistory] = useState<(string | undefined)[]>([undefined]);

  // Reset pagination when mailbox changes
  useEffect(() => {
    setPageHistory([undefined]);
  }, [nav.selectedMailboxId]);

  const currentPageToken = pageHistory[pageHistory.length - 1];

  const search = useInboxSearch(nav.setViewMode);
  const compose = useComposeFlow();
  const gmailAuth = useGmailAuth();
  const isOnline = useOnlineStatus();
  const { isSyncing, lastSyncTime, sync } = useEmailSync();

  // 2. Data Fetching
  // Fetch Gmail labels (mailboxes)
  const {
    labels: gmailLabels,
    isLoading: labelsLoading,
    isError: labelsError,
    isFromCache: labelsFromCache,
  } = useGmailLabels();

  // Check if Gmail is connected
  const isGmailConnected = gmailLabels.length > 0 && !labelsError;
  const isCheckingConnection = labelsLoading && gmailLabels.length === 0;

  // Map labels to mailbox format
  const mailboxes = gmailLabels.map(gmailApi.mapLabelToMailbox);
  const standardFolderIds = ["INBOX", "STARRED", "SENT", "DRAFT", "TRASH"];
  const standardMailboxes = mailboxes.filter((m) =>
    standardFolderIds.includes(m.id)
  );
  const customMailboxes = mailboxes.filter(
    (m) => !standardFolderIds.includes(m.id)
  );

  // Fetch emails for selected mailbox
  const {
    emails: gmailEmailsRaw,
    nextPageToken,
    isLoading: emailsLoading,
    isFetching: emailsFetching,
    isError: emailsError,
    isFromCache: emailsFromCache,
    isStale: emailsStale,
  } = useGmailEmails(nav.selectedMailboxId, 50, currentPageToken, isGmailConnected);

  // Map Gmail emails to UI format
  const emails: Email[] = (gmailEmailsRaw || []).map(
    gmailApi.mapGmailEmailToEmail
  );

  // 3. Dependent Hooks (Selection & Operations)
  // Needs access to emails and navigation state
  const selection = useEmailSelection(emails, nav.isMobileView, nav.setMobileView);

  // Needs access to selection state
  const ops = useEmailOperations({
    selectedMailboxId: nav.selectedMailboxId,
    selectedEmails: selection.selectedEmails,
    setSelectedEmails: selection.setSelectedEmails,
    setSelectedEmailId: selection.setSelectedEmailId,
  });

  // Fetch selected email details
  const { email: selectedGmailEmail } = useGmailEmailDetail(
    selection.selectedEmailId,
    isGmailConnected
  );

  const selectedEmail = selectedGmailEmail
    ? gmailApi.mapGmailEmailToEmail(selectedGmailEmail)
    : null;

  // 4. Derived Data (Filter/Sort for both Kanban and List views)
  const processedEmails = useMemo(() => {
    let result = [...emails];

    if (nav.filterUnread) {
      result = result.filter(e => !e.isRead);
    }
    if (nav.filterHasAttachment) {
      result = result.filter(e => e.hasAttachments);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0).getTime();
      const dateB = new Date(b.timestamp || 0).getTime();
      return nav.kanbanSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [emails, nav.filterUnread, nav.filterHasAttachment, nav.kanbanSortOrder]);

  // 5. Shortcuts
  useInboxShortcuts({
    emails,
    selectedEmailId: selection.selectedEmailId,
    selectedEmail,
    handleEmailClick: (email) => selection.handleEmailClick(email, ops.markAsReadMutation.mutate),
    toggleStarMutation: ops.toggleStarMutation,
    handleDeleteEmail: ops.handleDeleteEmail,
    handleReply: compose.handleReply,
    setShowCompose: compose.setShowCompose,
  });

  // 6. Loading States
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

  // Show Gmail connection prompt if not connected
  if (!isGmailConnected && labelsError && !labelsFromCache) {
    return (
      <GmailConnectionPrompt
        isOnline={isOnline}
        onConnect={gmailAuth.handleConnectGmail}
      />
    );
  }

  return (
    <>
      <OfflineIndicator />

      <InboxHeader
        isMobileView={nav.isMobileView}
        mobileView={nav.mobileView}
        setMobileView={nav.setMobileView}
        selectedEmail={selectedEmail}
        viewMode={nav.viewMode}
        setViewMode={nav.setViewMode}
        kanbanSortOrder={nav.kanbanSortOrder}
        setKanbanSortOrder={nav.setKanbanSortOrder}
        filterUnread={nav.filterUnread}
        setFilterUnread={nav.setFilterUnread}
        filterHasAttachment={nav.filterHasAttachment}
        setFilterHasAttachment={nav.setFilterHasAttachment}
        searchQuery={search.searchQuery}
        setSearchQuery={search.setSearchQuery}
        searchType={search.searchType}
        setSearchType={search.setSearchType}
        handleSearchSubmit={search.handleSearchSubmit}
        handleClearSearch={search.handleClearSearch}
        searchActive={search.searchActive}
      />

      <div className="h-[calc(100vh-8rem)] flex overflow-hidden bg-gray-50">
        {/* Show Search Results when search is active */}
        {search.searchActive ? (
          <>
            <SearchResults
              query={search.searchQuery}
              results={search.searchEmails}
              totalResults={search.searchResults?.totalResults}
              isLoading={search.searchLoading}
              isError={search.searchError}
              onEmailClick={(email) => selection.handleEmailClick(email, ops.markAsReadMutation.mutate)}
              onClose={search.handleClearSearch}
            />
            {/* Column 3: Email Detail for search results */}
            {(!nav.isMobileView || nav.mobileView === "detail") && (
              <EmailDetail
                email={selectedEmail}
                customMailboxes={customMailboxes}
                showMoveMenu={ops.showMoveMenu}
                moveEmailId={ops.moveEmailId}
                onReply={compose.handleReply}
                onReplyAll={compose.handleReplyAll}
                onForward={compose.handleForward}
                onDelete={ops.handleDeleteEmail}
                onToggleStar={(emailId, starred) =>
                  ops.toggleStarMutation.mutate({ emailId, starred })
                }
                onToggleRead={(emailId, isRead) =>
                  isRead
                    ? ops.markAsUnreadMutation.mutate(emailId)
                    : ops.markAsReadMutation.mutate(emailId)
                }
                onMoveToFolder={(emailId, labelId) =>
                  ops.moveToFolderMutation.mutate({ emailId, labelId })
                }
                onShowMoveMenu={(show, emailId) => {
                  ops.setShowMoveMenu(show);
                  ops.setMoveEmailId(emailId);
                }}
                isDeleting={ops.deleteEmailMutation.isPending}
                isMoving={ops.moveToFolderMutation.isPending}
              />
            )}
          </>
        ) : (
          <>
            {/* Column 1: Mailboxes/Folders */}
            {(!nav.isMobileView || nav.mobileView === "folders") && nav.viewMode !== 'kanban' && (
              <MailboxSidebar
                standardMailboxes={standardMailboxes}
                customMailboxes={customMailboxes}
                selectedMailboxId={nav.selectedMailboxId}
                onMailboxClick={(id) => {
                  nav.handleMailboxClick(id);
                  selection.setSelectedEmailId(null); // Clear selection on mailbox change
                  selection.setSelectedEmails(new Set());
                }}
                onCompose={compose.handleNewCompose}
              />
            )}

            {/* Column 2: Email List OR Kanban */}
            {(!nav.isMobileView || nav.mobileView === "list") && (
              nav.viewMode === 'kanban' ? (
                <div className="flex-1 h-full overflow-hidden">
                  <KanbanBoard
                    emails={processedEmails}
                    currentMailboxId={nav.selectedMailboxId}
                    onEmailClick={(email) => {
                      selection.handleEmailClick(email, ops.markAsReadMutation.mutate);
                      // If on desktop, switch to list to see details per behavior in original file
                      if (!nav.isMobileView) nav.setViewMode('list');
                    }}
                  />
                </div>
              ) : (
                <EmailListView
                  emails={processedEmails}
                  selectedEmailId={selection.selectedEmailId}
                  selectedEmails={selection.selectedEmails}
                  selectedMailboxId={nav.selectedMailboxId}
                  isLoading={emailsLoading}
                  isError={emailsError}
                  isFetching={emailsFetching}
                  isFromCache={emailsFromCache}
                  isStale={emailsStale}
                  isOnline={isOnline}
                  isSyncing={isSyncing}
                  lastSyncTime={lastSyncTime}
                  onEmailClick={(email) => selection.handleEmailClick(email, ops.markAsReadMutation.mutate)}
                  onToggleSelection={selection.toggleEmailSelection}
                  onSelectAll={selection.selectAllEmails}
                  onToggleStar={(emailId, starred) =>
                    ops.toggleStarMutation.mutate({ emailId, starred })
                  }
                  onSync={sync}
                  onMarkAsRead={() => ops.markSelectedAsReadMutation.mutate()}
                  onDelete={() => ops.deleteSelectedMutation.mutate()}
                  isMarkingAsRead={ops.markSelectedAsReadMutation.isPending}
                  isDeleting={ops.deleteSelectedMutation.isPending}

                  // Pagination props
                  page={pageHistory.length}
                  hasNextPage={!!nextPageToken}
                  hasPreviousPage={pageHistory.length > 1}
                  onNextPage={() => {
                    if (nextPageToken) {
                      setPageHistory(prev => [...prev, nextPageToken]);
                    }
                  }}
                  onPreviousPage={() => {
                    if (pageHistory.length > 1) {
                      setPageHistory(prev => prev.slice(0, -1));
                    }
                  }}
                />
              )
            )}
          </>
        )}

        {/* Column 3: Email Detail (Only show in List mode or if Mobile detail view, and when not searching) */}
        {!search.searchActive && (!nav.isMobileView || nav.mobileView === "detail") && nav.viewMode === 'list' && (
          <EmailDetail
            email={selectedEmail}
            customMailboxes={customMailboxes}
            showMoveMenu={ops.showMoveMenu}
            moveEmailId={ops.moveEmailId}
            onReply={compose.handleReply}
            onReplyAll={compose.handleReplyAll}
            onForward={compose.handleForward}
            onDelete={ops.handleDeleteEmail}
            onToggleStar={(emailId, starred) =>
              ops.toggleStarMutation.mutate({ emailId, starred })
            }
            onToggleRead={(emailId, isRead) =>
              isRead
                ? ops.markAsUnreadMutation.mutate(emailId)
                : ops.markAsReadMutation.mutate(emailId)
            }
            onMoveToFolder={(emailId, labelId) =>
              ops.moveToFolderMutation.mutate({ emailId, labelId })
            }
            onShowMoveMenu={(show, emailId) => {
              ops.setShowMoveMenu(show);
              ops.setMoveEmailId(emailId);
            }}
            isDeleting={ops.deleteEmailMutation.isPending}
            isMoving={ops.moveToFolderMutation.isPending}
          />
        )}
      </div>

      {/* Compose Modal */}
      {compose.showCompose && (
        <ComposeModal
          mode={compose.composeMode}
          to={compose.composeTo}
          setTo={compose.setComposeTo}
          cc={compose.composeCc}
          setCc={compose.setComposeCc}
          subject={compose.composeSubject}
          setSubject={compose.setComposeSubject}
          body={compose.composeBody}
          setBody={compose.setComposeBody}
          attachments={compose.attachments}
          onAttachFile={compose.handleAttachFile}
          onRemoveAttachment={compose.handleRemoveAttachment}
          onClose={() => compose.setShowCompose(false)}
          onSend={compose.handleComposeSubmit}
          sending={compose.sendEmailMutation.isPending}
        />
      )}
    </>
  );
}
