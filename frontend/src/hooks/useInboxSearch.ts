import { useState } from "react";
import * as gmailApi from "../api/gmail";
import type { Email } from "../components/pages/inbox/types";

export type SearchType = 'fuzzy' | 'semantic';

export function useInboxSearch(setViewMode: (mode: 'list' | 'kanban') => void) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState<SearchType>('fuzzy');
    const [searchActive, setSearchActive] = useState(false);

    // Search state
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        emails: gmailApi.GmailEmail[];
        query: string;
        totalResults?: number;
    } | null>(null);

    // Map search results to Email format
    const searchEmails: Email[] = searchResults
        ? searchResults.emails.map(gmailApi.mapGmailEmailToEmail)
        : [];

    // Handle search submission
    const handleSearchSubmit = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }

        if (searchQuery.trim().length === 0) return;

        setSearchLoading(true);
        setSearchError(false);
        setSearchActive(true);
        setViewMode('list'); // Switch to list view for search results

        try {
            let results;
            if (searchType === 'semantic') {
                results = await gmailApi.searchGmailEmailsSemantic(searchQuery);
            } else {
                results = await gmailApi.searchGmailEmails(searchQuery);
            }
            setSearchResults(results);
        } catch (error) {
            console.error("Search failed:", error);
            setSearchError(true);
            setSearchResults(null);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        setSearchActive(false);
        setSearchResults(null);
        setSearchError(false);
    };

    return {
        searchQuery,
        setSearchQuery,
        searchType,
        setSearchType,
        searchActive,
        setSearchActive,
        searchEmails,
        searchResults,
        searchLoading,
        searchError,
        handleSearchSubmit,
        handleClearSearch
    };
}
