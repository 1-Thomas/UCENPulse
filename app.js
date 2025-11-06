
function drawChart() {
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
        borderColor: 'blue',
        backgroundColor: 'lightblue',
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


window.addEventListener('load', drawChart);


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
  drawChart(); 
});





document.getElementById("saveBtn2").addEventListener("click", function () {
  const calories = document.getElementById("calories").value;
  const dateSaved = new Date().toLocaleDateString();
  const caloriesData = { value: calories, date: dateSaved };
  localStorage.setItem("calories", JSON.stringify(caloriesData));
  alert(`Calories saved successfully on ${dateSaved}!`);
});


document.getElementById("saveBtn3").addEventListener("click", function () {
  const water = document.getElementById("water").value;
  const dateSaved = new Date().toLocaleDateString();
  const waterData = { value: water, date: dateSaved };
  localStorage.setItem("water", JSON.stringify(waterData));
  alert(`Water intake saved successfully on ${dateSaved}!`);
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





