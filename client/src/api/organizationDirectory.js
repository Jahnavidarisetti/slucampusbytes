const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/**
 * Full organization record from the directory API (includes followerCount on detail).
 */
export async function fetchOrganizationDirectoryDetail(organizationId) {
  const response = await fetch(`${API_BASE}/api/organizations/${organizationId}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to load organization details.");
  }

  return payload;
}
