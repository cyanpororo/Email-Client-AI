import { Button } from "../../ui/button";
import type { Email, MobileView } from "./types";
import type { SearchType } from "../../../hooks/useInboxSearch";

interface InboxHeaderProps {
    isMobileView: boolean;
    mobileView: MobileView;
    setMobileView: (view: MobileView) => void;
    selectedEmail: Email | null;
    viewMode: 'list' | 'kanban';
    setViewMode: (mode: 'list' | 'kanban') => void;
    kanbanSortOrder: 'newest' | 'oldest';
    setKanbanSortOrder: (order: 'newest' | 'oldest') => void;
    filterUnread: boolean;
    setFilterUnread: (filter: boolean) => void;
    filterHasAttachment: boolean;
    setFilterHasAttachment: (filter: boolean) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchType: SearchType;
    setSearchType: (type: SearchType) => void;
    handleSearchSubmit: (e?: React.FormEvent) => void;
    handleClearSearch: () => void;
    searchActive: boolean;
}

export function InboxHeader({
    isMobileView,
    mobileView,
    setMobileView,
    selectedEmail,
    viewMode,
    setViewMode,
    kanbanSortOrder,
    setKanbanSortOrder,
    filterUnread,
    setFilterUnread,
    filterHasAttachment,
    setFilterHasAttachment,
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    handleSearchSubmit,
    handleClearSearch,
    searchActive
}: InboxHeaderProps) {
    return (
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

                    {/* Kanban Filters - Only show on Kanban view */}
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

                    {/* Search Controls - Only show on List view */}
                    {viewMode === 'list' && (
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                            {/* Search Type Dropdown */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-2 border border-gray-200">
                                <select
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value as SearchType)}
                                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                                >
                                    <option value="fuzzy">🔍 Fuzzy</option>
                                    <option value="semantic">🧠 Semantic</option>
                                </select>
                            </div>

                            {/* Search Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search emails..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full lg:w-64 px-4 py-2 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                            </div>

                            {/* Search/Clear Buttons */}
                            {searchQuery ? (
                                <div className="flex gap-2">
                                    <Button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                                    >
                                        Search
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClearSearch}
                                        className="px-4 py-2"
                                    >
                                        Clear
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
                                    disabled
                                >
                                    Search
                                </Button>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
