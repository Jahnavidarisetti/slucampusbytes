const messageStyles = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
};

function LoginForm({
  loginIdentifier,
  setLoginIdentifier,
  loginPassword,
  setLoginPassword,
  authMessage,
  authLoading,
  onSubmit,
}) {
  return (
    <form className="mt-8 flex flex-col gap-5" onSubmit={onSubmit}>
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
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageStyles[authMessage.type]
          }`}
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
  );
}

export default LoginForm;
