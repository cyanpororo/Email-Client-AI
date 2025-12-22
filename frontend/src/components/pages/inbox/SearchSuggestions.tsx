interface SearchSuggestionsProps {
    suggestions: string[];
    selectedIndex: number;
    onSelect: (suggestion: string) => void;
    isLoading?: boolean;
}

export function SearchSuggestions({
    suggestions,
    selectedIndex,
    onSelect,
    isLoading = false,
}: SearchSuggestionsProps) {
    if (isLoading) {
        return (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-2">
                <div className="px-4 py-2 text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading suggestions...
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
                <button
                    key={index}
                    type="button"
                    onClick={() => onSelect(suggestion)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${index === selectedIndex
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                >
                    <span className="text-gray-400">🔍</span>
                    <span className="flex-1 truncate">{suggestion}</span>
                    {index === selectedIndex && (
                        <span className="text-xs text-blue-600">↵</span>
                    )}
                </button>
            ))}
        </div>
    );
}
