/**
 * @jest-environment jsdom
 */

import { jest } from "@jest/globals";
import { drawStepsChart } from "./app.js";
import { setStepsChart } from "./state.js";

describe("drawStepsChart()", () => {
  let mockChartInstance;

  beforeEach(() => {

    document.body.innerHTML = `<canvas id="stepsChart"></canvas>`;

    const canvas = document.getElementById("stepsChart");
    canvas.getContext = jest.fn(() => ({}));

  
    const testStepsList = [
      { date: "2025-01-01", steps: 1500 },
      { date: "2025-01-02", steps: 2200 },
    ];
    Storage.prototype.getItem = jest.fn(() => JSON.stringify(testStepsList));

    
    mockChartInstance = { destroy: jest.fn() };
    global.Chart = jest.fn(() => mockChartInstance);


    setStepsChart(null);
  });

  test("creates a new Chart instance with correct config", () => {
    drawStepsChart(1000, "daily");

    expect(global.Chart).toHaveBeenCalledTimes(1);

    const [ctx, config] = global.Chart.mock.calls[0];

    expect(ctx).toBeTruthy();
    expect(config.type).toBe("line");
    expect(config.data.datasets[0].label).toBe("Steps");
    expect(config.options.scales.y.ticks.stepSize).toBe(1000);
  });

  test("does nothing if canvas is missing", () => {
    document.body.innerHTML = ""; 

    drawStepsChart();

    expect(global.Chart).not.toHaveBeenCalled();
  });

  test("destroys existing chart if present", () => {

    const oldChart = { destroy: jest.fn() };
    setStepsChart(oldChart);

    drawStepsChart();

    expect(oldChart.destroy).toHaveBeenCalledTimes(1);
  });
});
