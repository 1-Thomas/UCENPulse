document.getElementById("activityForm").addEventListener("submit")
const activityType = document.getElementById("activityType").value;
const duration = document.getElementById("duration").value;
const notes = document.getElementById("notes").value;

const activityData = {
    activityType,
    duration,
    notes,
};