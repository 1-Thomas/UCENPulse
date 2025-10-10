document.getElementById("saveBtn1").addEventListener("click", function () {
  const steps = document.getElementById("steps").value;
  localStorage.setItem("steps", steps);
  alert("Steps saved successfully!");
});


document.getElementById("saveBtn2").addEventListener("click", function () {
  const calories = document.getElementById("calories").value;
  localStorage.setItem("calories", calories);
  alert("Calories saved successfully!");
});


document.getElementById("saveBtn3").addEventListener("click", function () {
  const water = document.getElementById("water").value;
  localStorage.setItem("water", water);
  alert("Water intake saved successfully!");
});




document.getElementById("activityForm").addEventListener("submit")
const activityType = document.getElementById("activityType").value;
const duration = document.getElementById("duration").value;
const notes = document.getElementById("notes").value;

const activityData = {
    activityType,
    duration,
    notes,
};


