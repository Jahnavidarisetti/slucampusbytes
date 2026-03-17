function App() {
  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">

      <div className="max-w-[1400px] w-full bg-white shadow-lg min-h-screen">

        <header className="bg-blue-600 text-white p-4 text-xl font-semibold">
          CampusBytes
        </header>

        <div className="grid grid-cols-12 gap-4 p-4">

          <aside className="col-span-3 bg-gray-100 p-4 rounded">
            Sidebar
          </aside>

          <main className="col-span-6 bg-gray-50 p-4 rounded">
            Feed Area
          </main>

          <aside className="col-span-3 bg-gray-100 p-4 rounded">
            Notifications
          </aside>

        </div>

      </div>
    </div>
  )
}

export default App