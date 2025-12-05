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
  const ctx = document.getElementById('stepsChart').getContext('2d');
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
      scales: { y: { beginAtZero: true, ticks: { stepSize } } }
    }
  });

  setStepsChart(chart);
}

document.getElementById('stepSizeSelect')?.addEventListener('change', function () {
  drawStepsChart(parseInt(this.value), document.getElementById('dateFilterSelect').value);
});

document.getElementById('dateFilterSelect')?.addEventListener('change', function () {
  drawStepsChart(parseInt(document.getElementById('stepSizeSelect').value), this.value);
});

document.getElementById("saveBtn1")?.addEventListener("click", function () {
  const steps = document.getElementById("steps").value;
  const isoDate = new Date().toISOString().split('T')[0];
  let stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];

  const index = stepsList.findIndex(entry => entry.date === isoDate);
  if (index !== -1) stepsList[index].value = steps;
  else stepsList.push({ value: steps, date: isoDate });

  localStorage.setItem("stepsList", JSON.stringify(stepsList));
  alert(`Steps saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

  drawStepsChart(parseInt(document.getElementById('stepSizeSelect').value),
                 document.getElementById('dateFilterSelect').value);
});

window.addEventListener('load', () => drawStepsChart(1000));



function groupCaloriesDates(filterType, caloriesList) {
  const grouped = {};
  caloriesList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly')
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    else if (filterType === 'yearly')
      key = date.getFullYear();
    else
      key = date.toLocaleDateString('en-GB');

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

function drawCaloriesChart(stepSize = 100, filterType = 'daily') {
  const ctx = document.getElementById('caloriesChart').getContext('2d');
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
      scales: { y: { beginAtZero: true, ticks: { stepSize } } }
    }
  });

  setCaloriesChart(chart);
}

document.getElementById('calorieStepSizeSelect')?.addEventListener('change', function () {
  drawCaloriesChart(parseInt(this.value), document.getElementById('calorieDateFilterSelect').value);
});

document.getElementById('calorieDateFilterSelect')?.addEventListener('change', function () {
  drawCaloriesChart(parseInt(document.getElementById('calorieStepSizeSelect').value), this.value);
});

document.getElementById("saveBtn2")?.addEventListener("click", function () {
  const calories = document.getElementById("calories").value;
  const isoDate = new Date().toISOString().split('T')[0];
  let caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];

  const index = caloriesList.findIndex(entry => entry.date === isoDate);
  if (index !== -1) caloriesList[index].value = calories;
  else caloriesList.push({ value: calories, date: isoDate });

  localStorage.setItem("caloriesList", JSON.stringify(caloriesList));

  alert(`Calories saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

  drawCaloriesChart(parseInt(document.getElementById('calorieStepSizeSelect').value),
                    document.getElementById('calorieDateFilterSelect').value);
});

window.addEventListener('load', () => drawCaloriesChart(100));


function groupWaterDates(filterType, waterList) {
  const grouped = {};
  waterList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly')
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    else if (filterType === 'yearly')
      key = date.getFullYear();
    else
      key = date.toLocaleDateString('en-GB');

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

function drawWaterChart(stepSize = 500, filterType = 'daily') {
  const ctx = document.getElementById('waterChart').getContext('2d');
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
      scales: { y: { beginAtZero: true, ticks: { stepSize } } }
    }
  });

  setWaterChart(chart);
}

document.getElementById('waterStepSizeSelect')?.addEventListener('change', function () {
  drawWaterChart(parseInt(this.value), document.getElementById('waterDateFilterSelect').value);
});

document.getElementById('waterDateFilterSelect')?.addEventListener('change', function () {
  drawWaterChart(parseInt(document.getElementById('waterStepSizeSelect').value), this.value);
});

document.getElementById("saveBtn3")?.addEventListener("click", function () {
  const water = document.getElementById("water").value;
  const isoDate = new Date().toISOString().split('T')[0];

  let waterList = JSON.parse(localStorage.getItem("waterList")) || [];

  const index = waterList.findIndex(entry => entry.date === isoDate);
  if (index !== -1) waterList[index].value = water;
  else waterList.push({ value: water, date: isoDate });

  localStorage.setItem("waterList", JSON.stringify(waterList));

  alert(`Water intake saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

  drawWaterChart(parseInt(document.getElementById('waterStepSizeSelect').value),
                 document.getElementById('waterDateFilterSelect').value);
});

window.addEventListener('load', () => drawWaterChart(500));



function groupSleepDates(filterType, sleepList) {
  const grouped = {};

  sleepList.forEach(entry => {
    const date = new Date(entry.date);
    let key;

    if (filterType === 'monthly')
      key = `${date.toLocaleString('en-GB', { month: 'short' })} ${date.getFullYear()}`;
    else if (filterType === 'yearly')
      key = date.getFullYear();
    else
      key = date.toLocaleDateString('en-GB');

    grouped[key] = (grouped[key] || 0) + Number(entry.value);
  });

  return { labels: Object.keys(grouped), values: Object.values(grouped) };
}

function drawSleepChart(stepSize = 1, filterType = 'daily') {
  const ctx = document.getElementById('sleepChart').getContext('2d');
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
      scales: { y: { beginAtZero: true, ticks: { stepSize } } }
    }
  });

  setSleepChart(chart);
}

document.getElementById('sleepStepSizeSelect')?.addEventListener('change', function () {
  drawSleepChart(parseInt(this.value), document.getElementById('sleepDateFilterSelect').value);
});

document.getElementById('sleepDateFilterSelect')?.addEventListener('change', function () {
  drawSleepChart(parseInt(document.getElementById('sleepStepSizeSelect').value), this.value);
});

document.getElementById("saveBtn4")?.addEventListener("click", function () {
  const hours = document.getElementById("sleepHours").value;
  const isoDate = new Date().toISOString().split('T')[0];

  let sleepList = JSON.parse(localStorage.getItem("sleepList")) || [];

  const index = sleepList.findIndex(entry => entry.date === isoDate);
  if (index !== -1) sleepList[index].value = hours;
  else sleepList.push({ value: hours, date: isoDate });

  localStorage.setItem("sleepList", JSON.stringify(sleepList));

  alert(`Sleep hours saved for ${new Date(isoDate).toLocaleDateString('en-GB')}!`);

  drawSleepChart(parseInt(document.getElementById('sleepStepSizeSelect').value),
                 document.getElementById('sleepDateFilterSelect').value);
});

window.addEventListener('load', () => drawSleepChart(1));


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

displayActivities();

document.getElementById("activityForm")?.addEventListener("submit", function (event) {
  event.preventDefault();

  const newActivity = {
    activityType: document.getElementById("activityType").value,
    duration: document.getElementById("duration").value,
    notes: document.getElementById("notes").value,
    time: new Date().toLocaleString()
  };

  const activities = JSON.parse(localStorage.getItem("activities")) || [];
  activities.push(newActivity);
  localStorage.setItem("activities", JSON.stringify(activities));

  alert("Activity saved successfully!");
  this.reset();
  displayActivities();
});
