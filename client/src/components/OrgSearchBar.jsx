import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganizationSearch } from "../hooks/useOrganizationSearch";
import AvatarBadge from "./AvatarBadge";

/**
 * OrgSearchBar
 *
 * Single-responsibility component: renders the search input in the navbar
 * and a dropdown of matching organizations. Navigates to the org details
 * page when the user selects a result.
 *
 * Uses useOrganizationSearch hook for all data/filter logic (SRP + DIP).
 */
export default function OrgSearchBar() {
  const navigate = useNavigate();
  const {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearQuery,
    refreshOrganizations,
  } =
    useOrganizationSearch();

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        clearQuery();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clearQuery]);

  function handleSelect(org) {
    clearQuery();
    navigate(`/organizations/${org.id}`);
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") clearQuery();
  }

  const showDropdown = query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      {/* Search input */}
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 text-slate-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={refreshOrganizations}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search organizations…"
          aria-label="Search organizations"
          className="w-full rounded-full border border-slate-200 bg-white/90 py-2 pl-9 pr-9 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => {
              clearQuery();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-3 text-slate-400 hover:text-slate-600 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              Loading organizations…
            </div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No organizations found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <ul role="listbox" aria-label="Organization results">
              {results.map((org) => (
                <li key={org.id} role="option">
                  <button
                    onMouseDown={(e) => {
                      // Use mousedown so it fires before the input blur
                      e.preventDefault();
                      handleSelect(org);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                  >
                    <AvatarBadge
                      src={org.logo_url}
                      label={org.name || org.username || "Organization"}
                      size="sm"
                      className="flex-shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {org.name || org.username || "Organization"}
                      </p>
                      {org.description && (
                        <p className="truncate text-xs text-slate-500">
                          {org.description}
                        </p>
                      )}
                    </div>

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 flex-shrink-0 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
