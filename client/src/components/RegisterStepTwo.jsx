function RegisterStepTwo({ avatarPreview, onFileChange, onBack, onContinue }) {
  return (
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
        onChange={onFileChange}
      />

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
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default RegisterStepTwo;
