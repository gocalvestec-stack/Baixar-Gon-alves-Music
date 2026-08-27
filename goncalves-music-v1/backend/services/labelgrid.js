const BASE_URL = (process.env.LABELGRID_BASE_URL || "https://api.labelgrid.com/api/public").replace(/\/$/, "");
const TOKEN = process.env.LABELGRID_API_TOKEN;

function requireToken() {
  if (!TOKEN) {
    throw new Error("LABELGRID_API_TOKEN não configurado no backend.");
  }
}

async function lgRequest(path, options = {}) {
  requireToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!response.ok) {
    const message = data?.message || data?.error || `LabelGrid HTTP ${response.status}`;
    const err = new Error(message);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

export async function getMe() {
  return lgRequest("/me");
}

export async function listArtists() {
  return lgRequest("/artists");
}

export async function createArtist(payload) {
  return lgRequest("/artists", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function listReleases(params = {}) {
  const query = new URLSearchParams(params).toString();
  return lgRequest(`/releases${query ? `?${query}` : ""}`);
}

export async function getRelease(id) {
  return lgRequest(`/releases/${encodeURIComponent(id)}`);
}

export async function createRelease(payload) {
  return lgRequest("/releases", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateRelease(id, payload) {
  return lgRequest(`/releases/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function validateRelease(id) {
  return lgRequest(`/releases/${encodeURIComponent(id)}/validate`, {
    method: "POST"
  });
}

export async function distributeRelease(id, payload = {}) {
  return lgRequest(`/releases/${encodeURIComponent(id)}/distribute`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deliveryStatus(id) {
  return lgRequest(`/releases/${encodeURIComponent(id)}/delivery-status`);
}

export async function createTrack(payload) {
  return lgRequest("/tracks", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateTrack(id, payload) {
  return lgRequest(`/tracks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function getTrack(id) {
  return lgRequest(`/tracks/${encodeURIComponent(id)}`);
}

export async function getDistroOutlets() {
  return lgRequest("/distro-outlets");
}

export async function getWebhookEventTypes() {
  return lgRequest("/webhooks/event-types");
}
