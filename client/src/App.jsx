function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 flex justify-center">
      <div className="max-w-[1400px] w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 shadow-[0_10px_40px_rgba(15,23,42,0.15)] border border-white/70">
        <div className="grid grid-cols-12 gap-4 p-6 h-[calc(100vh-64px)]">
          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full">
              <div className="h-4 w-16 rounded bg-slate-200/80 mb-4" />
              <div className="space-y-3">
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
              </div>
            </div>
          </aside>

          <main className="col-span-12 lg:col-span-8">
            <div className="rounded-md bg-white/70 border border-slate-200 h-full relative overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="h-28 rounded bg-slate-200/80" />
                <div className="h-28 rounded bg-slate-200/80" />
                <div className="h-28 rounded bg-slate-200/80" />
                <div className="h-28 rounded bg-slate-200/80" />
                <div className="h-28 rounded bg-slate-200/80" />
                <div className="h-28 rounded bg-slate-200/80" />
              </div>
            </div>
          </main>

          <aside className="col-span-12 lg:col-span-2">
            <div className="rounded-md bg-white/70 border border-slate-200 p-4 h-full">
              <div className="h-4 w-20 rounded bg-slate-200/80 mb-4" />
              <div className="space-y-3">
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
                <div className="h-12 rounded bg-slate-200/80" />
              </div>
            </div>
          </aside>
        </div>

        <div className="border-t border-slate-200 bg-slate-100/80 px-6 py-3 flex items-center gap-3 h-16">
          <div className="h-8 w-8 rounded bg-slate-300/80" />
          <div className="h-8 w-32 rounded bg-slate-300/70" />
          <div className="ml-auto flex gap-2">
            <div className="h-6 w-6 rounded bg-slate-300/70" />
            <div className="h-6 w-6 rounded bg-slate-300/70" />
            <div className="h-6 w-6 rounded bg-slate-300/70" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
