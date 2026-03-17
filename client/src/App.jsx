function App() {
  return (
    <div className="min-h-screen bg-gray-200 flex justify-center">

      {/* Main Container */}
      <div className="max-w-[1400px] w-full bg-white shadow-lg min-h-screen">

        {/* Header */}
        <header className="bg-blue-600 text-white p-4 text-xl font-semibold">
          CampusBytes
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-12 gap-4 p-4">

          {/* Left Sidebar */}
          <aside className="col-span-3 bg-gray-100 p-4 rounded">
            Sidebar
          </aside>

          {/* Main Content */}
          <main className="col-span-6 bg-gray-50 p-4 rounded">
            Feed Area
          </main>

          {/* Right Sidebar */}
          <aside className="col-span-3 bg-gray-100 p-4 rounded">
            Notifications
          </aside>

        </div>

      </div>
    </div>
  )
}

export default App