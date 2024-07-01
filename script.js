const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");

function handleOrientation(event) {
  const alphaSpan = document.querySelector("#alpha");
  alphaSpan.textContent = event.alpha.toFixed(2); // Display alpha value with 2 decimal places
}

function onClick() {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    // Handle iOS 13+ devices.
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else {
          console.error("Request to access the orientation was rejected");
        }
      })
      .catch(console.error);
  } else {
    // Handle regular non iOS 13+ devices.
    window.addEventListener("deviceorientation", handleOrientation);
  }
}

startButton.addEventListener("click", onClick);