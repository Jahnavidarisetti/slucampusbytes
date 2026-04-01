const messageStyles = {
  error: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function RegisterStepThree({
  registerSummary,
  registerMessage,
  authLoading,
  onBack,
  onSubmit,
}) {
  return (
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
          className={`rounded-xl border px-4 py-3 text-sm ${
            messageStyles[registerMessage.type]
          }`}
        >
          {registerMessage.text}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600"
          onClick={onBack}
        >
          Back
        </button>
        <button
          type="button"
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          onClick={onSubmit}
          disabled={authLoading}
        >
          {authLoading ? "Creating..." : "Create account"}
        </button>
      </div>
    </div>
  );
}

export default RegisterStepThree;
