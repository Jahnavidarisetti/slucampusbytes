import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalendarPage from "../src/pages/CalendarPage";
import { fetchCalendarEvents } from "../src/api/calendar";
import { supabase } from "../src/supabaseClient";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock("../src/api/calendar", () => ({
  fetchCalendarEvents: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

beforeEach(() => {
  fetchCalendarEvents.mockReset();
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "student-1" } } },
  });
});

describe("CalendarPage", () => {
  it("displays saved calendar events", async () => {
    fetchCalendarEvents.mockResolvedValue([
      {
        postId: "post-1",
        title: "Career Fair",
        eventDate: "2026-05-20",
        image: "https://example.com/career.png",
      },
    ]);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Career Fair")).toBeInTheDocument();
    expect(fetchCalendarEvents).toHaveBeenCalledWith("student-1");
    expect(screen.getByRole("button", { name: "View Post" })).toBeInTheDocument();
  });
});
