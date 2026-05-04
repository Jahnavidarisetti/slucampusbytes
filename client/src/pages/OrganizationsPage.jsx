import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarBadge from "../components/AvatarBadge";
import {
  fetchFollowerCount,
  fetchOrganizations,
} from "../api/organizations";

export default function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [followerCounts, setFollowerCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrganizations() {
      setLoading(true);
      setError("");

      try {
        const orgs = await fetchOrganizations();
        const followerEntries = await Promise.all(
          orgs.map(async (organization) => [
            organization.id,
            await fetchFollowerCount(organization.id),
          ])
        );

        if (!isMounted) {
          return;
        }

        setOrganizations(orgs);
        setFollowerCounts(Object.fromEntries(followerEntries));
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message || "Unable to load organizations right now."
          );
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Organizations
            </h1>
            <p className="text-sm text-slate-500">
              Browse campus clubs, departments, and official groups.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Loading organizations...
          </div>
        ) : error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            {error}
          </div>
        ) : organizations.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
            No organizations are available yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {organizations.map((organization) => (
              <button
                key={organization.id}
                type="button"
                onClick={() => navigate(`/organizations/${organization.id}`)}
                className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <AvatarBadge
                    src={organization.logo_url}
                    label={organization.name || organization.username || "Organization"}
                    size="lg"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold text-slate-900">
                        {organization.name || organization.username || "Organization"}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                        Organization
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {organization.description ||
                        "Visit this organization page to see followers, posts, and campus updates."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Followers
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {followerCounts[organization.id] ?? 0}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-sky-700">
                    View profile
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
