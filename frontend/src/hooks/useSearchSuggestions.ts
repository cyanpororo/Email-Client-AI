import { useState, useEffect, useCallback, useRef } from 'react';
import * as gmailApi from '../api/gmail';

/**
 * Custom hook for managing search auto-suggestions
 * Provides debounced suggestion fetching and keyboard navigation
 */
export function useSearchSuggestions(searchQuery: string) {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    const debounceTimeout = useRef<number | undefined>(undefined);

    // Fetch suggestions with debouncing
    useEffect(() => {
        // Clear previous timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Don't show suggestions if query is too short
        if (searchQuery.trim().length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        // Debounce suggestion fetching
        setIsLoading(true);
        debounceTimeout.current = window.setTimeout(async () => {
            try {
                const results = await gmailApi.getSearchSuggestions(searchQuery);
                setSuggestions(results);
                setShowSuggestions(results.length > 0);
            } catch (error) {
                console.error('Failed to fetch suggestions:', error);
                setSuggestions([]);
                setShowSuggestions(false);
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [searchQuery]);

    // Reset selected index when suggestions change
    useEffect(() => {
        setSelectedIndex(-1);
    }, [suggestions]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Escape':
                e.preventDefault();
                setShowSuggestions(false);
                setSelectedIndex(-1);
                break;
        }
    }, [showSuggestions, suggestions.length]);

    /**
     * Get the currently selected suggestion
     */
    const getSelectedSuggestion = useCallback((): string | null => {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            return suggestions[selectedIndex];
        }
        return null;
    }, [selectedIndex, suggestions]);

    /**
     * Hide suggestions
     */
    const hideSuggestions = useCallback(() => {
        setShowSuggestions(false);
        setSelectedIndex(-1);
    }, []);

    /**
     * Select a suggestion by index
     */
    const selectSuggestion = useCallback((index: number): string | null => {
        if (index >= 0 && index < suggestions.length) {
            const selected = suggestions[index];
            hideSuggestions();
            return selected;
        }
        return null;
    }, [suggestions, hideSuggestions]);

    return {
        suggestions,
        showSuggestions,
        selectedIndex,
        isLoading,
        handleKeyDown,
        getSelectedSuggestion,
        hideSuggestions,
        selectSuggestion,
    };
}
