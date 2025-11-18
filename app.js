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


function onDomReady(fn) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn);
  } else {
    fn();
  }
}

/* Steps Chart */

function groupStepsDates(filterType, stepsList) {
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

function drawStepsChart(stepSize = 1000, filterType = 'daily') {
  const canvas = document.getElementById('stepsChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];
  const groupedData = groupStepsDates(filterType, stepsList);

  if (stepsChart) stepsChart.destroy();

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: groupedData.labels,
      datasets: [{
        label: 'Steps',
        data: groupedData.values,
        borderWidth: 2.5,
        borderColor: 'green',
        backgroundColor: 'lightgreen',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize }
        }
      }
    }
  });

  setStepsChart(chart);
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

function drawCaloriesChart(stepSize = 100, filterType = 'daily') {
  const canvas = document.getElementById('caloriesChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];
  const groupedData = groupCaloriesDates(filterType, caloriesList);

  if (caloriesChart) caloriesChart.destroy();

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: groupedData.labels,
      datasets: [{
        label: 'Calories',
        data: groupedData.values,
        borderWidth: 2.5,
        borderColor: 'red',
        backgroundColor: 'pink',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize }
        }
      }
    }
  });

  setCaloriesChart(chart);
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

function drawWaterChart(stepSize = 500, filterType = 'daily') {
  const canvas = document.getElementById('waterChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const waterList = JSON.parse(localStorage.getItem("waterList")) || [];
  const groupedData = groupWaterDates(filterType, waterList);

  if (waterChart) waterChart.destroy();

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: groupedData.labels,
      datasets: [{
        label: 'Water Intake (ml)',
        data: groupedData.values,
        borderWidth: 2.5,
        borderColor: 'blue',
        backgroundColor: 'lightblue',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize }
        }
      }
    }
  });

  setWaterChart(chart);
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

function drawSleepChart(stepSize = 1, filterType = 'daily') {
  const canvas = document.getElementById('sleepChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const sleepList = JSON.parse(localStorage.getItem("sleepList")) || [];
  const groupedData = groupSleepDates(filterType, sleepList);

  if (sleepChart) sleepChart.destroy();

  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: groupedData.labels,
      datasets: [{
        label: 'Sleep Hours',
        data: groupedData.values,
        borderWidth: 2.5,
        borderColor: 'purple',
        backgroundColor: 'rgba(180, 100, 255, 0.3)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize }
        }
      }
    }
  });

  setSleepChart(chart);
}

/* Dashboard Activities */

function getActivityIcon(type) {
  const clean = type.trim().toLowerCase();
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

function displayActivities() {
  const activities = JSON.parse(localStorage.getItem("activities")) || [];
  const container = document.getElementById("activitiesList");
  if (!container) return;

  container.innerHTML = "";

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const recent = activities.filter(a => new Date(a.time) >= weekAgo);

  if (recent.length === 0) {
    container.innerHTML = `<p class="no-activity-message">No activities recorded in the last 7 days.</p>`;
    return;
  }

  recent.forEach(a => {
    const icon = getActivityIcon(a.activityType);
    container.innerHTML += `
      <div class="activity-card">
        <header class="card-header">
          <div class="activity-header-left">
            <i class="fa-solid ${icon} activity-icon"></i>
            <span class="activity-title">${a.activityType}</span>
          </div>
          <span class="activity-date">${a.time}</span>
        </header>
        <p><strong>Duration:</strong> ${a.duration}</p>
        <p><strong>Notes:</strong> ${a.notes}</p>
      </div>
    `;
  });
}


function initDashboard() {
  /* Steps Input */
  document.getElementById('stepSizeSelect')?.addEventListener('change', function () {
    const filter = document.getElementById('dateFilterSelect')?.value || 'daily';
    drawStepsChart(parseInt(this.value), filter);
  });

  document.getElementById('dateFilterSelect')?.addEventListener('change', function () {
    const stepSize = parseInt(document.getElementById('stepSizeSelect')?.value || '1000');
    drawStepsChart(stepSize, this.value);
  });

  document.getElementById("saveBtn1")?.addEventListener("click", function () {
    const stepsInput = document.getElementById("steps");
    if (!stepsInput) return;

    const steps = stepsInput.value;
    const isoDate = new Date().toISOString().split('T')[0];
    let stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];

    const index = stepsList.findIndex(entry => entry.date === isoDate);
    if (index !== -1) stepsList[index].value = steps;
    else stepsList.push({ value: steps, date: isoDate });

    localStorage.setItem("stepsList", JSON.stringify(stepsList));
    alert(`Steps saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

    const stepSize = parseInt(document.getElementById('stepSizeSelect')?.value || '1000');
    const filter = document.getElementById('dateFilterSelect')?.value || 'daily';
    drawStepsChart(stepSize, filter);
  });

  drawStepsChart(1000);


  /* Calories Input */
  document.getElementById('calorieStepSizeSelect')?.addEventListener('change', function () {
    const filter = document.getElementById('calorieDateFilterSelect')?.value || 'daily';
    drawCaloriesChart(parseInt(this.value), filter);
  });

  document.getElementById('calorieDateFilterSelect')?.addEventListener('change', function () {
    const stepSize = parseInt(document.getElementById('calorieStepSizeSelect')?.value || '100');
    drawCaloriesChart(stepSize, this.value);
  });

  document.getElementById("saveBtn2")?.addEventListener("click", function () {
    const caloriesInput = document.getElementById("calories");
    if (!caloriesInput) return;

    const calories = caloriesInput.value;
    const isoDate = new Date().toISOString().split('T')[0];
    let caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];

    const index = caloriesList.findIndex(entry => entry.date === isoDate);
    if (index !== -1) caloriesList[index].value = calories;
    else caloriesList.push({ value: calories, date: isoDate });

    localStorage.setItem("caloriesList", JSON.stringify(caloriesList));
    alert(`Calories saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

    const stepSize = parseInt(document.getElementById('calorieStepSizeSelect')?.value || '100');
    const filter = document.getElementById('calorieDateFilterSelect')?.value || 'daily';
    drawCaloriesChart(stepSize, filter);
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

  document.getElementById("saveBtn3")?.addEventListener("click", function () {
    const waterInput = document.getElementById("water");
    if (!waterInput) return;

    const water = waterInput.value;
    const isoDate = new Date().toISOString().split('T')[0];

    let waterList = JSON.parse(localStorage.getItem("waterList")) || [];

    const index = waterList.findIndex(entry => entry.date === isoDate);
    if (index !== -1) waterList[index].value = water;
    else waterList.push({ value: water, date: isoDate });

    localStorage.setItem("waterList", JSON.stringify(waterList));
    alert(`Water intake saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

    const stepSize = parseInt(document.getElementById('waterStepSizeSelect')?.value || '500');
    const filter = document.getElementById('waterDateFilterSelect')?.value || 'daily';
    drawWaterChart(stepSize, filter);
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

  document.getElementById("saveBtn4")?.addEventListener("click", function () {
    const sleepInput = document.getElementById("sleepHours");
    if (!sleepInput) return;

    const hours = sleepInput.value;
    const isoDate = new Date().toISOString().split('T')[0];

    let sleepList = JSON.parse(localStorage.getItem("sleepList")) || [];

    const index = sleepList.findIndex(entry => entry.date === isoDate);
    if (index !== -1) sleepList[index].value = hours;
    else sleepList.push({ value: hours, date: isoDate });

    localStorage.setItem("sleepList", JSON.stringify(sleepList));
    alert(`Sleep hours saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

    const stepSize = parseInt(document.getElementById('sleepStepSizeSelect')?.value || '1');
    const filter = document.getElementById('sleepDateFilterSelect')?.value || 'daily';
    drawSleepChart(stepSize, filter);
  });

  drawSleepChart(1);


  /* Activities Form */
  document.getElementById("activityForm")?.addEventListener("submit", function (event) {
    event.preventDefault();

    const typeInput = document.getElementById("activityType");
    const durationInput = document.getElementById("duration");
    const notesInput = document.getElementById("notes");

    if (!typeInput || !durationInput || !notesInput) return;

    const newActivity = {
      activityType: typeInput.value,
      duration: durationInput.value,
      notes: notesInput.value,
      time: new Date().toLocaleString()
    };

    const activities = JSON.parse(localStorage.getItem("activities")) || [];
    activities.push(newActivity);
    localStorage.setItem("activities", JSON.stringify(activities));

    alert("Activity saved successfully!");
    this.reset();
    displayActivities();
  });


  displayActivities();
}



onDomReady(initDashboard);
