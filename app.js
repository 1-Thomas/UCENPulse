document.getElementById("saveBtn1").addEventListener("click", function () {
  const steps = document.getElementById("steps").value;
  const dateSaved = new Date().toLocaleDateString();
  const stepsData = { value: steps, date: dateSaved };
  localStorage.setItem("steps", JSON.stringify(stepsData));
  alert(`Steps saved successfully on ${dateSaved}!`);
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





