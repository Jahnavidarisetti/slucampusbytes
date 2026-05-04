import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import AuthPage from "./pages/AuthPage";
import OrganizationDetailsPage from "./pages/OrganizationDetailsPage";
import { supabase } from "./supabaseClient";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import OrganizationsPage from "./pages/OrganizationsPage";
import Settings from "./pages/Settings";

function RequireAuth({ children }) {
  const location = useLocation();
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(data.session ?? null);
      }
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession ?? null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700">
        Loading session...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <App />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations/:orgId"
          element={
            <RequireAuth>
              <OrganizationDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/organizations"
          element={
            <RequireAuth>
              <OrganizationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <UserProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <RequireAuth>
              <EditProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<AuthPage initialMode="login" />} />
        <Route path="/register" element={<AuthPage initialMode="register" />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
