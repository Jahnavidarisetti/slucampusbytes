import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOrganizations } from "../api/organizations";

/**
 * useOrganizationSearch
 *
 * Single-responsibility hook: manages fetching all organizations once and
 * filtering them client-side as the user types.
 *
 * Returns:
 *   query        – current search string
 *   setQuery     – setter for the search string
 *   results      – filtered list of organizations matching the query
 *   isLoading    – true while the initial fetch is in progress
 *   error        – error message string or null
 *   clearQuery   – helper to reset the search field
 */
export function useOrganizationSearch() {
  const [allOrgs, setAllOrgs] = useState([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);
  const requestIdRef = useRef(0);

  const loadOrganizations = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const orgs = await fetchOrganizations();
      if (requestIdRef.current === requestId) {
        setAllOrgs(orgs);
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err.message);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch organizations once on first use
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    loadOrganizations();
  }, [loadOrganizations]);

  const refreshOrganizations = useCallback(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const clearQuery = useCallback(() => setQuery(""), []);

  const trimmed = query.trim().toLowerCase();

  const results =
    trimmed.length === 0
      ? []
      : allOrgs.filter((org) => {
          const name = (org.name || org.username || "").toLowerCase();
          const username = (org.username || "").toLowerCase();
          const desc = (org.description || "").toLowerCase();
          return (
            name.includes(trimmed) ||
            username.includes(trimmed) ||
            desc.includes(trimmed)
          );
        });

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearQuery,
    refreshOrganizations,
  };
}
