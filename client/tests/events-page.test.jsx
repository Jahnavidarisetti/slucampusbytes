import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventsPage from "../src/pages/EventsPage";
import { fetchEventPosts } from "../src/api/posts";
import {
  fetchCalendarEvents,
  removeCalendarEvent,
  saveCalendarEvent,
} from "../src/api/calendar";
import { supabase } from "../src/supabaseClient";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../src/api/posts", () => ({
  fetchEventPosts: vi.fn(),
}));

vi.mock("../src/api/calendar", () => ({
  fetchCalendarEvents: vi.fn(),
  removeCalendarEvent: vi.fn(),
  saveCalendarEvent: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

beforeEach(() => {
  navigate.mockReset();
  fetchEventPosts.mockReset();
  fetchCalendarEvents.mockReset();
  removeCalendarEvent.mockReset();
  saveCalendarEvent.mockReset();
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "student-1" } } },
  });
  fetchCalendarEvents.mockResolvedValue([]);
  removeCalendarEvent.mockResolvedValue({ removed: true });
});

describe("EventsPage", () => {
  it("filters active and expired events in chronological order and opens post details", async () => {
    fetchEventPosts.mockResolvedValue([
      {
        id: "later-post",
        title: "Late Night Breakfast",
        eventDate: "2026-05-20",
        image: "https://example.com/late.jpg",
      },
      {
        id: "early-post",
        title: "Morning Meetup",
        eventDate: "2026-05-10",
        image: null,
      },
      {
        id: "expired-later-post",
        title: "Old Game Night",
        eventDate: "2000-05-20",
        image: null,
      },
      {
        id: "expired-early-post",
        title: "Old Service Day",
        eventDate: "2000-05-10",
        image: null,
      },
    ]);

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Morning Meetup")).toBeInTheDocument();
    expect(screen.queryByText("Old Service Day")).not.toBeInTheDocument();
    const activeHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(activeHeadings[0]).toHaveTextContent("Morning Meetup");
    expect(activeHeadings[1]).toHaveTextContent("Late Night Breakfast");

    fireEvent.click(screen.getByRole("button", { name: "Expired" }));
    const expiredHeadings = screen.getAllByRole("heading", { level: 2 });
    expect(expiredHeadings[0]).toHaveTextContent("Old Service Day");
    expect(expiredHeadings[1]).toHaveTextContent("Old Game Night");

    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    fireEvent.click(screen.getByRole("button", { name: /late night breakfast/i }));
    expect(navigate).toHaveBeenCalledWith("/posts/later-post");
  });

  it("adds an event to calendar for the current user", async () => {
    fetchEventPosts.mockResolvedValue([
      {
        id: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      },
    ]);
    saveCalendarEvent.mockResolvedValue({ alreadyAdded: false });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add to Calendar" }));

    await waitFor(() =>
      expect(saveCalendarEvent).toHaveBeenCalledWith("student-1", {
        postId: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      })
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/Service Day added to Calendar/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Added to Calendar" })
    ).toBeInTheDocument();
  });

  it("shows when an event is already on the calendar", async () => {
    fetchEventPosts.mockResolvedValue([
      {
        id: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      },
    ]);
    saveCalendarEvent.mockResolvedValue({ alreadyAdded: true });

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Add to Calendar" }));

    expect(
      await screen.findByText(/Service Day is already in your Calendar/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Added to Calendar" })
    ).toBeInTheDocument();
  });

  it("labels events that were already saved to the calendar", async () => {
    fetchEventPosts.mockResolvedValue([
      {
        id: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      },
    ]);
    fetchCalendarEvents.mockResolvedValue([
      {
        postId: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      },
    ]);

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("button", { name: "Added to Calendar" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add to Calendar" })
    ).not.toBeInTheDocument();
  });

  it("removes an already saved event from the calendar when clicked again", async () => {
    fetchEventPosts.mockResolvedValue([
      {
        id: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      },
    ]);
    fetchCalendarEvents.mockResolvedValue([
      {
        postId: "event-post",
        title: "Service Day",
        eventDate: "2026-05-12",
        image: null,
      },
    ]);

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Added to Calendar" })
    );

    await waitFor(() =>
      expect(removeCalendarEvent).toHaveBeenCalledWith("student-1", "event-post")
    );
    expect(
      screen.getByText(/Service Day removed from Calendar/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add to Calendar" })
    ).toBeInTheDocument();
  });

  it("does not show the calendar action for past events", async () => {
    fetchEventPosts.mockResolvedValue([
      {
        id: "past-event",
        title: "Old Service Day",
        eventDate: "2000-01-01",
        image: null,
      },
    ]);

    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole("button", { name: "Expired" }));
    expect(await screen.findByText("Old Service Day")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /calendar/i })
    ).not.toBeInTheDocument();
  });
});
