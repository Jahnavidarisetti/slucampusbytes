import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  checkUsernameAvailable,
  isSluEmail,
  normalizeEmail,
  resolveEmailFromIdentifier,
  updateProfile,
  uploadAvatarFile,
  validatePassword,
  validateUsername,
} from "../lib/supabaseAuth";
import PageHeader from "../components/PageHeader";
import ModeToggle from "../components/ModeToggle";
import LoginForm from "../components/LoginForm";
import RegisterWizard from "../components/RegisterWizard";
import AuthSidebar from "../components/AuthSidebar";

const roleOptions = ["Student", "Organization"];

const registrationSteps = [
  { id: 1, title: "Role & Details" },
  { id: 2, title: "Avatar Upload" },
  { id: 3, title: "Confirmation" },
];

function AuthPage({ initialMode = "login" }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState({ type: "", text: "" });

  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerStep, setRegisterStep] = useState(1);
  const [registerData, setRegisterData] = useState({
    role: roleOptions[0],
    fullName: "",
    organizationDescription: "",
    studentDescription: "",
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
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

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

  const registerSummary = useMemo(() => {
    const baseSummary = [
      { label: "Role", value: registerData.role },
      {
        label:
          registerData.role === "Organization"
            ? "Organization name"
            : "Full name",
        value: registerData.fullName || "-",
      },
    ];

    if (registerData.role === "Organization") {
      baseSummary.push({
        label: "Description",
        value: registerData.organizationDescription || "-",
      });
    }

    return [
      ...baseSummary,
      { label: "Username", value: registerData.username || "-" },
      { label: "Email", value: registerData.email || "-" },
      {
        label: "Avatar",
        value: avatarFile ? avatarFile.name : "No avatar selected",
      },
    ];
  }, [registerData, avatarFile]);

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
        navigate("/");
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
      issues.push(
        registerData.role === "Organization"
          ? "Enter your organization name."
          : "Enter your full name."
      );
    }

    if (
      registerData.role === "Organization" &&
      !registerData.organizationDescription.trim()
    ) {
      issues.push("Enter a short organization description.");
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
            organization_description:
              registerData.role === "Organization"
                ? registerData.organizationDescription
                : null,
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
            organization_description:
              registerData.role === "Organization"
                ? registerData.organizationDescription
                : null,
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

      if (hasSession) {
        navigate("/");
      }
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

  const handleModeToggle = () => {
    resetMessages();
    const nextMode = mode === "login" ? "register" : "login";
    setMode(nextMode);
    setRegisterStep(1);
    navigate(nextMode === "login" ? "/login" : "/register");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_40%,#e2e8f0_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <PageHeader />

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
              <ModeToggle mode={mode} onToggle={handleModeToggle} />
            </div>

            {mode === "login" && (
              <LoginForm
                loginIdentifier={loginIdentifier}
                setLoginIdentifier={setLoginIdentifier}
                loginPassword={loginPassword}
                setLoginPassword={setLoginPassword}
                authMessage={authMessage}
                authLoading={authLoading}
                onSubmit={handleLogin}
              />
            )}

            {mode === "register" && (
              <RegisterWizard
                registerStep={registerStep}
                setRegisterStep={setRegisterStep}
                registerData={registerData}
                setRegisterData={setRegisterData}
                registerMessage={registerMessage}
                authLoading={authLoading}
                roleOptions={roleOptions}
                registrationSteps={registrationSteps}
                registerSummary={registerSummary}
                avatarPreview={avatarPreview}
                onStepOneNext={handleStepOneNext}
                onRegister={handleRegister}
                onAvatarChange={(event) =>
                  setAvatarFile(event.target.files?.[0] ?? null)
                }
              />
            )}
          </section>

          <AuthSidebar
            session={session}
            authLoading={authLoading}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
