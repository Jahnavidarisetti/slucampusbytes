import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import {
  checkUsernameAvailable,
  isSluEmail,
  normalizeEmail,
  resolveEmailFromIdentifier,
  updateProfile,
  uploadAvatarFile,
  validatePassword,
  validateUsername,
} from "./lib/supabaseAuth";

const roleOptions = [
  "Student",
  "Faculty",
  "Staff",
  "Alumni",
  "Applicant",
];

const registrationSteps = [
  { id: 1, title: "Role & Details" },
  { id: 2, title: "Avatar Upload" },
  { id: 3, title: "Confirmation" },
];

function App() {
  const [mode, setMode] = useState("login");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ type: "", text: "" });

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerStep, setRegisterStep] = useState(1);
  const [registerData, setRegisterData] = useState({
    role: roleOptions[0],
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [registerMessage, setRegisterMessage] = useState({
    type: "",
    text: "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return;
    }

    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const registerSummary = useMemo(
    () => [
      { label: "Role", value: registerData.role },
      { label: "Full name", value: registerData.fullName || "-" },
      { label: "Username", value: registerData.username || "-" },
      { label: "Email", value: registerData.email || "-" },
      {
        label: "Avatar",
        value: avatarFile ? avatarFile.name : "No avatar selected",
      },
    ],
    [registerData, avatarFile]
  );

  const resetMessages = () => {
    setAuthMessage({ type: "", text: "" });
    setRegisterMessage({ type: "", text: "" });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    resetMessages();
    setAuthLoading(true);

    try {
      const email = await resolveEmailFromIdentifier(loginIdentifier);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginPassword,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        setAuthMessage({
          type: "info",
          text: "Check your email to verify your account before signing in.",
        });
      } else {
        setAuthMessage({
          type: "success",
          text: "Welcome back! You are signed in.",
        });
      }
    } catch (error) {
      setAuthMessage({
        type: "error",
        text: error.message || "Unable to sign in.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const validateStepOne = async () => {
    const issues = [];
    const email = normalizeEmail(registerData.email);

    if (!registerData.role) {
      issues.push("Choose a role to continue.");
    }

    if (!registerData.fullName.trim()) {
      issues.push("Enter your full name.");
    }

    if (!validateUsername(registerData.username)) {
      issues.push("Username must be 3-20 characters (letters, numbers, _).");
    }

    if (!registerData.email.trim()) {
      issues.push("Enter your SLU email address.");
    } else if (!isSluEmail(email)) {
      issues.push("Only @slu.edu email addresses can register.");
    }

    if (!validatePassword(registerData.password)) {
      issues.push("Password must be at least 8 characters.");
    }

    if (registerData.password !== registerData.confirmPassword) {
      issues.push("Passwords do not match.");
    }

    if (issues.length) {
      setRegisterMessage({ type: "error", text: issues[0] });
      return false;
    }

    const isAvailable = await checkUsernameAvailable(registerData.username);
    if (!isAvailable) {
      setRegisterMessage({
        type: "error",
        text: "That username is already taken.",
      });
      return false;
    }

    return true;
  };

  const handleStepOneNext = async () => {
    resetMessages();
    setAuthLoading(true);

    try {
      const ok = await validateStepOne();
      if (ok) {
        setRegisterStep(2);
      }
    } catch (error) {
      setRegisterMessage({
        type: "error",
        text: error.message || "Unable to validate registration details.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    resetMessages();
    setAuthLoading(true);

    try {
      let warningText = "";
      const email = normalizeEmail(registerData.email);
      if (!isSluEmail(email)) {
        throw new Error("Only @slu.edu email addresses can register.");
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: registerData.password,
        options: {
          data: {
            full_name: registerData.fullName,
            username: registerData.username,
            role: registerData.role,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      const userId = data.user?.id;
      const hasSession = Boolean(data.session);
      let avatarUrl = "";

      if (avatarFile && userId && hasSession) {
        avatarUrl = await uploadAvatarFile(avatarFile, userId);
      }

      if (userId && hasSession) {
        try {
          await updateProfile(userId, {
            username: registerData.username,
            full_name: registerData.fullName,
            role: registerData.role,
            avatar_url: avatarUrl || null,
          });
        } catch (updateError) {
          warningText =
            updateError.message ||
            "Account created, but profile details will sync after login.";
        }
      } else if (!hasSession) {
        warningText =
          "Account created. Verify your email, then sign in to finish profile and avatar upload.";
      }

      setRegisterMessage({
        type: warningText ? "warning" : "success",
        text: warningText
          ? warningText
          : "Registration complete. Check your SLU email to verify and sign in.",
      });
    } catch (error) {
      setRegisterMessage({
        type: "error",
        text: error.message || "Unable to complete registration.",
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    resetMessages();
    setAuthLoading(true);
    await supabase.auth.signOut();
    setAuthLoading(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_40%,#e2e8f0_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
            SLU Campus Bytes
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold text-slate-900">
              Secure access for the SLU community
            </h1>
            <p className="max-w-2xl text-base text-slate-600">
              Register with your official SLU email, upload your avatar, and
              confirm your details before joining the campus network.
            </p>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-white/60 bg-white/80 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  {mode === "login" ? "Sign in" : "Create your account"}
                </h2>
                <p className="text-sm text-slate-500">
                  {mode === "login"
                    ? "Use your SLU email or username to continue."
                    : "Multi-step registration keeps your profile complete."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                onClick={() => {
                  resetMessages();
                  setMode(mode === "login" ? "register" : "login");
                  setRegisterStep(1);
                }}
              >
                {mode === "login" ? "Need an account?" : "Back to login"}
              </button>
            </div>

            {mode === "login" && (
              <form className="mt-8 flex flex-col gap-5" onSubmit={handleLogin}>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Username or SLU email
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                    placeholder="billiken23 or name@slu.edu"
                    value={loginIdentifier}
                    onChange={(event) => setLoginIdentifier(event.target.value)}
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Password
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                    placeholder="Enter your password"
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                  />
                </label>

                {authMessage.text && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-sm ${{
                      error: "border-rose-200 bg-rose-50 text-rose-700",
                      success: "border-emerald-200 bg-emerald-50 text-emerald-700",
                      info: "border-blue-200 bg-blue-50 text-blue-700",
                    }[authMessage.type]}`}
                  >
                    {authMessage.text}
                  </div>
                )}

                <button
                  className="mt-2 rounded-xl bg-slate-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  type="submit"
                  disabled={authLoading}
                >
                  {authLoading ? "Signing in..." : "Sign in"}
                </button>
              </form>
            )}

            {mode === "register" && (
              <div className="mt-8 flex flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                  {registrationSteps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-medium ${
                        registerStep === step.id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                        {step.id}
                      </span>
                      {step.title}
                    </div>
                  ))}
                </div>

                {registerStep === 1 && (
                  <div className="grid gap-4">
                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Role
                      <select
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                        value={registerData.role}
                        onChange={(event) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            role: event.target.value,
                          }))
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Full name
                      <input
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                        placeholder="Alex Billiken"
                        value={registerData.fullName}
                        onChange={(event) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            fullName: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Username
                      <input
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                        placeholder="billiken23"
                        value={registerData.username}
                        onChange={(event) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            username: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      SLU email
                      <input
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                        placeholder="name@slu.edu"
                        value={registerData.email}
                        onChange={(event) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Password
                      <input
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                        placeholder="At least 8 characters"
                        type="password"
                        value={registerData.password}
                        onChange={(event) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            password: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                      Confirm password
                      <input
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
                        placeholder="Re-enter your password"
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(event) =>
                          setRegisterData((prev) => ({
                            ...prev,
                            confirmPassword: event.target.value,
                          }))
                        }
                      />
                    </label>

                    {registerMessage.text && (
                      <div
                        className={`rounded-xl border px-4 py-3 text-sm ${{
                          error: "border-rose-200 bg-rose-50 text-rose-700",
                          warning:
                            "border-amber-200 bg-amber-50 text-amber-700",
                          success:
                            "border-emerald-200 bg-emerald-50 text-emerald-700",
                        }[registerMessage.type]}`}
                      >
                        {registerMessage.text}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        Your SLU email is required for access.
                      </p>
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        onClick={handleStepOneNext}
                        disabled={authLoading}
                      >
                        {authLoading ? "Checking..." : "Continue"}
                      </button>
                    </div>
                  </div>
                )}

                {registerStep === 2 && (
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                      <div className="mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Avatar preview"
                            className="h-24 w-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl text-slate-400">+</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        Upload a profile photo to personalize your SLU presence.
                      </p>
                    </div>

                    <input
                      type="file"
                      accept="image/*"
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
                      onChange={(event) =>
                        setAvatarFile(event.target.files?.[0] ?? null)
                      }
                    />

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
                        onClick={() => setRegisterStep(1)}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
                        onClick={() => setRegisterStep(3)}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {registerStep === 3 && (
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 className="text-base font-semibold text-slate-800">
                        Confirm your details
                      </h3>
                      <dl className="mt-4 grid gap-3 text-sm">
                        {registerSummary.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-6"
                          >
                            <dt className="text-slate-500">{item.label}</dt>
                            <dd className="text-right font-medium text-slate-800">
                              {item.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {registerMessage.text && (
                      <div
                        className={`rounded-xl border px-4 py-3 text-sm ${{
                          error: "border-rose-200 bg-rose-50 text-rose-700",
                          warning:
                            "border-amber-200 bg-amber-50 text-amber-700",
                          success:
                            "border-emerald-200 bg-emerald-50 text-emerald-700",
                        }[registerMessage.type]}`}
                      >
                        {registerMessage.text}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
                        onClick={() => setRegisterStep(2)}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                        onClick={handleRegister}
                        disabled={authLoading}
                      >
                        {authLoading ? "Creating..." : "Create account"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <h3 className="text-lg font-semibold text-slate-900">
                Access status
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Only verified SLU community members can authenticate. We enforce
                the @slu.edu domain and verify accounts before granting access.
              </p>

              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Session</span>
                  <span className="font-medium text-slate-800">
                    {session ? "Active" : "Not signed in"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Domain</span>
                  <span className="font-medium text-slate-800">@slu.edu</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Login options</span>
                  <span className="font-medium text-slate-800">
                    Email or username
                  </span>
                </div>
              </div>

              {session && (
                <button
                  type="button"
                  className="mt-5 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
                  onClick={handleLogout}
                  disabled={authLoading}
                >
                  {authLoading ? "Signing out..." : "Sign out"}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
              <h3 className="text-lg font-semibold text-slate-900">
                Registration checklist
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Use your official SLU email.</li>
                <li>Pick a unique campus username.</li>
                <li>Upload an avatar for recognition.</li>
                <li>Confirm your details before joining.</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
