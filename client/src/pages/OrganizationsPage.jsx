import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrganizationCard from "../components/OrganizationCard";
import {
  fetchOrganizationSummaries,
  followOrganization,
  unfollowOrganization,
} from "../api/organizations";
import { supabase } from "../supabaseClient";

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [sessionUserId, setSessionUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [followLoadingId, setFollowLoadingId] = useState(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setLoading(true);
      setError("");
      setActionError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const currentUserId = session?.user?.id ?? null;
        const summaries = await fetchOrganizationSummaries(currentUserId);

        if (!isMounted) {
          return;
        }

        setSessionUserId(currentUserId);
        setOrganizations(
          summaries.map((organization) => ({
            ...organization,
            is_own_organization:
              Boolean(currentUserId) && organization.profile_id === currentUserId,
          }))
        );
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load organizations.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(
    () =>
      organizations.reduce(
        (summary, organization) => ({
          organizations: summary.organizations + 1,
          posts: summary.posts + Number(organization.posts_count ?? 0),
          followers: summary.followers + Number(organization.followers_count ?? 0),
        }),
        { organizations: 0, posts: 0, followers: 0 }
      ),
    [organizations]
  );

  const handleOpenOrganization = (organization) => {
    navigate(`/organizations/${organization.id}`);
  };

  const handleToggleFollow = async (organization) => {
    if (!sessionUserId || organization.is_own_organization) {
      return;
    }

    const nextFollowing = !organization.is_following;
    setFollowLoadingId(organization.id);
    setActionError("");
    setOrganizations((currentOrganizations) =>
      currentOrganizations.map((item) =>
        item.id === organization.id
          ? {
              ...item,
              is_following: nextFollowing,
              followers_count: Math.max(
                0,
                Number(item.followers_count ?? 0) + (nextFollowing ? 1 : -1)
              ),
            }
          : item
      )
    );

    try {
      if (nextFollowing) {
        await followOrganization(sessionUserId, organization.id);
      } else {
        await unfollowOrganization(sessionUserId, organization.id);
      }
    } catch (followError) {
      setOrganizations((currentOrganizations) =>
        currentOrganizations.map((item) =>
          item.id === organization.id
            ? {
                ...item,
                is_following: !nextFollowing,
                followers_count: Math.max(
                  0,
                  Number(item.followers_count ?? 0) + (nextFollowing ? -1 : 1)
                ),
              }
            : item
        )
      );
      setActionError(followError.message || "Unable to update follow status.");
    } finally {
      setFollowLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>

          <div className="flex flex-wrap gap-2 text-sm text-slate-700">
            <span className="rounded-full bg-white/85 px-3 py-1 shadow-sm">
              {totals.organizations} organizations
            </span>
            <span className="rounded-full bg-white/85 px-3 py-1 shadow-sm">
              {totals.posts} posts
            </span>
            <span className="rounded-full bg-white/85 px-3 py-1 shadow-sm">
              {totals.followers} followers
            </span>
          </div>
        </div>

        <section className="rounded-md border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900">
              Organizations
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Browse campus organizations, see their activity, and follow the
              groups you want in your feed.
            </p>
          </div>

          {actionError && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="rounded-md border border-slate-200 bg-white p-8 text-center text-slate-600">
              Loading organizations...
            </div>
          ) : error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-8 text-center text-red-700">
              {error}
            </div>
          ) : organizations.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/85 p-8 text-center text-slate-600">
              No organizations are available yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {organizations.map((organization) => (
                <OrganizationCard
                  key={organization.id}
                  organization={organization}
                  onOpen={handleOpenOrganization}
                  onFollow={handleToggleFollow}
                  followLoading={followLoadingId === organization.id}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
