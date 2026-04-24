import {
  stepsChart,
  setStepsChart,
  caloriesChart,
  setCaloriesChart,
  waterChart,
  setWaterChart,
  sleepChart,
  setSleepChart
} from "./state.js";

const API_BASE = "http://localhost:3000";
let stepsAuthBlocked = false;

/* Auth / API Core */

function getToken() {
  return localStorage.getItem("accessToken");
}

async function apiRequest(method, path, body) {
  const token = getToken();

  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
    throw new Error("Unauthorized (token invalid/expired). Login again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Request failed (${response.status})`);
  }

  return data;
}

async function fetchMetricSeries({ name, unit, bucket = "daily" }) {
  const token = getToken();
  if (!token) throw new Error("Missing accessToken in localStorage");

  const url = new URL(`${API_BASE}/reports/metric-series`);
  url.searchParams.set("name", name);
  if (unit) url.searchParams.set("unit", unit);
  url.searchParams.set("bucket", bucket);

  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (r.status === 401) {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("currentUser");
    throw new Error("Unauthorized (token invalid/expired). Login again.");
  }

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message ?? "Request failed");

  return data;
}

/* Date Helpers */

function getLocalISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getUtcDayWindowFromLocalDate(localISO) {
  const [y, m, d] = localISO.split("-").map(Number);
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endLocal = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  return {
    from: startLocal.toISOString(),
    to: endLocal.toISOString(),
  };
}

function minutesBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;

  const start = new Date(startISO);
  const end = new Date(endISO);
  const ms = end.getTime() - start.getTime();

  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 60000);
}

function formatSeriesLabel(iso, filterType) {
  const d = new Date(iso);
  const tz = { timeZone: "Europe/London" };

  if (filterType === "monthly") {
    return d.toLocaleString("en-GB", { month: "short", year: "numeric", ...tz });
  }

  if (filterType === "yearly") {
    return d.toLocaleString("en-GB", { year: "numeric", ...tz });
  }

  return d.toLocaleDateString("en-GB", tz);
}

/* Type Guards / Normalization */

function isMetricLike(x) {
  if (!x || typeof x !== "object") return false;

  return (
    "metricType" in x ||
    "metricName" in x ||
    "metric" in x ||
    ("value" in x && ("unit" in x || "units" in x)) ||
    ("reading" in x && ("unit" in x || "units" in x)) ||
    ("category" in x && String(x.category).toLowerCase().includes("metric"))
  );
}

function isActivityLike(x) {
  if (!x || typeof x !== "object") return false;

  const hasType = typeof x.type === "string" && x.type.trim().length > 0;
  const hasStartedAt = typeof x.startedAt === "string" && x.startedAt.length > 0;

  if (isMetricLike(x)) return false;
  if (!hasType || !hasStartedAt) return false;

  const cleanType = x.type.trim().toLowerCase();

  if (["steps", "calories", "water", "sleep"].includes(cleanType)) {
    return false;
  }

  const mins = minutesBetween(x.startedAt, x.endedAt);
  if (mins === null) {
    return false;
  }

  return true;
}

function toUiActivity(dbActivity) {
  const mins = minutesBetween(dbActivity.startedAt, dbActivity.endedAt);
  return {
    id: dbActivity.id,
    activityType: dbActivity.type,
    duration: mins === null ? "—" : `${mins} minutes`,
    notes: dbActivity.notes ?? "",
    time: dbActivity.startedAt,
    latitude: dbActivity.latitude ?? null,
    longitude: dbActivity.longitude ?? null,
  };
}

function normalizeLocalActivity(activity) {
  const rawDuration = activity?.duration;
  const duration =
    typeof rawDuration === "number"
      ? `${rawDuration} minutes`
      : typeof rawDuration === "string" && /^\d+$/.test(rawDuration)
      ? `${rawDuration} minutes`
      : rawDuration || "—";

  return {
    kind: "activity",
    activityType: activity?.activityType ?? activity?.type ?? "Activity",
    duration,
    notes: activity?.notes ?? "",
    time: activity?.time ?? activity?.startedAt ?? new Date().toISOString(),
  };
}

/* Activities API */

async function createActivityToDb({ type, durationMinutes, notes, latitude, longitude }) {
  const startedAt = new Date();
  const mins = Number(durationMinutes);
  const cleanType = String(type ?? "").trim();

  const safeLatitude =
    typeof latitude === "number" && Number.isFinite(latitude) ? latitude : undefined;

  const safeLongitude =
    typeof longitude === "number" && Number.isFinite(longitude) ? longitude : undefined;

  const payload = {
    type: cleanType,
    startedAt: startedAt.toISOString(),
    notes: notes?.trim() || "",
    tags: cleanType ? [cleanType.toLowerCase()] : [],
    latitude: safeLatitude,
    longitude: safeLongitude,
  };

  if (Number.isFinite(mins) && mins > 0) {
    const endedAt = new Date(startedAt.getTime() + mins * 60000);
    payload.endedAt = endedAt.toISOString();
  }

  return apiRequest("POST", "/activities", payload);
}


async function fetchActivitiesFromDb({ from, to, type, take = 50, skip = 0 } = {}) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (type) qs.set("type", type);
  qs.set("take", String(take));
  qs.set("skip", String(skip));

  const res = await apiRequest("GET", `/activities?${qs.toString()}`);

  let items = [];

  if (Array.isArray(res)) {
    items = res;
  } else if (Array.isArray(res?.items)) {
    items = res.items;
  } else if (Array.isArray(res?.data)) {
    items = res.data;
  } else {
    throw new Error("Unexpected activities response shape");
  }

  return items.filter(isActivityLike);
}
async function fetchActivityWeather(activityId) {
  try {
    return await apiRequest("GET", `/activities/${activityId}/weather`);
  } catch (error) {
    console.error("Weather fetch failed:", error);
    return null;
  }
}
function formatWeather(weatherResponse) {
  if (!weatherResponse) return "Weather unavailable";
  if (weatherResponse.weather == null) return "No location saved";

  const temp = weatherResponse.weather.temperature;
  const code = weatherResponse.weather.weatherCode;

  const codeMap = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Light rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Rain showers",
    95: "Thunderstorm",
  };

  const label = codeMap[code] || "Unknown weather";

  if (temp === undefined || temp === null) {
    return label;
  }

  return `${temp}°C • ${label}`;
}
async function getActivitiesForUi({ from, to, type, take } = {}) {
  const token = getToken();

  if (token) {
    const items = await fetchActivitiesFromDb({ from, to, type, take });
    return items.map(toUiActivity);
  }

  return (JSON.parse(localStorage.getItem("activities")) || []).map(normalizeLocalActivity);
}

/* Metric Activity Helpers */

async function getOrCreateStepsActivityId() {
  const todayLocal = getLocalISODate();
  const { from, to } = getUtcDayWindowFromLocalDate(todayLocal);

  const qs = new URLSearchParams({
    type: "steps",
    from,
    to,
    take: "10",
    skip: "0",
  });

  const list = await apiRequest("GET", `/activities?${qs.toString()}`);
  const items = Array.isArray(list)
    ? list
    : Array.isArray(list?.items)
    ? list.items
    : Array.isArray(list?.data)
    ? list.data
    : [];

  if (items.length > 0) return items[0].id;

  const act = await apiRequest("POST", "/activities", {
    type: "steps",
    startedAt: new Date().toISOString(),
    notes: `Steps for ${todayLocal}`,
    tags: ["steps"],
  });

  return act.id;
}

async function saveStepsToDb(stepsCount) {
  const activityId = await getOrCreateStepsActivityId();

  return apiRequest("POST", `/activities/${activityId}/metrics`, {
    name: "steps",
    unit: "count",
    value: stepsCount,
    recordedAt: new Date().toISOString(),
  });
}

async function getOrCreateMetricActivityId(type) {
  const todayLocal = getLocalISODate();
  const { from, to } = getUtcDayWindowFromLocalDate(todayLocal);

  const qs = new URLSearchParams({
    type,
    from,
    to,
    take: "10",
    skip: "0",
  });

  const list = await apiRequest("GET", `/activities?${qs.toString()}`);
  const items = Array.isArray(list)
    ? list
    : Array.isArray(list?.items)
    ? list.items
    : Array.isArray(list?.data)
    ? list.data
    : [];

  if (items.length > 0) return items[0].id;

  const act = await apiRequest("POST", "/activities", {
    type,
    startedAt: new Date().toISOString(),
    notes: `${type} for ${todayLocal}`,
    tags: [type],
  });

  return act.id;
}

async function saveMetricToDb({ type, name, unit, value }) {
  const activityId = await getOrCreateMetricActivityId(type);

  return apiRequest("POST", `/activities/${activityId}/metrics`, {
    name,
    unit,
    value,
    recordedAt: new Date().toISOString(),
  });
}

/* Chart Helpers */

export function groupStepsDates(filterType, stepsList) {
  const grouped = {};

  stepsList.forEach((entry) => {
    const date = new Date(entry.date);
    let key;

    if (filterType === "monthly") {
      key = `${date.toLocaleString("en-GB", { month: "short" })} ${date.getFullYear()}`;
    } else if (filterType === "yearly") {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString("en-GB");
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

function groupCaloriesDates(filterType, caloriesList) {
  const grouped = {};

  caloriesList.forEach((entry) => {
    const date = new Date(entry.date);
    let key;

    if (filterType === "monthly") {
      key = `${date.toLocaleString("en-GB", { month: "short" })} ${date.getFullYear()}`;
    } else if (filterType === "yearly") {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString("en-GB");
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

function groupWaterDates(filterType, waterList) {
  const grouped = {};

  waterList.forEach((entry) => {
    const date = new Date(entry.date);
    let key;

    if (filterType === "monthly") {
      key = `${date.toLocaleString("en-GB", { month: "short" })} ${date.getFullYear()}`;
    } else if (filterType === "yearly") {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString("en-GB");
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

function groupSleepDates(filterType, sleepList) {
  const grouped = {};

  sleepList.forEach((entry) => {
    const date = new Date(entry.date);
    let key;

    if (filterType === "monthly") {
      key = `${date.toLocaleString("en-GB", { month: "short" })} ${date.getFullYear()}`;
    } else if (filterType === "yearly") {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString("en-GB");
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

/* Steps Chart */

export async function drawStepsChart(stepSize = 1000, filterType = "daily") {
  const canvas = document.getElementById("stepsChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  try {
    const series = await fetchMetricSeries({
      name: "steps",
      unit: "count",
      bucket: filterType,
    });

    const labels = (series.labels ?? []).map((iso) => formatSeriesLabel(iso, filterType));

    if (stepsChart) stepsChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Steps",
            data: series.values ?? [],
            borderWidth: 2.5,
            borderColor: "green",
            backgroundColor: "lightgreen",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } },
        },
      },
    });

    setStepsChart(chart);
  } catch (e) {
    console.error("Steps chart error:", e);

    if (String(e?.message || "").toLowerCase().includes("unauthorized")) {
      stepsAuthBlocked = true;
    }

    if (stepsChart) stepsChart.destroy();
    setStepsChart(null);
  }
}

async function drawCaloriesChart(stepSize = 100, filterType = "daily") {
  const canvas = document.getElementById("caloriesChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  try {
    const series = await fetchMetricSeries({
      name: "calories",
      unit: "kcal",
      bucket: filterType,
    });

    const labels = (series.labels ?? []).map((iso) => formatSeriesLabel(iso, filterType));

    if (caloriesChart) caloriesChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Calories",
            data: series.values ?? [],
            borderWidth: 2.5,
            borderColor: "red",
            backgroundColor: "pink",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } },
        },
      },
    });

    setCaloriesChart(chart);
  } catch (e) {
    console.error("Calories chart error:", e);
    if (caloriesChart) caloriesChart.destroy();
    setCaloriesChart(null);
  }
}

async function drawWaterChart(stepSize = 500, filterType = "daily") {
  const canvas = document.getElementById("waterChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  try {
    const series = await fetchMetricSeries({
      name: "water",
      unit: "ml",
      bucket: filterType,
    });

    const labels = (series.labels ?? []).map((iso) => formatSeriesLabel(iso, filterType));

    if (waterChart) waterChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Water Intake (ml)",
            data: series.values ?? [],
            borderWidth: 2.5,
            borderColor: "blue",
            backgroundColor: "lightblue",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } },
        },
      },
    });

    setWaterChart(chart);
  } catch (e) {
    console.error("Water chart error:", e);
    if (waterChart) waterChart.destroy();
    setWaterChart(null);
  }
}

async function drawSleepChart(stepSize = 1, filterType = "daily") {
  const canvas = document.getElementById("sleepChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  try {
    const series = await fetchMetricSeries({
      name: "sleep",
      unit: "hours",
      bucket: filterType,
    });

    const labels = (series.labels ?? []).map((iso) => formatSeriesLabel(iso, filterType));

    if (sleepChart) sleepChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Sleep Hours",
            data: series.values ?? [],
            borderWidth: 2.5,
            borderColor: "purple",
            backgroundColor: "rgba(180, 100, 255, 0.3)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } },
        },
      },
    });

    setSleepChart(chart);
  } catch (e) {
    console.error("Sleep chart error:", e);
    if (sleepChart) sleepChart.destroy();
    setSleepChart(null);
  }
}

/* Activity UI */

export function getActivityIcon(type) {
  const clean = (type ?? "").trim().toLowerCase();
  return {
    workout: "fa-dumbbell",
    running: "fa-person-running",
    cycling: "fa-bicycle",
    swimming: "fa-person-swimming",
    walking: "fa-person-walking",
    yoga: "fa-spa",
    gym: "fa-heart-pulse",
  }[clean] || "fa-clipboard-list";
}

function renderActivityCard(a) {
  const rawType = a.activityType || a.type || "Activity";
  const icon = getActivityIcon(rawType);

  return `
    <div class="activity-card">
      <header class="card-header">
        <div class="activity-header-left">
          <i class="fa-solid ${icon} activity-icon"></i>
          <span class="activity-title">${rawType}</span>
        </div>
        <span class="activity-date">${new Date(a.time).toLocaleDateString("en-GB")}</span>
      </header>
      <p><strong>Duration:</strong> ${a.duration || "—"}</p>
      <p><strong>Notes:</strong> ${a.notes || "None"}</p>
      <p><strong>Weather:</strong> ${a.weatherText || "Weather unavailable"}</p>
    </div>
  `;
}

function renderRecentActivityRow(a) {
  const rawType = a.activityType || a.type || "Activity";

  return `
    <div class="activity-row">
      <div>
        <div class="activity-title">${rawType}</div>
        <div class="activity-meta">${new Date(a.time).toLocaleDateString("en-GB")} • ${a.duration || "—"}</div>
      </div>
      <div class="activity-notes">${a.notes || ""}</div>
    </div>
  `;
}

async function displayActivities() {
  const container = document.getElementById("activitiesList");
  if (!container) return;

  container.innerHTML = "";

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  let activities = [];

  try {
    activities = await getActivitiesForUi({
      from: weekAgo.toISOString(),
      to: today.toISOString(),
      take: 50,
    });
  } catch (e) {
    console.error("Dashboard activities load failed:", e);

    if (getToken()) {
      container.innerHTML = `<p class="empty-state">Unable to load activities from database.</p>`;
      return;
    }

    activities = (JSON.parse(localStorage.getItem("activities")) || []).map(normalizeLocalActivity);
  }

  const recent = activities
    .filter((a) => {
      const type = String(a.activityType || "").trim().toLowerCase();
      return (
        new Date(a.time) >= weekAgo &&
        !["steps", "calories", "water", "sleep"].includes(type) &&
        a.duration &&
        a.duration !== "—"
      );
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 10);

  if (recent.length === 0) {
    container.innerHTML = `<p class="empty-state">No activities logged in the last 7 days.</p>`;
    return;
  }

  for (const item of recent) {
    let weatherText = "Weather unavailable";

    try {
      if (item.id) {
        const weatherData = await fetchActivityWeather(item.id);
        weatherText = formatWeather(weatherData);
      } else if (item.latitude != null && item.longitude != null) {
        weatherText = "Location saved locally";
      }
    } catch (error) {
      console.error("Weather display failed:", error);
    }

    container.innerHTML += renderActivityCard({
      ...item,
      weatherText,
    });
  }
}
async function displayRecentActivities() {
  const container = document.getElementById("recentActivities");
  if (!container) return;

  container.innerHTML = "";

  let activities = [];

  try {
    activities = await getActivitiesForUi({ take: 50 });
  } catch (e) {
    console.error("Recent activities load failed:", e);

    if (getToken()) {
      container.innerHTML = `<p class="empty-state">Unable to load recent activities from database.</p>`;
      return;
    }

    activities = (JSON.parse(localStorage.getItem("activities")) || []).map(normalizeLocalActivity);
  }

  const recent = activities
    .filter((a) => {
      const type = String(a.activityType || "").trim().toLowerCase();
      return (
        !["steps", "calories", "water", "sleep"].includes(type) &&
        a.duration &&
        a.duration !== "—"
      );
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<p class="empty-state">No recent activities.</p>`;
    return;
  }

  for (const a of recent) {
    let weatherText = "Weather unavailable";

    try {
      if (a.id) {
        const weatherData = await fetchActivityWeather(a.id);
        weatherText = formatWeather(weatherData);
      } else if (a.latitude != null && a.longitude != null) {
        weatherText = "Location saved locally";
      }
    } catch (error) {
      console.error("Recent weather display failed:", error);
    }

    container.innerHTML += renderActivityCard({
      ...a,
      weatherText,
    });
  }
}

async function displayAllActivities() {
  const container = document.getElementById("allActivitiesList");
  if (!container) return;

  container.innerHTML = "";

  let activities = [];

  try {
    activities = await getActivitiesForUi({ take: 50 });
  } catch (e) {
    console.error("All activities load failed:", e);

    if (getToken()) {
      container.innerHTML = `<p class="no-activity-message">Unable to load activities from database.</p>`;
      return;
    }

    activities = (JSON.parse(localStorage.getItem("activities")) || []).map(normalizeLocalActivity);
  }

  const sorted = activities
    .filter((a) => {
      const type = String(a.activityType || "").trim().toLowerCase();
      return (
        !["steps", "calories", "water", "sleep"].includes(type) &&
        a.duration &&
        a.duration !== "—"
      );
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  if (sorted.length === 0) {
    container.innerHTML = `<p class="no-activity-message">No activities recorded yet.</p>`;
    return;
  }

  sorted.forEach((a) => {
    container.innerHTML += renderActivityCard(a);
  });
}

/* Navbar / Auth Page */

async function loadNavbar() {
  const container = document.getElementById("navbar-container");
  if (!container) return;

  const response = await fetch("navbar.html");
  const html = await response.text();
  container.innerHTML = html;
}

function setAuthStatus(message) {
  const el = document.getElementById("authStatus");
  if (el) el.textContent = message;
}

function getCurrentUser() {
  const raw = localStorage.getItem("currentUser");
  return raw ? JSON.parse(raw) : null;
}

function saveAuth(authResponse) {
  localStorage.setItem("accessToken", authResponse.accessToken);
  localStorage.setItem("currentUser", JSON.stringify(authResponse.user));
  setAuthStatus(`Logged in as ${authResponse.user.email}`);
}

function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("currentUser");
  setAuthStatus("Logged out");
}

async function registerUser(name, email, password) {
  const data = await apiRequest("POST", "/auth/register", {
    name,
    email,
    password,
  });

  saveAuth(data);
  return data;
}

async function loginUser(email, password) {
  const data = await apiRequest("POST", "/auth/login", {
    email,
    password,
  });

  saveAuth(data);
  return data;
}

function initialiseAuthPage() {
  const existingUser = getCurrentUser();

  if (existingUser) {
    setAuthStatus(`Logged in as ${existingUser.email}`);
  } else {
    setAuthStatus("Not logged in");
  }

  document.getElementById("registerBtn")?.addEventListener("click", async () => {
    try {
      const name = document.getElementById("authName")?.value.trim() || "";
      const email = document.getElementById("authEmail")?.value.trim() || "";
      const password = document.getElementById("authPassword")?.value || "";

      await registerUser(name, email, password);
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  document.getElementById("loginBtn")?.addEventListener("click", async () => {
    try {
      const email = document.getElementById("authEmail")?.value.trim() || "";
      const password = document.getElementById("authPassword")?.value || "";

      await loginUser(email, password);
      window.location.href = "index.html";
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    clearAuth();
  });
}

/* Dashboard Init */

async function initDashboard() {
  document.getElementById("stepSizeSelect")?.addEventListener("change", function () {
    const filter = document.getElementById("dateFilterSelect")?.value || "daily";
    drawStepsChart(parseInt(this.value, 10), filter).catch(console.error);
  });

  document.getElementById("dateFilterSelect")?.addEventListener("change", function () {
    const stepSize = parseInt(document.getElementById("stepSizeSelect")?.value || "1000", 10);
    drawStepsChart(stepSize, this.value).catch(console.error);
  });

  document.getElementById("saveBtn1")?.addEventListener("click", async () => {
    const stepsInput = document.getElementById("steps");
    if (!stepsInput) return;

    const desired = Number(stepsInput.value);
    if (!Number.isFinite(desired) || desired < 0) return;

    await saveStepsToDb(desired);

    localStorage.setItem("stepsUpdatedAt", String(Date.now()));

    const stepSize = parseInt(document.getElementById("stepSizeSelect")?.value || "1000", 10);
    const filter = document.getElementById("dateFilterSelect")?.value || "daily";
    await drawStepsChart(stepSize, filter);

    stepsInput.value = "";
  });

  if (!stepsAuthBlocked) {
    drawStepsChart(1000, "daily").catch(console.error);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      drawStepsChart(1000, "daily").catch(console.error);
    }
  });

  window.addEventListener("focus", () => {
    drawStepsChart(1000, "daily").catch(console.error);
  });

  window.addEventListener("storage", (e) => {
    if (e.key === "stepsUpdatedAt") {
      const stepSize = parseInt(document.getElementById("stepSizeSelect")?.value || "1000", 10);
      const filter = document.getElementById("dateFilterSelect")?.value || "daily";
      drawStepsChart(stepSize, filter).catch(console.error);
    }
  });

  document.getElementById("calorieStepSizeSelect")?.addEventListener("change", function () {
    const filter = document.getElementById("calorieDateFilterSelect")?.value || "daily";
    drawCaloriesChart(parseInt(this.value, 10), filter).catch(console.error);
  });

  document.getElementById("calorieDateFilterSelect")?.addEventListener("change", function () {
    const stepSize = parseInt(document.getElementById("calorieStepSizeSelect")?.value || "100", 10);
    drawCaloriesChart(stepSize, this.value).catch(console.error);
  });

  document.getElementById("saveBtn2")?.addEventListener("click", async () => {
    const input = document.getElementById("calories");
    if (!input) return;

    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) return;

    await saveMetricToDb({
      type: "calories",
      name: "calories",
      unit: "kcal",
      value,
    });

    const stepSize = parseInt(document.getElementById("calorieStepSizeSelect")?.value || "100", 10);
    const filter = document.getElementById("calorieDateFilterSelect")?.value || "daily";

    await drawCaloriesChart(stepSize, filter);

    input.value = "";
  });

  drawCaloriesChart(100).catch(console.error);

  document.getElementById("waterStepSizeSelect")?.addEventListener("change", function () {
    const filter = document.getElementById("waterDateFilterSelect")?.value || "daily";
    drawWaterChart(parseInt(this.value, 10), filter).catch(console.error);
  });

  document.getElementById("waterDateFilterSelect")?.addEventListener("change", function () {
    const stepSize = parseInt(document.getElementById("waterStepSizeSelect")?.value || "500", 10);
    drawWaterChart(stepSize, this.value).catch(console.error);
  });

  document.getElementById("saveBtn3")?.addEventListener("click", async () => {
    const input = document.getElementById("water");
    if (!input) return;

    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) return;

    await saveMetricToDb({
      type: "water",
      name: "water",
      unit: "ml",
      value,
    });

    const stepSize = parseInt(document.getElementById("waterStepSizeSelect")?.value || "500", 10);
    const filter = document.getElementById("waterDateFilterSelect")?.value || "daily";

    await drawWaterChart(stepSize, filter);

    input.value = "";
  });

  drawWaterChart(500).catch(console.error);

  document.getElementById("sleepStepSizeSelect")?.addEventListener("change", function () {
    const filter = document.getElementById("sleepDateFilterSelect")?.value || "daily";
    drawSleepChart(parseInt(this.value, 10), filter).catch(console.error);
  });

  document.getElementById("sleepDateFilterSelect")?.addEventListener("change", function () {
    const stepSize = parseInt(document.getElementById("sleepStepSizeSelect")?.value || "1", 10);
    drawSleepChart(stepSize, this.value).catch(console.error);
  });

  document.getElementById("saveBtn4")?.addEventListener("click", async () => {
    const input = document.getElementById("sleepHours");
    if (!input) return;

    const value = Number(input.value);
    if (!Number.isFinite(value) || value < 0) return;

    await saveMetricToDb({
      type: "sleep",
      name: "sleep",
      unit: "hours",
      value,
    });

    const stepSize = parseInt(document.getElementById("sleepStepSizeSelect")?.value || "1", 10);
    const filter = document.getElementById("sleepDateFilterSelect")?.value || "daily";

    await drawSleepChart(stepSize, filter);

    input.value = "";
  });

  drawSleepChart(1).catch(console.error);

  document.getElementById("activityForm")?.addEventListener("submit", async function (event) {
  event.preventDefault();

  const typeInput = document.getElementById("activityType");
  const durationInput = document.getElementById("duration");
  const notesInput = document.getElementById("notes");
  const latitudeInput = document.getElementById("latitude");
  const longitudeInput = document.getElementById("longitude");

  if (!typeInput || !durationInput || !notesInput) return;

  const token = getToken();
  const type = typeInput.value;
  const durationMinutes = durationInput.value;
  const notes = notesInput.value;

  const latitude =
    latitudeInput && latitudeInput.value !== ""
      ? Number(latitudeInput.value)
      : undefined;

  const longitude =
    longitudeInput && longitudeInput.value !== ""
      ? Number(longitudeInput.value)
      : undefined;

  try {
    if (token) {
      await createActivityToDb({
        type,
        durationMinutes,
        notes,
        latitude,
        longitude,
      });
    } else {
      const newActivity = {
        activityType: type,
        duration: durationMinutes,
        notes,
        time: new Date().toISOString(),
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      };

      const activities = JSON.parse(localStorage.getItem("activities")) || [];
      activities.push(newActivity);
      localStorage.setItem("activities", JSON.stringify(activities));
    }

    this.reset();

    await displayActivities();
    await displayRecentActivities();
    await displayAllActivities();
  } catch (err) {
    console.error("Activity save failed:", err);
    alert(err.message || "Failed to save activity");
  }
});

document.getElementById("useCurrentLocation")?.addEventListener("click", () => {
  const latitudeInput = document.getElementById("latitude");
  const longitudeInput = document.getElementById("longitude");

  if (!latitudeInput || !longitudeInput) return;

  if (!navigator.geolocation) {
    alert("Geolocation is not supported in this browser.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      latitudeInput.value = String(position.coords.latitude);
      longitudeInput.value = String(position.coords.longitude);
    },
    () => {
      alert("Unable to get current location.");
    }
  );
});

await displayActivities();
await displayRecentActivities();
await displayAllActivities();
}

/* Bootstrap */

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  initialiseAuthPage();
  await initDashboard();
});