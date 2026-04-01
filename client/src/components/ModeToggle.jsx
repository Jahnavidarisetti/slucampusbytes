function ModeToggle({ mode, onToggle }) {
  return (
    <button
      type="button"
      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
      onClick={onToggle}
    >
      {mode === "login" ? "Need an account?" : "Back to login"}
    </button>
  );
}

export default ModeToggle;
