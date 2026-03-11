
import {
  stepsChart,
  setStepsChart,
  caloriesChart,
  setCaloriesChart,
  waterChart,
  setWaterChart,
  sleepChart,
  setSleepChart
} from './state.js';

const API_BASE = "http://localhost:3000";
let stepsAuthBlocked = false;
function getToken() {
  return localStorage.getItem("accessToken");
}
async function createActivityToDb({ type, durationMinutes, notes }) {
  const startedAt = new Date();
  const endedAt = new Date(startedAt.getTime() + Number(durationMinutes) * 60000);

  return apiRequest("POST", "/activities", {
    type,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    notes,
    tags: [type.toLowerCase()],
  });
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
    throw new Error("Unauthorized (token invalid/expired). Login again.");
  }

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error?.message ?? "Request failed");

  return data;
}
function isMetricLike(x) {
  if (!x || typeof x !== "object") return false;

  // Common metric payload shapes (adjust-free, defensive)
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

  // Activity signature used by your activity renderer
  const hasType = typeof x.type === "string" && x.type.trim().length > 0;
  const hasStartedAt = typeof x.startedAt === "string" && x.startedAt.length > 0;

  // If it looks like a metric, exclude it even if it has overlapping fields
  if (isMetricLike(x)) return false;

  return hasType && hasStartedAt;
}


async function apiRequest(method, path, body) {
  const token = localStorage.getItem("accessToken");

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

function getLocalISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // local calendar date
}

function getUtcDayWindowFromLocalDate(localISO) {
  // localISO = YYYY-MM-DD interpreted as local date
  const [y, m, d] = localISO.split("-").map(Number);
  const startLocal = new Date(y, m - 1, d, 0, 0, 0, 0);
  const endLocal = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return {
    from: startLocal.toISOString(),
    to: endLocal.toISOString(),
  };
}

async function getOrCreateStepsActivityId() {
  const todayLocal = getLocalISODate();
  const { from, to } = getUtcDayWindowFromLocalDate(todayLocal);

  // LOOK UP existing "steps" activities for that day
  const qs = new URLSearchParams({
    type: "steps",
    from,
    to,
    take: "10",
    skip: "0",
  });

  const list = await apiRequest("GET", `/activities?${qs.toString()}`);
  const items = list?.items ?? [];

  // Reuse the newest one if it exists
  if (items.length > 0) return items[0].id;

  // Otherwise create exactly one
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
    value: stepsCount,              // ABSOLUTE
    recordedAt: new Date().toISOString(),
  });
}

function minutesBetween(startISO, endISO) {
  if (!startISO || !endISO) return null;
  const start = new Date(startISO);
  const end = new Date(endISO);
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 60000);
}

function toUiActivity(dbActivity) {
  const mins = minutesBetween(dbActivity.startedAt, dbActivity.endedAt);
  return {
    activityType: dbActivity.type,
    duration: mins === null ? "—" : `${mins} minutes`,
    notes: dbActivity.notes ?? "",
    time: dbActivity.startedAt, // used by your renderer
  };
}

async function fetchActivitiesFromDb({ from, to, type, take = 50, skip = 0 } = {}) {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  if (type) qs.set("type", type);
  qs.set("take", String(take));
  qs.set("skip", String(skip));

  const res = await apiRequest("GET", `/activities?${qs.toString()}`);
  const items = Array.isArray(res?.items) ? res.items : [];

  // FILTER OUT METRICS
  return items.filter(isActivityLike);
}


async function getActivitiesForUi({ from, to, type, take } = {}) {
  const token = getToken();

  if (token) {
    const items = await fetchActivitiesFromDb({ from, to, type, take });
    return items.map(toUiActivity);
  }

  // fallback
  return JSON.parse(localStorage.getItem("activities")) || [];
}









function onDomReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

/* Steps Chart */

export function groupStepsDates(filterType, stepsList) {
  const grouped = {};

  stepsList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly') {
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    } else if (filterType === 'yearly') {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString('en-GB');
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
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
  const items = list?.items ?? [];

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

    const labels = (series.labels ?? []).map((iso) => {
      const d = new Date(iso);
      const tz = { timeZone: "Europe/London" };

      if (filterType === "monthly") {
        return d.toLocaleString("en-GB", { month: "short", year: "numeric", ...tz });
      }
      if (filterType === "yearly") {
        return d.toLocaleString("en-GB", { year: "numeric", ...tz });
      }
      return d.toLocaleDateString("en-GB", tz);
    });


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

/* Calories Chart */

function groupCaloriesDates(filterType, caloriesList) {
  const grouped = {};

  caloriesList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly') {
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    } else if (filterType === 'yearly') {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString('en-GB');
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
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

    const labels = (series.labels ?? []).map((iso) => {
      const d = new Date(iso);
      const tz = { timeZone: "Europe/London" };

      if (filterType === "monthly") {
        return d.toLocaleString("en-GB", { month: "short", year: "numeric", ...tz });
      }
      if (filterType === "yearly") {
        return d.toLocaleString("en-GB", { year: "numeric", ...tz });
      }
      return d.toLocaleDateString("en-GB", tz);
    });

    if (caloriesChart) caloriesChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Calories",
          data: series.values ?? [],
          borderWidth: 2.5,
          borderColor: "red",
          backgroundColor: "pink",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } }
        }
      }
    });

    setCaloriesChart(chart);
  } catch (e) {
    console.error("Calories chart error:", e);
    if (caloriesChart) caloriesChart.destroy();
    setCaloriesChart(null);
  }
}


/* Water Chart */

function groupWaterDates(filterType, waterList) {
  const grouped = {};

  waterList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly') {
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    } else if (filterType === 'yearly') {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString('en-GB');
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
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

    const labels = (series.labels ?? []).map((iso) => {
      const d = new Date(iso);
      const tz = { timeZone: "Europe/London" };

      if (filterType === "monthly") {
        return d.toLocaleString("en-GB", { month: "short", year: "numeric", ...tz });
      }
      if (filterType === "yearly") {
        return d.toLocaleString("en-GB", { year: "numeric", ...tz });
      }
      return d.toLocaleDateString("en-GB", tz);
    });

    if (waterChart) waterChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Water Intake (ml)",
          data: series.values ?? [],
          borderWidth: 2.5,
          borderColor: "blue",
          backgroundColor: "lightblue",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } }
        }
      }
    });

    setWaterChart(chart);
  } catch (e) {
    console.error("Water chart error:", e);
    if (waterChart) waterChart.destroy();
    setWaterChart(null);
  }
}


/* Sleep Chart */

function groupSleepDates(filterType, sleepList) {
  const grouped = {};

  sleepList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly') {
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    } else if (filterType === 'yearly') {
      key = date.getFullYear();
    } else {
      key = date.toLocaleDateString('en-GB');
    }

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
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

    const labels = (series.labels ?? []).map((iso) => {
      const d = new Date(iso);
      const tz = { timeZone: "Europe/London" };

      if (filterType === "monthly") {
        return d.toLocaleString("en-GB", { month: "short", year: "numeric", ...tz });
      }
      if (filterType === "yearly") {
        return d.toLocaleString("en-GB", { year: "numeric", ...tz });
      }
      return d.toLocaleDateString("en-GB", tz);
    });

    if (sleepChart) sleepChart.destroy();

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Sleep Hours",
          data: series.values ?? [],
          borderWidth: 2.5,
          borderColor: "purple",
          backgroundColor: "rgba(180, 100, 255, 0.3)",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, ticks: { stepSize } }
        }
      }
    });

    setSleepChart(chart);
  } catch (e) {
    console.error("Sleep chart error:", e);
    if (sleepChart) sleepChart.destroy();
    setSleepChart(null);
  }
}


/* Dashboard Activities */

export function getActivityIcon(type) {
  const clean = (type ?? "").trim().toLowerCase();
  return {
    "workout": "fa-dumbbell",
    "running": "fa-person-running",
    "cycling": "fa-bicycle",
    "swimming": "fa-person-swimming",
    "walking": "fa-person-walking",
    "yoga": "fa-spa",
    "gym": "fa-heart-pulse",
  }[clean] || "fa-clipboard-list";
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
      take: 100,
    });
  } catch (e) {
    // If DB fetch fails, keep UI functional by falling back
    activities = JSON.parse(localStorage.getItem("activities")) || [];
  }

  const recent = activities
    .filter(a => new Date(a.time) >= weekAgo)
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  if (recent.length === 0) {
    container.innerHTML = `<p class="empty-state">No activities logged in the last 7 days.</p>`;
    return;
  }

  recent.forEach(a => {
    const icon = (a.activityType || "").toLowerCase().includes("gym")
      ? "fa-dumbbell"
      : (a.activityType || "").toLowerCase().includes("run")
      ? "fa-person-running"
      : (a.activityType || "").toLowerCase().includes("walk")
      ? "fa-person-walking"
      : "fa-list-check";

    container.innerHTML += `
      <div class="activity-card">
        <header class="card-header">
          <div class="activity-header-left">
            <i class="fa-solid ${icon} activity-icon"></i>
            <span class="activity-title">${a.activityType}</span>
          </div>
          <span class="activity-date">${new Date(a.time).toLocaleDateString('en-GB')}</span>
        </header>
        <p><strong>Duration:</strong> ${a.duration}</p>
        <p><strong>Notes:</strong> ${a.notes || "None"}</p>
      </div>
    `;
  });
}

/* Recent Activities on Activities Page*/

async function displayRecentActivities() {
  const container = document.getElementById("recentActivities");
  if (!container) return;

  container.innerHTML = "";

  let activities = [];
  try {
    activities = await getActivitiesForUi({ take: 50 });
  } catch (e) {
    activities = JSON.parse(localStorage.getItem("activities")) || [];
  }

  const recent = activities
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<p class="empty-state">No recent activities.</p>`;
    return;
  }

  recent.forEach(a => {
    container.innerHTML += `
      <div class="activity-row">
        <div>
          <div class="activity-title">${a.activityType}</div>
          <div class="activity-meta">${new Date(a.time).toLocaleDateString('en-GB')} • ${a.duration}</div>
        </div>
        <div class="activity-notes">${a.notes || ""}</div>
      </div>
    `;
  });
}


async function initDashboard() {
  
 
  /* Steps Input */
  document.getElementById('stepSizeSelect')?.addEventListener('change', function () {
    const filter = document.getElementById('dateFilterSelect')?.value || 'daily';
    drawStepsChart(parseInt(this.value), filter).catch(console.error);
  });

  document.getElementById('dateFilterSelect')?.addEventListener('change', function () {
    const stepSize = parseInt(document.getElementById('stepSizeSelect')?.value || '1000');
    drawStepsChart(stepSize, this.value).catch(console.error);
  });



  document.getElementById("saveBtn1")?.addEventListener("click", async () => {
    const stepsInput = document.getElementById("steps");
    if (!stepsInput) return;

    const desired = Number(stepsInput.value);
    if (!Number.isFinite(desired) || desired < 0) return;

    const series = await fetchMetricSeries({ name: "steps", unit: "count", bucket: "daily" });

    const today = new Date().toLocaleDateString("en-GB");
    const labels = series.labels ?? [];
    const values = series.values ?? [];
    const idx = labels.findIndex(x => new Date(x).toLocaleDateString("en-GB") === today);
    const current = idx >= 0 ? Number(values[idx] ?? 0) : 0;

    await saveStepsToDb(desired);

;

    const stepSize = parseInt(document.getElementById("stepSizeSelect")?.value || "1000", 10);
    const filter = document.getElementById("dateFilterSelect")?.value || "daily";
    await drawStepsChart(stepSize, filter);
  });



  if (!stepsAuthBlocked) drawStepsChart(1000, "daily").catch(console.error);

 
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) drawStepsChart(1000, "daily").catch(console.error);
  });

  window.addEventListener("focus", () => {
    drawStepsChart(1000, "daily").catch(console.error);
  });


  window.addEventListener("storage", (e) => {
    if (e.key === "stepsUpdatedAt") {
      const stepSize = parseInt(document.getElementById('stepSizeSelect')?.value || '1000');
      const filter = document.getElementById('dateFilterSelect')?.value || 'daily';
      drawStepsChart(stepSize, filter).catch(console.error);
    }
  });

  /* Calories Input */
  document.getElementById('calorieStepSizeSelect')?.addEventListener('change', function () {
    const filter = document.getElementById('calorieDateFilterSelect')?.value || 'daily';
    drawCaloriesChart(parseInt(this.value), filter).catch(console.error);
  });

  document.getElementById('calorieDateFilterSelect')?.addEventListener('change', function () {
    const stepSize = parseInt(document.getElementById('calorieStepSizeSelect')?.value || '100');
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

    const stepSize = parseInt(
      document.getElementById("calorieStepSizeSelect")?.value || "100",
      10
    );
    const filter =
      document.getElementById("calorieDateFilterSelect")?.value || "daily";

    await drawCaloriesChart(stepSize, filter);

    input.value = "";
  });


  drawCaloriesChart(100);

  /* Water Input */
  document.getElementById('waterStepSizeSelect')?.addEventListener('change', function () {
    const filter = document.getElementById('waterDateFilterSelect')?.value || 'daily';
    drawWaterChart(parseInt(this.value), filter);
  });

  document.getElementById('waterDateFilterSelect')?.addEventListener('change', function () {
    const stepSize = parseInt(document.getElementById('waterStepSizeSelect')?.value || '500');
    drawWaterChart(stepSize, this.value);
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

    const stepSize = parseInt(
      document.getElementById("waterStepSizeSelect")?.value || "500",
      10
    );
    const filter =
      document.getElementById("waterDateFilterSelect")?.value || "daily";

    await drawWaterChart(stepSize, filter);

    input.value = "";
  });

  drawWaterChart(500);

  /* Sleep Input */
  document.getElementById('sleepStepSizeSelect')?.addEventListener('change', function () {
    const filter = document.getElementById('sleepDateFilterSelect')?.value || 'daily';
    drawSleepChart(parseInt(this.value), filter);
  });

  document.getElementById('sleepDateFilterSelect')?.addEventListener('change', function () {
    const stepSize = parseInt(document.getElementById('sleepStepSizeSelect')?.value || '1');
    drawSleepChart(stepSize, this.value);
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

  const stepSize = parseInt(
    document.getElementById("sleepStepSizeSelect")?.value || "1",
    10
  );
  const filter =
    document.getElementById("sleepDateFilterSelect")?.value || "daily";

  await drawSleepChart(stepSize, filter);

  input.value = "";
});

  drawSleepChart(1);

  /* Activities Form */
  document.getElementById("activityForm")?.addEventListener("submit", async function (event) {
  event.preventDefault();

  const typeInput = document.getElementById("activityType");
  const durationInput = document.getElementById("duration");
  const notesInput = document.getElementById("notes");
  if (!typeInput || !durationInput || !notesInput) return;

  const token = getToken();
  const type = typeInput.value;
  const durationMinutes = durationInput.value;
  const notes = notesInput.value;

  if (token) {
    await createActivityToDb({ type, durationMinutes, notes });
  } else {
    // fallback (no login token)
    const newActivity = {
      activityType: type,
      duration: durationMinutes,
      notes,
      time: new Date().toISOString(),
    };
    const activities = JSON.parse(localStorage.getItem("activities")) || [];
    activities.push(newActivity);
    localStorage.setItem("activities", JSON.stringify(activities));
  }

  this.reset();
  await displayActivities();
  await displayRecentActivities();
});


  await displayActivities();
}



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

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  initialiseAuthPage();
});

if (typeof document !== "undefined") {
  onDomReady(initDashboard);
}



