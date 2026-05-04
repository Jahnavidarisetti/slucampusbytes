import { useNavigate } from "react-router-dom";
import OrganizationSearchPage from "../components/OrganizationSearchPage";

export default function OrganizationSearchRoutePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Dashboard
        </button>

        <h1 className="mt-6 text-2xl font-semibold text-slate-900"> Organizations</h1>
        <p className="mt-2 text-sm text-slate-600">
          Search, sort, and join organizations. Use the header search to open a specific org profile.
        </p>

        <div className="mt-6">
          <OrganizationSearchPage />
        </div>
      </div>
    </div>
  );
}
