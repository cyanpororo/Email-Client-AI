import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import * as gmailApi from "../api/gmail";
import type { Email } from "../components/pages/inbox/types";

export function useInboxSearch(setViewMode: (mode: 'list' | 'kanban') => void) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchActive, setSearchActive] = useState(false);
    const [debouncedQuery, setDebouncedQuery] = useState("");

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

    return {
        searchQuery,
        setSearchQuery,
        searchActive,
        setSearchActive,
        debouncedQuery,
        searchEmails,
        searchResults, // exposing totalResults if needed
        searchLoading,
        searchError,
        handleSearchSubmit,
        handleClearSearch
    };
}
