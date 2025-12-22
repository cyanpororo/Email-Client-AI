import { useState } from "react";
import type { Email } from "./types";
import { Button } from "../../ui/button";

interface SearchResultsProps {
  query: string;
  results: Email[];
  totalResults?: number;
  isLoading: boolean;
  isError: boolean;
  onEmailClick: (email: Email) => void;
  onClose: () => void;
}

export function SearchResults({
  query,
  results,
  totalResults,
  isLoading,
  isError,
  onEmailClick,
  onClose,
}: SearchResultsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Searching emails...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-md p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Search Failed
          </h2>
          <p className="text-gray-600 mb-4">
            Unable to complete the search. Please try again.
          </p>
          <Button onClick={onClose}>Back to Inbox</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white border-r border-gray-200 overflow-hidden">
      {/* Search Results Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Search Results
          </h2>
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-sm"
          >
            Clear Search
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">Query:</span>
          <span className="italic">"{query}"</span>
          {totalResults !== undefined && (
            <span className="ml-2">
              ({totalResults} {totalResults === 1 ? "result" : "results"})
            </span>
          )}
        </div>
      </div>

      {/* Search Results List */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md p-6">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Results Found
              </h3>
              <p className="text-gray-600 mb-4">
                No emails match your search query "{query}". Try using different
                keywords or check the spelling.
              </p>
              <Button onClick={onClose} variant="outline">
                Back to Inbox
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {results.map((email) => {
              const isHovered = hoveredId === email.id;
              const senderName = email.from.name || email.from.email;
              const senderEmail = email.from.email;

              return (
                <div
                  key={email.id}
                  className={`p-4 cursor-pointer transition-colors ${isHovered ? "bg-blue-50" : "bg-white hover:bg-gray-50"
                    }`}
                  onClick={() => onEmailClick(email)}
                  onMouseEnter={() => setHoveredId(email.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Email Card */}
                  <div className="flex items-start gap-3">
                    {/* Star Icon */}
                    <button
                      className="mt-1 text-xl hover:scale-110 transition-transform"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Star functionality would be handled by parent
                      }}
                    >
                      {email.isStarred ? "⭐" : "☆"}
                    </button>

                    {/* Email Content */}
                    <div className="flex-1 min-w-0">
                      {/* Sender */}
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`font-semibold truncate ${email.isRead ? "text-gray-700" : "text-gray-900"
                            }`}
                        >
                          {senderName}
                        </span>
                        {!email.isRead && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>

                      {/* Email Address (if different from name) */}
                      {senderName !== senderEmail && (
                        <div className="text-xs text-gray-500 mb-1">
                          {senderEmail}
                        </div>
                      )}

                      {/* Subject */}
                      <div
                        className={`text-sm mb-1 truncate ${email.isRead ? "text-gray-700" : "text-gray-900 font-semibold"
                          }`}
                      >
                        {email.subject || "(No Subject)"}
                      </div>

                      {/* Preview/Snippet */}
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {email.preview || "(No preview available)"}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span>
                          {new Date(email.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year:
                              new Date(email.timestamp).getFullYear() !==
                                new Date().getFullYear()
                                ? "numeric"
                                : undefined,
                          })}
                        </span>
                        {email.hasAttachments && (
                          <span className="flex items-center gap-1">
                            📎 Attachment
                          </span>
                        )}
                        {email.similarity !== undefined && (
                          <span className="flex items-center gap-1 text-green-600 font-medium" title="Semantic Similarity Score">
                            🎯 {(email.similarity * 100).toFixed(1)}% Match
                          </span>
                        )}
                      </div>
                    </div>

                    {/* View Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEmailClick(email);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

