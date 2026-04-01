function PageHeader() {
  return (
    <header className="flex flex-col gap-4">
      <p className="text-sm uppercase tracking-[0.4em] text-slate-500">
        SLU Campus Bytes
      </p>
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold text-slate-900">
          Secure access for the SLU community
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          Register with your official SLU email, upload your avatar, and confirm
          your details before joining the campus network.
        </p>
      </div>
    </header>
  );
}

export default PageHeader;
