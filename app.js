let stepsChart;


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

  return {
    labels: Object.keys(grouped),
    values: Object.values(grouped)
  };
}



function drawStepsChart(stepSize = 1000, filterType = 'daily') {
  const ctx = document.getElementById('stepsChart').getContext('2d');
  const stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];

  const groupedData = groupStepsDates(filterType, stepsList);
 

  if (stepsChart) {
    stepsChart.destroy();
  }

  stepsChart = new Chart(ctx, {
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
          ticks: {
            stepSize: stepSize
          }
        }
      }
    }
  });
}


const stepSelect = document.getElementById('stepSizeSelect');
if (stepSelect) {
  stepSelect.addEventListener('change', function() {
    const newStepSize = parseInt(this.value);
    const filterType = document.getElementById('dateFilterSelect').value;
    drawStepsChart(newStepSize, filterType);
  });
}


const dateFilterSelect = document.getElementById('dateFilterSelect');
if (dateFilterSelect) {
  dateFilterSelect.addEventListener('change', function() {
    const stepSize = parseInt(document.getElementById('stepSizeSelect').value);
    drawStepsChart(stepSize, this.value);
  });
}


const saveBtn1 = document.getElementById("saveBtn1");
if (saveBtn1) {
  saveBtn1.addEventListener("click", function () {
    const steps = document.getElementById("steps").value;
    const isoDate = new Date().toISOString().split('T')[0];

    let stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];
    const existingIndex = stepsList.findIndex(entry => entry.date === isoDate);

    if (existingIndex !== -1) {
      stepsList[existingIndex].value = steps;
    } else {
      stepsList.push({ value: steps, date: isoDate });
    }

    localStorage.setItem("stepsList", JSON.stringify(stepsList));

    const ukDate = new Date(isoDate).toLocaleDateString('en-GB');
    alert(`Steps saved successfully on ${ukDate}!`);

    const stepSize = parseInt(document.getElementById('stepSizeSelect').value);
    const filterType = document.getElementById('dateFilterSelect').value;
    drawStepsChart(stepSize, filterType);
  });
}

window.addEventListener('load', () => drawStepsChart(1000));





let caloriesChart = null;

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

  return {
    labels: Object.keys(grouped),
    values: Object.values(grouped)
  };
}


function drawCaloriesChart(stepSize = 100, filterType = 'daily') {
  const ctx = document.getElementById('caloriesChart').getContext('2d');
  const caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];

  const groupedData = groupCaloriesDates(filterType, caloriesList);


  if (caloriesChart) {
    caloriesChart.destroy();
  }

   caloriesChart = new Chart(ctx, {
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
          ticks: {
            stepSize: stepSize
          }
        }
      }
    }
  });
}



const calorieStepSelect = document.getElementById('calorieStepSizeSelect');
if (calorieStepSelect) {
  calorieStepSelect.addEventListener('change', function() {
    const newStepSize = parseInt(this.value);
    const filterType = document.getElementById('calorieDateFilterSelect').value;
    drawCaloriesChart(newStepSize, filterType);
  });
}


const calorieDateFilterSelect = document.getElementById('calorieDateFilterSelect');
if (calorieDateFilterSelect) {
  calorieDateFilterSelect.addEventListener('change', function() {
    const stepSize = parseInt(document.getElementById('calorieStepSizeSelect').value);
    drawCaloriesChart(stepSize, this.value);
  });
}



const saveBtn2 = document.getElementById("saveBtn2");
if (saveBtn2) {
  saveBtn2.addEventListener("click", function () {
    const calories = document.getElementById("calories").value;
    const isoDate = new Date().toISOString().split('T')[0];

    let caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];
    const existingIndex = caloriesList.findIndex(entry => entry.date === isoDate);

    if (existingIndex !== -1) {
      caloriesList[existingIndex].value = calories;
    } else {
      caloriesList.push({ value: calories, date: isoDate });
    }

    localStorage.setItem("caloriesList", JSON.stringify(caloriesList));

    const ukDate = new Date(isoDate).toLocaleDateString('en-GB');
    alert(`Calories saved successfully on ${ukDate}!`);

    const stepSize = parseInt(document.getElementById('calorieStepSizeSelect').value);
    const filterType = document.getElementById('calorieDateFilterSelect').value;
    drawCaloriesChart(stepSize, filterType);
  });
}

window.addEventListener('load', () => drawCaloriesChart(100));




let waterChart;

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

  return {
    labels: Object.keys(grouped),
    values: Object.values(grouped)
  };
}

function drawWaterChart(stepSize = 500, filterType = 'daily') {
  const ctx = document.getElementById('waterChart').getContext('2d');
  const waterList = JSON.parse(localStorage.getItem("waterList")) || [];

  const groupedData = groupWaterDates(filterType, waterList);

  if (waterChart) {
    waterChart.destroy();
  }

  waterChart = new Chart(ctx, {
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
          ticks: { stepSize: stepSize }
        }
      }
    }
  });
}



const waterStepSelect = document.getElementById('waterStepSizeSelect');
if (waterStepSelect) {
  waterStepSelect.addEventListener('change', function() {
    const newStepSize = parseInt(this.value);
    const filterType = document.getElementById('waterDateFilterSelect').value;
    drawWaterChart(newStepSize, filterType);
  });
}



const waterDateFilterSelect = document.getElementById('waterDateFilterSelect');
if (waterDateFilterSelect) {
  waterDateFilterSelect.addEventListener('change', function() {
    const stepSize = parseInt(document.getElementById('waterStepSizeSelect').value);
    drawWaterChart(stepSize, this.value);
  });
}



const saveBtn3 = document.getElementById("saveBtn3");
if (saveBtn3) {
  saveBtn3.addEventListener("click", function () {
    const water = document.getElementById("water").value;
    const isoDate = new Date().toISOString().split('T')[0];

    let waterList = JSON.parse(localStorage.getItem("waterList")) || [];
    const existingIndex = waterList.findIndex(entry => entry.date === isoDate);

    if (existingIndex !== -1) {
      waterList[existingIndex].value = water;
    } else {
      waterList.push({ value: water, date: isoDate });
    }

    localStorage.setItem("waterList", JSON.stringify(waterList));

    const ukDate = new Date(isoDate).toLocaleDateString('en-GB');
    alert(`Water intake saved successfully on ${ukDate}!`);

    const stepSize = parseInt(document.getElementById('waterStepSizeSelect').value);
    const filterType = document.getElementById('waterDateFilterSelect').value;
    drawWaterChart(stepSize, filterType);
  });
}


window.addEventListener('load', () => drawWaterChart(500, 'daily'));


let sleepChart;

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

  return {
    labels: Object.keys(grouped),
    values: Object.values(grouped)
  };
}

function drawSleepChart(stepSize = 1, filterType = 'daily') {
  const ctx = document.getElementById('sleepChart').getContext('2d');
  const sleepList = JSON.parse(localStorage.getItem("sleepList")) || [];

  const groupedData = groupSleepDates(filterType, sleepList);

  if (sleepChart) {
    sleepChart.destroy();
  }

  sleepChart = new Chart(ctx, {
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
          ticks: { stepSize: stepSize }
        }
      }
    }
  });
}



const sleepStepSelect = document.getElementById('sleepStepSizeSelect');
if (sleepStepSelect) {
  sleepStepSelect.addEventListener('change', function() {
    const newStepSize = parseInt(this.value);
    const filterType = document.getElementById('sleepDateFilterSelect').value;
    drawSleepChart(newStepSize, filterType);
  });
}



const sleepDateFilterSelect = document.getElementById('sleepDateFilterSelect');
if (sleepDateFilterSelect) {
  sleepDateFilterSelect.addEventListener('change', function() {
    const stepSize = parseInt(document.getElementById('sleepStepSizeSelect').value);
    drawSleepChart(stepSize, this.value);
  });
}



const saveBtn4 = document.getElementById("saveBtn4");
if (saveBtn4) {
  saveBtn4.addEventListener("click", function () {
    const sleepHours = document.getElementById("sleepHours").value;
    const isoDate = new Date().toISOString().split('T')[0];

    let sleepList = JSON.parse(localStorage.getItem("sleepList")) || [];
    const existingIndex = sleepList.findIndex(entry => entry.date === isoDate);

    if (existingIndex !== -1) {
      sleepList[existingIndex].value = sleepHours;
    } else {
      sleepList.push({ value: sleepHours, date: isoDate });
    }

    localStorage.setItem("sleepList", JSON.stringify(sleepList));

    const ukDate = new Date(isoDate).toLocaleDateString('en-GB');
    alert(`Sleep hours saved successfully for ${ukDate}!`);

    const stepSize = parseInt(document.getElementById('sleepStepSizeSelect').value);
    const filterType = document.getElementById('sleepDateFilterSelect').value;
    drawSleepChart(stepSize, filterType);
  });
}



window.addEventListener('load', () => drawSleepChart(1, 'daily'));





function getActivityIcon(type) {
  const cleanType = type.trim().toLowerCase();

  const iconMap = {
    "workout": "fa-dumbbell",
    "running": "fa-person-running",
    "cycling": "fa-bicycle",
    "swimming": "fa-person-swimming",
    "walking": "fa-person-walking",
    "yoga": "fa-spa",
    "gym": "fa-heart-pulse",
  };

  return iconMap[cleanType] || "fa-clipboard-list";
}


function displayActivities() {
  const activities = JSON.parse(localStorage.getItem("activities")) || [];
  const container = document.getElementById("activitiesList");
  container.innerHTML = "";

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const recentActivities = activities.filter(activity => {
    const activityDate = new Date(activity.time);
    return activityDate >= sevenDaysAgo && activityDate <= today;
  });

  if (recentActivities.length === 0) {
    container.innerHTML = `
      <p class="no-activity-message">No activities recorded in the last 7 days.</p>`;
    return;
  }

  recentActivities.forEach((activity, index) => {
    const icon = getActivityIcon(activity.activityType);

    container.innerHTML += `
      <div class="activity-card">
        <header class="card-header">
          <div class="activity-header-left">
            <i class="fa-solid ${icon} activity-icon"></i>
            <span class="activity-title">${activity.activityType}</span>
          </div>
          <span class="activity-date">${activity.time}</span>
        </header>

        <p><strong>Duration:</strong> ${activity.duration}</p>
        <p><strong>Notes:</strong> ${activity.notes}</p>
      </div>`;
  });
}

displayActivities();



const activityForm = document.getElementById("activityForm");

if (activityForm) {
  activityForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const activityType = document.getElementById("activityType").value;
    const duration = document.getElementById("duration").value;
    const notes = document.getElementById("notes").value;
    const dateSaved = new Date().toLocaleString();

    const activities = JSON.parse(localStorage.getItem("activities")) || [];

    const newActivity = {
      activityType,
      duration,
      notes,
      time: dateSaved
    };

    activities.push(newActivity);
    localStorage.setItem("activities", JSON.stringify(activities));

    alert("Activity saved successfully!");
    activityForm.reset();
    displayActivities();
  });
}

