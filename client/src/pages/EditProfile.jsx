import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarBadge from "../components/AvatarBadge";
import { supabase } from "../supabaseClient";
import {
  checkUsernameAvailable,
  updateProfile,
  uploadAvatarFile,
  upsertOrganization,
  validateUsername,
} from "../lib/supabaseAuth";

export default function EditProfile() {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    email: "",
    role: "Student",
    organization_description: "",
    avatar_url: "",
  });
  const [initialUsername, setInitialUsername] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
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
          .select(
            "id, username, full_name, email, role, avatar_url, organization_description"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        const resolvedProfile = data || {
          id: user.id,
          username: user.user_metadata?.username || "",
          full_name: user.user_metadata?.full_name || "",
          email: user.email || "",
          role: user.user_metadata?.role || "Student",
          avatar_url: user.user_metadata?.avatar_url || "",
          organization_description:
            user.user_metadata?.organization_description || "",
        };

        if (!isMounted) {
          return;
        }

        setSessionUser(user);
        setForm({
          username: resolvedProfile.username || "",
          full_name: resolvedProfile.full_name || "",
          email: resolvedProfile.email || user.email || "",
          role: resolvedProfile.role || "Student",
          organization_description:
            resolvedProfile.organization_description || "",
          avatar_url: resolvedProfile.avatar_url || "",
        });
        setInitialUsername(resolvedProfile.username || "");
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load profile details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const avatarPreview = useMemo(() => {
    if (selectedFile) {
      return URL.createObjectURL(selectedFile);
    }

    return form.avatar_url || null;
  }, [form.avatar_url, selectedFile]);

  useEffect(() => {
    return () => {
      if (selectedFile && avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview, selectedFile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError("");
    setSuccessMessage("");
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setError("");
    setSuccessMessage("");
    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!sessionUser?.id) {
      setError("Your session expired. Please sign in again.");
      return;
    }

    const username = form.username.trim();
    const fullName = form.full_name.trim();
    const organizationDescription = form.organization_description.trim();

    if (!username) {
      setError("Username is required.");
      return;
    }

    if (!validateUsername(username)) {
      setError("Username must be 3-20 characters and use only letters, numbers, or underscores.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      if (username !== initialUsername) {
        const isAvailable = await checkUsernameAvailable(username);
        if (!isAvailable) {
          throw new Error("That username is already taken.");
        }
      }

      let avatarUrl = form.avatar_url || null;
      if (selectedFile) {
        avatarUrl = await uploadAvatarFile(selectedFile, sessionUser.id);
      }

      const profilePayload = {
        username,
        full_name: fullName || null,
        avatar_url: avatarUrl,
        organization_description:
          form.role === "Organization" ? organizationDescription || null : null,
      };

      await updateProfile(sessionUser.id, profilePayload);

      if (form.role === "Organization") {
        await upsertOrganization(sessionUser.id, {
          username,
          name: fullName || username,
          description: organizationDescription || null,
          logo_url: avatarUrl,
        });
      }

      await supabase.auth.updateUser({
        data: {
          username,
          full_name: fullName,
          role: form.role,
          avatar_url: avatarUrl,
          organization_description:
            form.role === "Organization" ? organizationDescription : "",
        },
      });

      setForm((current) => ({
        ...current,
        username,
        full_name: fullName,
        avatar_url: avatarUrl || "",
        organization_description:
          form.role === "Organization" ? organizationDescription : "",
      }));
      setInitialUsername(username);
      setSelectedFile(null);
      setSuccessMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to Profile
          </button>

          <div className="text-right">
            <h1 className="text-2xl font-semibold text-slate-900">
              Edit Profile
            </h1>
            <p className="text-sm text-slate-500">
              Update your account information and organization details.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
            Loading profile editor...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <AvatarBadge
                  src={avatarPreview}
                  label={form.username || form.email || "Profile"}
                  size="xl"
                />

                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900">
                    Profile Photo
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Upload a new avatar for your dashboard, posts, and profile.
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="mt-4 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="text-sm font-medium text-slate-700" htmlFor="full_name">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="text-sm font-medium text-slate-700" htmlFor="username">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="username"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label className="text-sm font-medium text-slate-700" htmlFor="role">
                  Role
                </label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  value={form.role}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                />
              </div>
            </section>

            {form.role === "Organization" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="organization_description"
                >
                  Organization Description
                </label>
                <textarea
                  id="organization_description"
                  name="organization_description"
                  value={form.organization_description}
                  onChange={handleChange}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  placeholder="Tell students what your organization is about."
                />
              </section>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
