import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as gmailApi from "../api/gmail";
import type { Email } from "../components/pages/inbox/types";

export type SearchType = 'fuzzy' | 'semantic';

export function useInboxSearch(setViewMode: (mode: 'list' | 'kanban') => void) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchType, setSearchType] = useState<SearchType>('fuzzy');
    const [searchActive, setSearchActive] = useState(false);
    const [submittedQuery, setSubmittedQuery] = useState("");
    const [submittedSearchType, setSubmittedSearchType] = useState<SearchType>('fuzzy');
    const [searchTimestamp, setSearchTimestamp] = useState<number>(0);

    // Perform search when query is submitted
    // Include timestamp in query key to force refetch on each search
    const {
        data: searchResults,
        isLoading: searchLoading,
        isError: searchError,
    } = useQuery({
        queryKey: ["gmailSearch", submittedQuery, submittedSearchType, searchTimestamp],
        queryFn: () => {
            if (submittedSearchType === 'semantic') {
                return gmailApi.searchGmailEmailsSemantic(submittedQuery);
            } else {
                return gmailApi.searchGmailEmails(submittedQuery);
            }
        },
        enabled: searchActive && submittedQuery.trim().length > 0,
        // Make results stale immediately so refetch works
        staleTime: 0,
    });

    // Map search results to Email format
    const searchEmails: Email[] = searchResults
        ? searchResults.emails.map(gmailApi.mapGmailEmailToEmail)
        : [];

    // Handle search submission
    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        if (searchQuery.trim().length > 0) {
            const isSameSearch = submittedQuery === searchQuery && submittedSearchType === searchType;

            setSubmittedQuery(searchQuery);
            setSubmittedSearchType(searchType);
            setSearchActive(true);
            setViewMode('list'); // Switch to list view for search results

            // If it's the same search, update timestamp to force a new API call
            if (isSameSearch) {
                setSearchTimestamp(Date.now());
            } else {
                setSearchTimestamp(Date.now());
            }
        }
    };

    const handleClearSearch = () => {
        setSearchQuery("");
        setSearchActive(false);
        setSubmittedQuery("");
        setSearchTimestamp(0);
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
