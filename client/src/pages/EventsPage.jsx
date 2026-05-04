import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard";
import { saveCalendarEvent } from "../api/calendar";
import { fetchEventPosts } from "../api/posts";
import { supabase } from "../supabaseClient";

function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [sortDirection, setSortDirection] = useState("asc");
  const [sessionUserId, setSessionUserId] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const [{ data }, eventPosts] = await Promise.all([
          supabase.auth.getSession(),
          fetchEventPosts(),
        ]);

        if (!isMounted) return;
        setSessionUserId(data.session?.user?.id ?? null);
        setEvents(eventPosts);
        setError("");
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load events.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const comparison = String(a.eventDate).localeCompare(String(b.eventDate));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [events, sortDirection]);

  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events.filter((event) => {
      const parsed = new Date(`${event.eventDate}T00:00:00`);
      return !Number.isNaN(parsed.getTime()) && parsed >= today;
    }).length;
  }, [events]);

  const handleAddToCalendar = async (event) => {
    try {
      await saveCalendarEvent(sessionUserId, {
        postId: event.id,
        title: event.title,
        eventDate: event.eventDate,
        image: event.image,
      });
      setStatusMessage(`${event.title || "Event"} added to Calendar.`);
      setError("");
    } catch (saveError) {
      setError(saveError.message || "Unable to add event to Calendar.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-blue-100 to-slate-200 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Back to Dashboard
          </button>

          <div className="flex flex-wrap gap-2 text-sm text-slate-700">
            <span className="rounded-full bg-white/85 px-3 py-1 shadow-sm">
              {events.length} events
            </span>
            <span className="rounded-full bg-white/85 px-3 py-1 shadow-sm">
              {upcomingCount} upcoming
            </span>
          </div>
        </div>

        <section className="rounded-md border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900">
              Events
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Browse campus posts with event dates and add the ones you want to
              your Calendar.
            </p>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            {[
              { value: "asc", label: "Oldest" },
              { value: "desc", label: "Latest" },
            ].map((filter) => {
              const isActive = sortDirection === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSortDirection(filter.value)}
                  aria-pressed={isActive}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          {statusMessage && (
            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {statusMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="sr-only" aria-live="polite">
                Loading events...
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="aspect-[16/9] animate-pulse rounded-md bg-slate-200" />
                  <div className="mt-4 space-y-3 animate-pulse">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="h-6 w-44 rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedEvents.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/85 p-8 text-center text-slate-600">
              No dated events have been posted yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onOpen={() => navigate(`/posts/${event.id}`)}
                  onAddToCalendar={handleAddToCalendar}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default EventsPage;
