function formatEventDate(eventDate) {
  if (!eventDate) return "Date TBD";

  const parsed = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return eventDate;

  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function EventCard({
  event,
  onOpen,
  onAddToCalendar,
  actionLabel = "Add to Calendar",
  isCalendarActionVisible = true,
}) {
  const handleAddToCalendar = (clickEvent) => {
    clickEvent.stopPropagation();
    onAddToCalendar(event);
  };

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <button
        type="button"
        onClick={() => onOpen(event)}
        className="block w-full flex-1 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
      >
        <div className="aspect-[16/9] w-full bg-slate-100">
          {event.image ? (
            <img
              src={event.image}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-100 via-white to-emerald-100 text-sm font-semibold text-slate-500">
              Campus Event
            </div>
          )}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {formatEventDate(event.eventDate)}
          </p>
          <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">
            {event.title || "Untitled event"}
          </h2>
        </div>
      </button>
      {isCalendarActionVisible && (
        <div className="mt-auto flex justify-end border-t border-slate-100 p-4 pt-3">
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </article>
  );
}

export { formatEventDate };
export default EventCard;
