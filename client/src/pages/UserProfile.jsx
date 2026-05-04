import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AvatarBadge from "../components/AvatarBadge";

export default function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setError("");

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;

        if (!user) {
          navigate("/login");
          return;
        }

        const userId = user.id;

        if (!userId) {
          setError("Unable to load profile because user session is missing an ID.");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, full_name, email, role, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        if (error) {
          setError(error.message);
          return;
        }

        setProfile(
          data || {
            id: userId,
            username:
              user.user_metadata?.username ||
              user.user_metadata?.full_name ||
              user.email ||
              "User",
            full_name: user.user_metadata?.full_name || "",
            email: user.email || "",
            role: user.user_metadata?.role || "Student",
            avatar_url: user.user_metadata?.avatar_url || null,
          }
        );
      } catch (err) {
        setError(err.message || "Unable to load profile.");
      }
    }

    loadProfile();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mb-6 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to Dashboard
        </button>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!error && !profile && (
          <div className="rounded-xl bg-white p-6 text-slate-600">
            Loading profile...
          </div>
        )}

        {profile && (
            <section className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <AvatarBadge
          src={profile.avatar_url}
          label={profile.username || profile.email || "Profile"}
          size="xl"
        />

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-slate-900">
            {profile.full_name || profile.username || "User Profile"}
          </h1>

          <p className="mt-1 text-slate-600">
            {profile.email}
          </p>

          <span className="mt-3 inline-block rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {profile.role || "Student"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate("/edit-profile")}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Edit Profile
        </button>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Profile Information
        </h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Full Name</p>
            <p className="font-medium text-slate-900">
              {profile.full_name || "Not added"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Username</p>
            <p className="font-medium text-slate-900">
              {profile.username || "Not added"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Email ID</p>
            <p className="font-medium text-slate-900">
              {profile.email || "Not added"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">User Role</p>
            <p className="font-medium text-slate-900">
              {profile.role || "Student"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          CampusBytes Account
        </h2>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-slate-500">Account Type</p>
            <p className="font-medium text-slate-900">
              {profile.role || "Student"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">User ID</p>
            <p className="break-all font-medium text-slate-900">
              {profile.id || "Not available"}
            </p>
          </div>

          <div>
            <p className="text-slate-500">Profile Status</p>
            <p className="font-medium text-green-700">
              Active
            </p>
          </div>

          <div>
            <p className="text-slate-500">Current Page</p>
            <p className="font-medium text-slate-900">
              User Profile
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
)}
      </div>
    </div>
  );
}