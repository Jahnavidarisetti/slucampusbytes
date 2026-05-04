import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSettingsProfile() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user ?? null;

        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, full_name, email, role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!isMounted) {
          return;
        }

        setProfile(
          data || {
            id: user.id,
            username: user.user_metadata?.username || "",
            full_name: user.user_metadata?.full_name || "",
            email: user.email || "",
            role: user.user_metadata?.role || "Student",
          }
        );
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load settings.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSettingsProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </button>

          <div className="text-right">
            <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">
              Manage account access, profile actions, and navigation.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Loading settings...
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Account Overview
              </h2>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Full Name
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {profile?.full_name || "Not added"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Username
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {profile?.username || "Not added"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Email
                    </p>
                    <p className="mt-2 break-all text-sm font-medium text-slate-900">
                      {profile?.email || "Not available"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      Role
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-900">
                      {profile?.role || "Student"}
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Quick Actions
              </h2>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                >
                  Open Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/edit-profile")}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/organizations")}
                  className="w-full rounded-xl bg-slate-100 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-200"
                >
                  Browse Organizations
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-700 transition hover:bg-red-100"
                >
                  Logout
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
