export default function OrganizationStat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-lg font-semibold leading-tight text-slate-900">
        {Number(value ?? 0).toLocaleString()}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
