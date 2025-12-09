/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";
import { getActivityIcon, displayActivities } from "./app.js";

describe("getActivityIcon()", () => {
  test("returns correct icon)", () => {
    expect(getActivityIcon("workout")).toBe("fa-dumbbell");
    expect(getActivityIcon(" Running ")).toBe("fa-person-running");
    expect(getActivityIcon("CYCLING")).toBe("fa-bicycle");
    expect(getActivityIcon("swimming")).toBe("fa-person-swimming");
    expect(getActivityIcon("walking")).toBe("fa-person-walking");
    expect(getActivityIcon("yoga")).toBe("fa-spa");
    expect(getActivityIcon("gym")).toBe("fa-heart-pulse");
  });

  test("falls back to default icon if necessary", () => {
    expect(getActivityIcon("unknown")).toBe("fa-clipboard-list");
    expect(getActivityIcon("")).toBe("fa-clipboard-list");
    expect(getActivityIcon("   something weird ")).toBe("fa-clipboard-list");
  });
});

describe("displayActivities()", () => {
  beforeEach(() => {
 
    document.body.innerHTML = `<div id="activitiesList"></div>`;
    localStorage.clear();
  });

  test("does nothing if container element is missing", () => {
    document.body.innerHTML = "";

    
    expect(() => displayActivities()).not.toThrow();
  });

  test("shows 'no activities' message when none in last 7 days", () => {
  
    const now = new Date();
    const tenDaysAgo = new Date(now);
    tenDaysAgo.setDate(now.getDate() - 10);

    const activities = [
      {
        activityType: "Running",
        time: tenDaysAgo.toISOString(),
        duration: "30 mins",
        notes: "Old run"
      }
    ];

    localStorage.setItem("activities", JSON.stringify(activities));

    displayActivities();

    const container = document.getElementById("activitiesList");
    expect(container.innerHTML).toContain("No activities recorded in the last 7 days.");
    expect(container.querySelectorAll(".activity-card").length).toBe(0);
  });

  test("shows only activities from last 7 days, sorted by newest first", () => {
    const now = new Date();

    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);

    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);

    const eightDaysAgo = new Date(now);
    eightDaysAgo.setDate(now.getDate() - 8); 
    const activities = [
      {
        activityType: "Running",
        time: threeDaysAgo.toISOString(),
        duration: "45 mins",
        notes: "Nice run"
      },
      {
        activityType: "Workout",
        time: oneDayAgo.toISOString(),
        duration: "60 mins",
        notes: "Gym session"
      },
      {
        activityType: "Cycling",
        time: eightDaysAgo.toISOString(),
        duration: "30 mins",
        notes: "Too old"
      }
    ];

    localStorage.setItem("activities", JSON.stringify(activities));

    displayActivities();

    const container = document.getElementById("activitiesList");
    const cards = container.querySelectorAll(".activity-card");

  
    expect(cards.length).toBe(2);

    const firstTitle = cards[0].querySelector(".activity-title").textContent;
    const secondTitle = cards[1].querySelector(".activity-title").textContent;

 
    expect(firstTitle).toBe("Workout");
    expect(secondTitle).toBe("Running");
  });

  test("uses the correct icon based on activity type", () => {
    const now = new Date();

    const activities = [
      {
        activityType: "Running",
        time: now.toISOString(),
        duration: "20 mins",
        notes: "Quick run"
      },
      {
        activityType: "Yoga",
        time: now.toISOString(),
        duration: "30 mins",
        notes: "Stretching"
      }
    ];

    localStorage.setItem("activities", JSON.stringify(activities));

    displayActivities();

    const container = document.getElementById("activitiesList");
    const icons = container.querySelectorAll(".activity-icon");

 
    expect(icons.length).toBe(2);
    expect(icons[0].className).toContain("fa-person-running");
    expect(icons[1].className).toContain("fa-spa");
  });
});
