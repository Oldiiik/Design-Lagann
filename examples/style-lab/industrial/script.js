const tuner = document.querySelector("#frequencyTuner");
const playControl = document.querySelector("#playControl");
const readout = document.querySelector(".tuner-readout__value");
const signalStatus = document.querySelector("#signalStatus");
const stationClock = document.querySelector("#stationClock");
const currentProgram = document.querySelector("#currentProgram");
const currentHost = document.querySelector("#currentHost");
const scheduleItems = [...document.querySelectorAll(".schedule__list li")];

const stationFrequency = 99.8;
const lockTolerance = 0.25;
let isPlaying = false;

const schedule = [
  {
    start: 0,
    end: 3,
    title: "Night Shift",
    host: "Field desk / low-frequency relay",
  },
  {
    start: 3,
    end: 7,
    title: "Cold Start",
    host: "Archive unit / autonomous mix",
  },
  {
    start: 7,
    end: 12,
    title: "Morning Metal",
    host: "Mara K. / machine rhythm desk",
  },
  {
    start: 12,
    end: 18,
    title: "Open Circuit",
    host: "Guest transmission desk",
  },
  {
    start: 18,
    end: 24,
    title: "Rivet Assembly",
    host: "Live from warehouse 04",
  },
];

function isLocked() {
  return Math.abs(Number(tuner.value) - stationFrequency) <= lockTolerance;
}

function updateTuner({ announce = true } = {}) {
  const value = Number(tuner.value);
  const position = ((value - Number(tuner.min)) / (Number(tuner.max) - Number(tuner.min))) * 100;
  const locked = isLocked();
  const dialAngle = -135 + position * 2.7;

  document.documentElement.style.setProperty("--dial-position", position.toFixed(2));
  document.documentElement.style.setProperty("--dial-inverse", (100 - position).toFixed(2));
  document.documentElement.style.setProperty("--dial-angle", `${dialAngle.toFixed(2)}deg`);
  document.body.classList.toggle("is-locked", locked);
  readout.textContent = value.toFixed(1);
  tuner.setAttribute("aria-valuetext", `${value.toFixed(1)} megahertz${locked ? ", Rivet FM locked" : ", scanning"}`);

  if (!announce) return;

  if (locked) {
    signalStatus.textContent = isPlaying
      ? "Relay active / 99.8 MHz"
      : "Signal locked / 99.8 MHz";
  } else {
    signalStatus.textContent = "No carrier / seek 99.8 MHz";
    if (isPlaying) stopRelay();
  }
}

function stopRelay() {
  isPlaying = false;
  document.body.classList.remove("is-playing");
  playControl.setAttribute("aria-pressed", "false");
  playControl.querySelector(".play-control__verb").textContent = "Start relay";
  signalStatus.textContent = isLocked()
    ? "Signal locked / 99.8 MHz"
    : "No carrier / seek 99.8 MHz";
}

function startRelay() {
  if (!isLocked()) {
    tuner.value = stationFrequency.toFixed(1);
    updateTuner({ announce: false });
  }

  isPlaying = true;
  document.body.classList.add("is-playing");
  playControl.setAttribute("aria-pressed", "true");
  playControl.querySelector(".play-control__verb").textContent = "Stop relay";
  signalStatus.textContent = "Relay active / 99.8 MHz";
}

function toggleRelay() {
  if (isPlaying) {
    stopRelay();
  } else {
    startRelay();
  }
}

function updateClockAndProgram() {
  const now = new Date();
  const almatyTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Almaty" }),
  );
  const hour = almatyTime.getHours();

  stationClock.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Almaty",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  const activeIndex = schedule.findIndex(
    (program) => hour >= program.start && hour < program.end,
  );
  const activeProgram = schedule[Math.max(0, activeIndex)];

  currentProgram.textContent = activeProgram.title;
  currentHost.textContent = activeProgram.host;

  scheduleItems.forEach((item, index) => {
    const active = index === activeIndex;
    item.classList.toggle("is-current", active);
    if (active) {
      item.setAttribute("aria-current", "time");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

tuner.addEventListener("input", () => updateTuner());
playControl.addEventListener("click", toggleRelay);

updateTuner({ announce: false });
updateClockAndProgram();
window.setInterval(updateClockAndProgram, 1000);
