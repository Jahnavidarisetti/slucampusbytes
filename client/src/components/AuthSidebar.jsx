function AuthSidebar({ session, authLoading, onLogout }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <h3 className="text-lg font-semibold text-slate-900">Access status</h3>
        <p className="mt-2 text-sm text-slate-600">
          Only verified SLU community members can authenticate. We enforce the
          @slu.edu domain and verify accounts before granting access.
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
            <span className="font-medium text-slate-800">Email or username</span>
          </div>
        </div>

        {session && (
          <button
            type="button"
            className="mt-5 w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300"
            onClick={onLogout}
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
  );
}

export default AuthSidebar;
