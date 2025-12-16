/**
 * @jest-environment jsdom
 */

import { getActivityIcon, displayRecentActivities } from "./app.js";

describe("getActivityIcon()", () => {
  test("returns correct icon", () => {
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

describe("displayRecentActivities()", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="activitiesList" class="activities-container"></div>`;
    localStorage.clear();
  });

  test("does nothing if container element is missing", () => {
    document.body.innerHTML = "";
    expect(() => displayRecentActivities()).not.toThrow();
  });

  test("shows 'No activities recorded yet.' when localStorage has none", () => {
    displayRecentActivities();

    const container = document.getElementById("activitiesList");
    expect(container.innerHTML).toContain("No activities recorded yet.");
    expect(container.querySelectorAll(".activity-card").length).toBe(0);
    expect(container.querySelector(".no-activity-message")).not.toBeNull();
  });

  test("renders only the 5 most recent activities, sorted newest-first", () => {
    const now = new Date();
    const daysAgoISO = (n) => {
      const d = new Date(now);
      d.setDate(now.getDate() - n);
      return d.toISOString();
    };

    const activities = [
      { activityType: "Running",  time: daysAgoISO(6), duration: "10", notes: "A6" }, 
      { activityType: "Workout",  time: daysAgoISO(5), duration: "20", notes: "A5" },
      { activityType: "Cycling",  time: daysAgoISO(4), duration: "30", notes: "A4" },
      { activityType: "Swimming", time: daysAgoISO(3), duration: "40", notes: "A3" },
      { activityType: "Walking",  time: daysAgoISO(2), duration: "50", notes: "A2" },
      { activityType: "Yoga",     time: daysAgoISO(1), duration: "60", notes: "A1" }, 
    ];

    localStorage.setItem("activities", JSON.stringify(activities));
    displayRecentActivities();

    const container = document.getElementById("activitiesList");
    const cards = container.querySelectorAll(".activity-card");

    expect(cards.length).toBe(5);

    const titles = Array.from(cards).map(
      (card) => card.querySelector(".activity-title").textContent
    );

    expect(titles).toEqual(["Yoga", "Walking", "Swimming", "Cycling", "Workout"]);
    expect(titles).not.toContain("Running");
  });

  test("uses correct icons, en-GB date format, and notes fallback", () => {
   
    const time1 = new Date(Date.UTC(2025, 0, 15, 12, 0, 0)).toISOString(); 
    const time2 = new Date(Date.UTC(2025, 0, 16, 12, 0, 0)).toISOString(); 

    const activities = [
      { activityType: "Running", time: time1, duration: "20", notes: "" },      
      { activityType: "Yoga",    time: time2, duration: "30" },                
    ];

    localStorage.setItem("activities", JSON.stringify(activities));
    displayRecentActivities();

    const container = document.getElementById("activitiesList");
    const cards = container.querySelectorAll(".activity-card");
    expect(cards.length).toBe(2);

   
    expect(cards[0].querySelector(".activity-title").textContent).toBe("Yoga");
    expect(cards[1].querySelector(".activity-title").textContent).toBe("Running");

 
    const icons = container.querySelectorAll(".activity-icon");
    expect(icons[0].className).toContain("fa-spa"); 
    expect(icons[1].className).toContain("fa-person-running"); 

    const expectedYogaDate = new Date(time2).toLocaleDateString("en-GB");
    const expectedRunDate = new Date(time1).toLocaleDateString("en-GB");

    expect(cards[0].querySelector(".activity-date").textContent).toBe(expectedYogaDate);
    expect(cards[1].querySelector(".activity-date").textContent).toBe(expectedRunDate);

    const notesLines = Array.from(container.querySelectorAll(".activity-card p"))
      .map((p) => p.textContent)
      .filter((t) => t.startsWith("Notes:"));

    expect(notesLines.length).toBe(2);
    expect(notesLines[0]).toContain("None");
    expect(notesLines[1]).toContain("None");
  });
});
