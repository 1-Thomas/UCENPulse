/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";
import { initDashboard } from "./app.js";

describe("initDashboard()", () => {
  let chartMock;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="stepSizeSelect">
        <option value="1000">1000</option>
        <option value="2000">2000</option>
      </select>
      <select id="dateFilterSelect">
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
      <input id="steps" />
      <button id="saveBtn1"></button>
      <canvas id="stepsChart"></canvas>

      <form id="activityForm">
        <input id="activityType" />
        <input id="duration" />
        <input id="notes" />
        <button type="submit">Add</button>
      </form>
      <div id="activitiesList"></div>
    `;

  
    const canvas = document.getElementById("stepsChart");
    canvas.getContext = jest.fn(() => ({}));

    localStorage.clear();


    chartMock = jest.fn(() => ({ destroy: jest.fn() }));
    global.Chart = chartMock;
  });



  test("calls drawStepsChart with default stepSize 1000", () => {
    initDashboard();

    expect(chartMock).toHaveBeenCalledTimes(1);

    const [ctx, config] = chartMock.mock.calls[0];
    expect(ctx).toBeTruthy();
    expect(config.options.scales.y.ticks.stepSize).toBe(1000);
  });

  test("changing stepSizeSelect draws chart with new step size", () => {
    initDashboard();
    chartMock.mockClear();

    const stepSizeSelect = document.getElementById("stepSizeSelect");
    const dateFilterSelect = document.getElementById("dateFilterSelect");

    stepSizeSelect.value = "2000";
    dateFilterSelect.value = "weekly";

    stepSizeSelect.dispatchEvent(new Event("change"));

    expect(chartMock).toHaveBeenCalledTimes(1);
    const [, config] = chartMock.mock.calls[0];
    expect(config.options.scales.y.ticks.stepSize).toBe(2000);
  });

  test("changing dateFilterSelect redraws chart, preserving step size", () => {
    initDashboard();
    chartMock.mockClear();

    const stepSizeSelect = document.getElementById("stepSizeSelect");
    const dateFilterSelect = document.getElementById("dateFilterSelect");

    stepSizeSelect.value = "2000";
    dateFilterSelect.value = "weekly";

    dateFilterSelect.dispatchEvent(new Event("change"));

    expect(chartMock).toHaveBeenCalledTimes(1);
    const [, config] = chartMock.mock.calls[0];
    expect(config.options.scales.y.ticks.stepSize).toBe(2000);
  });

  test("displayActivities shows only activities from the last 7 days", () => {
    const today = new Date();
    const todayStr = today.toISOString();

    const recentDate = new Date();
    recentDate.setDate(today.getDate() - 3);
    const recentStr = recentDate.toISOString();

   
    const oldDate = new Date();
    oldDate.setDate(today.getDate() - 10);
    const oldStr = oldDate.toISOString();

    
    const activities = [
      {
        activityType: "Running",
        duration: "20 mins",
        notes: "Today activity",
        time: todayStr,
      },
      {
        activityType: "Cycling",
        duration: "40 mins",
        notes: "Recent activity",
        time: recentStr,
      },
      {
        activityType: "Yoga",
        duration: "60 mins",
        notes: "Old activity",
        time: oldStr, 
      }
    ];

    localStorage.setItem("activities", JSON.stringify(activities));

    initDashboard();

    const container = document.getElementById("activitiesList");

    
    const cards = container.querySelectorAll(".activity-card");

  
    expect(cards.length).toBe(2);

    
    const titles = [...cards].map(c =>
      c.querySelector(".activity-title").textContent.trim()
    );

    expect(titles).toContain("Running");
    expect(titles).toContain("Cycling");
    expect(titles).not.toContain("Yoga");
  });

  test("submitting activity form adds a new activity to localStorage", () => {
    initDashboard(); 

    const form = document.getElementById("activityForm");
    const typeInput = document.getElementById("activityType");
    const durationInput = document.getElementById("duration");
    const notesInput = document.getElementById("notes");

    typeInput.value = "Running";
    durationInput.value = "30 mins";
    notesInput.value = "Morning run";

   
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const raw = localStorage.getItem("activities");
    expect(raw).not.toBeNull();

    const activities = JSON.parse(raw);
    expect(Array.isArray(activities)).toBe(true);
    expect(activities.length).toBe(1);

    const activity = activities[0];
    expect(activity.activityType).toBe("Running");
    expect(activity.duration).toBe("30 mins");
    expect(activity.notes).toBe("Morning run");

    expect(typeInput.value).toBe("");
    expect(durationInput.value).toBe("");
    expect(notesInput.value).toBe("");
  });

  test("submitting activity form when activities already exist appends to the list", () => {
    const existing = [
      { activityType: "Yoga", duration: "20 mins", notes: "Stretch" },
    ];
    localStorage.setItem("activities", JSON.stringify(existing));

    initDashboard();

    const form = document.getElementById("activityForm");
    const typeInput = document.getElementById("activityType");
    const durationInput = document.getElementById("duration");
    const notesInput = document.getElementById("notes");

    typeInput.value = "Cycling";
    durationInput.value = "45 mins";
    notesInput.value = "Evening ride";

    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    const raw = localStorage.getItem("activities");
    const activities = JSON.parse(raw);

    expect(activities.length).toBe(2);
    expect(activities[0]).toEqual(existing[0]);
    expect(activities[1]).toEqual(
      expect.objectContaining({
        activityType: "Cycling",
        duration: "45 mins",
        notes: "Evening ride",
      })
    );
  });
  
  test("clicking saveBtn1 stores today's steps in localStorage", () => {

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-12-12T10:00:00.000Z"));

    initDashboard();
    chartMock.mockClear();

    const stepsInput = document.getElementById("steps");
    const saveBtn = document.getElementById("saveBtn1");

    stepsInput.value = "5000";
    saveBtn.click();

    const stored = JSON.parse(localStorage.getItem("stepsList"));
    expect(stored).toEqual([{ value: "5000", date: "2025-12-12" }]);

    expect(chartMock).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  test("clicking saveBtn1 stores steps and triggers a chart redraw", () => {
    initDashboard();
    chartMock.mockClear();

    const stepsInput = document.getElementById("steps");
    const saveBtn = document.getElementById("saveBtn1");
    const stepSizeSelect = document.getElementById("stepSizeSelect");
    const dateFilterSelect = document.getElementById("dateFilterSelect");


    stepSizeSelect.value = "1500";
    dateFilterSelect.value = "daily";
    stepsInput.value = "5000";

 
    saveBtn.click();

    const raw = localStorage.getItem("stepsList");
    expect(raw).not.toBeNull();

    const stepsList = JSON.parse(raw);
    expect(Array.isArray(stepsList)).toBe(true);
    expect(stepsList.length).toBeGreaterThan(0);

   
    expect(chartMock).toHaveBeenCalled();
    });



  test("clicking saveBtn1 updates existing entry for today instead of adding a new one", () => {
    const todayIso = new Date().toISOString().split("T")[0];
    localStorage.setItem(
      "stepsList",
      JSON.stringify([{ date: todayIso, value: "3000" }])
    );

    initDashboard();
    chartMock.mockClear();

    const stepsInput = document.getElementById("steps");
    const saveBtn = document.getElementById("saveBtn1");

    stepsInput.value = "8000";

    saveBtn.click();

    const stepsList = JSON.parse(localStorage.getItem("stepsList"));
    expect(stepsList.length).toBe(1);
    expect(stepsList[0]).toEqual({ date: todayIso, value: "8000" });
  });





});

