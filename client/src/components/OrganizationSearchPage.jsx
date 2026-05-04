import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AvatarBadge from "./AvatarBadge";
import { fetchOrganizationDirectoryDetail } from "../api/organizationDirectory";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const PAGE_SIZE = 9;

function OrganizationCard({ org, isJoining, onJoin, joinedIds, onOpenDetail, openingId }) {
  const alreadyJoined = joinedIds.has(org.id);
  const openingProfile = openingId === org.id;

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <AvatarBadge src={org.logoUrl} label={org.name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-800">{org.name}</h3>
            {org.isFeatured ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Featured
              </span>
            ) : null}
          </div>
          {org.username ? (
            <p className="text-xs text-slate-500">@{org.username}</p>
          ) : null}
        </div>
      </div>

      <p className="mb-3 text-sm text-slate-600">{org.description}</p>

      <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-1">{org.category}</span>
        <span className="rounded bg-slate-100 px-2 py-1">
          {org.memberCount} members
        </span>
        <span className="rounded bg-slate-100 px-2 py-1">
          {org.likesCount} likes
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpenDetail(org.id)}
          disabled={openingProfile}
          className="h-9 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {openingProfile ? "Loading…" : "View profile"}
        </button>
        <button
          type="button"
          onClick={() => onJoin(org)}
          disabled={alreadyJoined || isJoining}
          className="h-9 rounded bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {alreadyJoined ? "Joined" : isJoining ? "Joining..." : "Join"}
        </button>
      </div>
    </article>
  );
}

function OrganizationSearchPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [organizations, setOrganizations] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [joinedIds, setJoinedIds] = useState(() => new Set());
  const [feedback, setFeedback] = useState("");
  const [openingOrgId, setOpeningOrgId] = useState(null);

  const fetchOrganizations = async ({ reset = false } = {}) => {
    const nextOffset = reset ? 0 : offset;
    setLoading(true);
    setFeedback("");

    try {
      const params = new URLSearchParams({
        q: searchTerm,
        sortBy,
        limit: String(PAGE_SIZE),
        offset: String(nextOffset)
      });
      const response = await fetch(`${API_BASE}/api/organizations?${params}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch organizations.");
      }

      const rows = Array.isArray(payload) ? payload : [];
      const nextRows = reset ? rows : [...organizations, ...rows];
      setOrganizations(nextRows);
      setOffset(nextOffset + rows.length);
      setHasMore(response.headers.get("x-org-has-more") === "true");
    } catch (error) {
      setFeedback(error.message || "Unable to fetch organizations.");
      if (reset) {
        setOrganizations([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setOffset(0);
    fetchOrganizations({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, sortBy]);

  const sortOptions = useMemo(
    () => [
      { label: "Most Featured", value: "featured" },
      { label: "Most Liked", value: "liked" },
      { label: "Most Popular", value: "popular" }
    ],
    []
  );

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleOpenDetail = async (organizationId) => {
    setOpeningOrgId(organizationId);
    setFeedback("");
    try {
      await fetchOrganizationDirectoryDetail(organizationId);
      navigate(`/organizations/${organizationId}`);
    } catch (err) {
      setFeedback(err.message || "Unable to load organization details.");
    } finally {
      setOpeningOrgId(null);
    }
  };

  const handleJoin = async (org) => {
    const confirmed = window.confirm(`Join "${org.name}"?`);
    if (!confirmed) return;

    setJoiningId(org.id);
    setFeedback("");

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Please log in to join an organization.");
      }

      const response = await fetch(`${API_BASE}/api/organizations/${org.id}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to join organization.");
      }

      setJoinedIds((prev) => new Set(prev).add(org.id));
      setFeedback(`You joined ${org.name}.`);
    } catch (error) {
      setFeedback(error.message || "Failed to join organization.");
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white/80 p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search organizations by name or keyword..."
            className="h-10 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="h-10 rounded bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="h-10 rounded border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {feedback ? (
        <p className="mb-4 rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {feedback}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {organizations.map((org) => (
          <OrganizationCard
            key={org.id}
            org={org}
            joinedIds={joinedIds}
            isJoining={joiningId === org.id}
            onJoin={handleJoin}
            onOpenDetail={handleOpenDetail}
            openingId={openingOrgId}
          />
        ))}
      </div>

      {!loading && organizations.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">No organizations found.</p>
      ) : null}

      {hasMore ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => fetchOrganizations({ reset: false })}
            disabled={loading}
            className="h-10 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Loading..." : "Load more"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default OrganizationSearchPage;
