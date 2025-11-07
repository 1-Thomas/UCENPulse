
function drawStepsChart() {
  const ctx = document.getElementById('stepsChart').getContext('2d');
  const stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];

  const dates = stepsList.map(entry => entry.date);
  const values = stepsList.map(entry => entry.value);

  new Chart(ctx, {
    type: 'line', 
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Steps',
        data: values,
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
          beginAtZero: true
        }
      }
    }
  });
}
window.addEventListener('load', drawStepsChart);
function drawCaloriesChart() {
  const ctx = document.getElementById('caloriesChart').getContext('2d');
  const caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];

  const dates = caloriesList.map(entry => entry.date);
  const values = caloriesList.map(entry => entry.value);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Calories',
        data: values,
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
          beginAtZero: true
        }
      }
    }
  });
}

window.addEventListener('load', drawCaloriesChart);

function drawWaterChart() {
  const ctx = document.getElementById('waterChart').getContext('2d');
  const waterList = JSON.parse(localStorage.getItem("waterList")) || [];

  const dates = waterList.map(entry => entry.date);
  const values = waterList.map(entry => entry.value);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{
        label: 'Daily Water Intake',
        data: values,
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
        }
      }
    }
  });
}
window.addEventListener('load', drawWaterChart);



document.getElementById("saveBtn1").addEventListener("click", function () {
  const steps = document.getElementById("steps").value;
  const dateSaved = new Date().toLocaleDateString();

  let stepsList = JSON.parse(localStorage.getItem("stepsList")) || [];
  const existingIndex = stepsList.findIndex(entry => entry.date === dateSaved);

  if (existingIndex !== -1) {
    stepsList[existingIndex].value = steps;
  } else {
    stepsList.push({ value: steps, date: dateSaved });
  }

  localStorage.setItem("stepsList", JSON.stringify(stepsList));

  alert(`Steps saved successfully on ${dateSaved}!`);
  drawStepsChart(); 
});





document.getElementById("saveBtn2").addEventListener("click", function () {
  const calories = document.getElementById("calories").value;
  const dateSaved = new Date().toLocaleDateString();

  let caloriesList = JSON.parse(localStorage.getItem("caloriesList")) || [];
  const existingIndex = caloriesList.findIndex(entry => entry.date === dateSaved);

  if (existingIndex !== -1) {
    caloriesList[existingIndex].value = calories;
  } else {
    caloriesList.push({ value: calories, date: dateSaved });
  }

  localStorage.setItem("caloriesList", JSON.stringify(caloriesList));

  alert(`Calories saved successfully on ${dateSaved}!`);
  drawCaloriesChart(); 
});

document.getElementById("saveBtn3").addEventListener("click", function () {
  const water = document.getElementById("water").value;
  const dateSaved = new Date().toLocaleDateString();

  let waterList = JSON.parse(localStorage.getItem("waterList")) || [];
  const existingIndex = waterList.findIndex(entry => entry.date === dateSaved);

  if (existingIndex !== -1) {
    waterList[existingIndex].value = water;
  } else {
    waterList.push({ value: water, date: dateSaved });
  }

  localStorage.setItem("waterList", JSON.stringify(waterList));

  alert(`Water intake saved successfully on ${dateSaved}!`);
  drawWaterChart();
});




document.getElementById("activityForm").addEventListener("click")
const activityType = document.getElementById("activityType").value;
const duration = document.getElementById("duration").value;
const notes = document.getElementById("notes").value;

const activityData = {
    activityType,
    duration,
    notes,
};





