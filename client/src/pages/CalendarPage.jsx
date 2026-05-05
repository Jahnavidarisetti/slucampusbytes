import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCalendarEvents } from "../api/calendar";
import { formatEventDate } from "../components/EventCard";
import { supabase } from "../supabaseClient";

function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadCalendar() {
      try {
        setIsLoading(true);
        const { data } = await supabase.auth.getSession();
        const savedEvents = await fetchCalendarEvents(data.session?.user?.id ?? null);
        if (isMounted) {
          setEvents(savedEvents);
          setError("");
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message || "Unable to load Calendar.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadCalendar();
    return () => {
      isMounted = false;
    };
  }, []);

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
              {events.length} saved events
            </span>
          </div>
        </div>

        <section className="rounded-md border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-slate-900">
              Calendar
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review the campus events you saved from event posts.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="sr-only" aria-live="polite">
                Loading Calendar...
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="h-24 animate-pulse rounded-md bg-slate-200" />
                  <div className="mt-4 space-y-3 animate-pulse">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="h-6 w-44 rounded-full bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/85 p-8 text-center text-slate-600">
              No saved events yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <article
                  key={event.postId}
                  className="flex h-full flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
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
                        Saved Event
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {formatEventDate(event.eventDate)}
                    </p>
                    <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-900">
                      {event.title}
                    </h2>
                    <div className="mt-auto flex justify-end pt-5">
                      <button
                        type="button"
                        onClick={() => navigate(`/posts/${event.postId}`)}
                        className="rounded-full bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900"
                      >
                        View Post
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CalendarPage;
