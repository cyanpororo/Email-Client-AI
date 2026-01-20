import { Button } from "../../ui/button";
import type { Email, MobileView } from "./types";
import type { SearchType } from "../../../hooks/useInboxSearch";
import { useSearchSuggestions } from "../../../hooks/useSearchSuggestions";
import { SearchSuggestions } from "./SearchSuggestions";

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
    // Initialize search suggestions hook
    const suggestionHook = useSearchSuggestions(searchQuery);

    return (
        <div className="bg-white border-b border-gray-200 px-3 md:px-4 lg:px-6 py-3 md:py-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                {/* Title and View Mode Toggle */}
                <div className="flex items-center justify-between lg:justify-start w-full lg:w-auto gap-2">
                    {/* Title Section */}
                    <div className="flex items-center gap-2 min-w-0">
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
                                        className="p-1.5 h-8"
                                    >
                                        ☰
                                    </Button>
                                )}
                                <h1 className="text-base md:text-xl lg:text-2xl font-bold text-gray-900 whitespace-nowrap">
                                    Gmail Inbox
                                </h1>
                            </>
                        )}
                    </div>
                    
                    {/* View Mode Toggle - Show on small/medium screens */}
                    {!searchActive && (
                        <div className="flex lg:hidden bg-gray-100 rounded-lg p-1 border border-gray-200 shrink-0">
                            <button
                                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                            <button
                                className={`px-2 md:px-3 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setViewMode('kanban')}
                            >
                                Kanban
                            </button>
                        </div>
                    )}
                </div>

                {/* Controls Section - All controls in one row on large screens */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:gap-3 w-full lg:w-auto">
                    {/* View Mode Toggle - Show on large screens */}
                    {!searchActive && (
                        <div className="hidden lg:flex bg-gray-100 rounded-lg p-1 border border-gray-200 shrink-0">
                            <button
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                            <button
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                onClick={() => setViewMode('kanban')}
                            >
                                Kanban
                            </button>
                        </div>
                    )}

                    {/* Filters & Sort - Show when not searching */}
                    {!searchActive && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 shrink-0">
                            {/* Sort Dropdown */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1.5 border border-gray-200 hover:border-blue-300 transition-colors shrink-0">
                                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort:</span>
                                <select
                                    value={kanbanSortOrder}
                                    onChange={(e) => setKanbanSortOrder(e.target.value as 'newest' | 'oldest')}
                                    className="bg-transparent text-xs md:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer pr-1"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                </select>
                            </div>

                            {/* Filter Buttons */}
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setFilterUnread(!filterUnread)}
                                    className={`px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 whitespace-nowrap ${filterUnread
                                        ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${filterUnread ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                    Unread
                                </button>
                                <button
                                    onClick={() => setFilterHasAttachment(!filterHasAttachment)}
                                    className={`px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 whitespace-nowrap ${filterHasAttachment
                                        ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    <span>📎</span>
                                    <span className="hidden sm:inline">Attachments</span>
                                    <span className="sm:hidden">Files</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Search Controls - Only show on List view */}
                    {viewMode === 'list' && (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            // Check if a suggestion is selected
                            const selectedSuggestion = suggestionHook.getSelectedSuggestion();
                            if (selectedSuggestion) {
                                setSearchQuery(selectedSuggestion);
                                suggestionHook.hideSuggestions();
                                // Wait a bit for state to update then submit
                                setTimeout(() => handleSearchSubmit(), 0);
                            } else {
                                handleSearchSubmit();
                            }
                        }} className="flex items-center gap-1.5 md:gap-2 shrink-0">
                            {/* Search Type Dropdown */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1.5 border border-gray-200 shrink-0">
                                <select
                                    value={searchType}
                                    onChange={(e) => setSearchType(e.target.value as SearchType)}
                                    className="bg-transparent text-xs md:text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
                                >
                                    <option value="fuzzy">🔍 Fuzzy</option>
                                    <option value="semantic">🧠 Semantic</option>
                                </select>
                            </div>

                            {/* Search Input with Auto-Suggestions */}
                            <div className="relative flex-1 sm:flex-initial min-w-0">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                        suggestionHook.handleKeyDown(e);
                                    }}
                                    onBlur={() => {
                                        // Delay hiding to allow click on suggestion
                                        setTimeout(() => suggestionHook.hideSuggestions(), 200);
                                    }}
                                    onFocus={() => {
                                        // Show suggestions if we have some
                                        if (suggestionHook.suggestions.length > 0 && searchQuery.trim().length >= 2) {
                                            // This will be handled by the hook
                                        }
                                    }}
                                    className="w-full sm:w-40 md:w-48 lg:w-56 xl:w-64 px-3 md:px-4 py-1.5 pl-8 md:pl-10 pr-2 md:pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <span className="absolute left-2 md:left-3 top-2 text-gray-400 text-sm">🔍</span>

                                {/* Suggestions Dropdown */}
                                {suggestionHook.showSuggestions && (
                                    <SearchSuggestions
                                        suggestions={suggestionHook.suggestions}
                                        selectedIndex={suggestionHook.selectedIndex}
                                        isLoading={suggestionHook.isLoading}
                                        onSelect={(suggestion) => {
                                            setSearchQuery(suggestion);
                                            suggestionHook.hideSuggestions();
                                            // Trigger search after selecting suggestion
                                            setTimeout(() => handleSearchSubmit(), 0);
                                        }}
                                    />
                                )}
                            </div>

                            {/* Search/Clear Buttons */}
                            {searchQuery ? (
                                <div className="flex gap-1.5 shrink-0">
                                    <Button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap"
                                    >
                                        Search
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleClearSearch}
                                        className="px-2 sm:px-3 md:px-4 py-1.5 text-xs md:text-sm whitespace-nowrap"
                                    >
                                        Clear
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 md:px-4 py-1.5 text-xs md:text-sm shrink-0 whitespace-nowrap"
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
