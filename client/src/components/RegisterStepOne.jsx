const messageStyles = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function RegisterStepOne({
  registerData,
  setRegisterData,
  registerMessage,
  authLoading,
  roleOptions,
  onContinue,
}) {
  return (
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
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageStyles[registerMessage.type]
          }`}
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
          onClick={onContinue}
          disabled={authLoading}
        >
          {authLoading ? "Checking..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default RegisterStepOne;
