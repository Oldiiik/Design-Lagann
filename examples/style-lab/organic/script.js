const dayInput = document.querySelector("#ferment-day");
const dayOutput = document.querySelector("#day-output");
const flavorTitle = document.querySelector("#flavor-title");
const flavorNote = document.querySelector("#flavor-note");
const reserveButton = document.querySelector(".reserve-button");
const bookingStatus = document.querySelector("#booking-status");
const fermentCanvas = document.querySelector("#ferment-canvas");
const fermentContext = fermentCanvas?.getContext("2d");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let activeDay = 4;
let canvasWidth = 0;
let canvasHeight = 0;
let particleField = [];
let animationFrame = 0;

const flavorMap = {
  1: ["Salt finds water", "Fresh cabbage · mineral · quiet"],
  2: ["The jar warms", "Green · peppery · first sour edge"],
  3: ["Tiny weather", "Bright brine · mustard seed · crisp"],
  4: ["The first fizz", "Tangy · green apple · lively crunch"],
  5: ["Full chorus", "Deep sour · garlic · soft heat"],
  6: ["Round and ready", "Savory · mellow · persistent fizz"],
  7: ["Cold cellar", "Complex · settled · time to chill"]
};

function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function buildParticleField(day) {
  const count = 5 + day * 2;
  particleField = Array.from({ length: count }, (_, index) => {
    const side = index % 2 === 0 ? 0 : 1;
    const horizontal = .08 + pseudoRandom(day * 31 + index) * .23;
    return {
      x: side ? 1 - horizontal : horizontal,
      y: pseudoRandom(day * 47 + index * 3),
      radius: 2 + pseudoRandom(day * 59 + index * 5) * (2 + day * .45),
      speed: .55 + pseudoRandom(day * 71 + index * 7) * .8,
      phase: pseudoRandom(day * 83 + index * 11) * Math.PI * 2
    };
  });
}

function sizeFermentCanvas() {
  if (!fermentCanvas || !fermentContext) return;
  const bounds = fermentCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvasWidth = Math.max(1, bounds.width);
  canvasHeight = Math.max(1, bounds.height);
  fermentCanvas.width = Math.round(canvasWidth * dpr);
  fermentCanvas.height = Math.round(canvasHeight * dpr);
  fermentContext.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function paintFermentWeather(time = 0) {
  if (!fermentContext || !fermentCanvas || document.hidden) return;
  fermentContext.clearRect(0, 0, canvasWidth, canvasHeight);
  const still = reducedMotion.matches;

  particleField.forEach((particle, index) => {
    const travel = still ? 0 : (time * .000035 * particle.speed) % 1;
    const y = ((particle.y - travel + 1) % 1) * canvasHeight;
    const sway = Math.sin(time * .0012 + particle.phase) * (3 + activeDay);
    const x = particle.x * canvasWidth + (still ? 0 : sway);
    const pulse = .62 + Math.sin(time * .0016 + particle.phase) * .22;

    fermentContext.beginPath();
    fermentContext.arc(x, y, particle.radius * pulse, 0, Math.PI * 2);
    fermentContext.fillStyle = `rgba(239, 228, 200, ${.16 + activeDay * .018})`;
    fermentContext.strokeStyle = `rgba(24, 61, 47, ${.22 + (index % 3) * .08})`;
    fermentContext.lineWidth = 1.1;
    fermentContext.fill();
    fermentContext.stroke();
  });

  if (!still) animationFrame = requestAnimationFrame(paintFermentWeather);
}

function restartFermentWeather(day) {
  activeDay = day;
  buildParticleField(day);
  cancelAnimationFrame(animationFrame);
  paintFermentWeather();
}

function updateFermentDay() {
  const day = Number(dayInput.value);
  const [title, note] = flavorMap[day];
  const progress = (day - 1) / 6;
  document.documentElement.style.setProperty("--crock-tilt", `${-2 + progress * 4}deg`);
  document.documentElement.style.setProperty("--crock-lift", `${-2 - progress * 5}px`);
  dayOutput.value = `Day ${day}`;
  dayOutput.textContent = `Day ${day}`;
  flavorTitle.textContent = title;
  flavorNote.textContent = note;
  restartFermentWeather(day);
}

dayInput.addEventListener("input", updateFermentDay);

reserveButton.addEventListener("click", () => {
  const reserved = reserveButton.getAttribute("aria-pressed") === "true";
  reserveButton.setAttribute("aria-pressed", String(!reserved));
  reserveButton.firstChild.textContent = reserved ? "Hold my wooden spoon " : "Seat held for Saturday ";
  bookingStatus.textContent = reserved
    ? "Seat released. The jar will wait."
    : "Reserved locally for this demo — no payment was taken.";
});

if (fermentCanvas && fermentContext) {
  sizeFermentCanvas();
  new ResizeObserver(() => {
    sizeFermentCanvas();
    restartFermentWeather(activeDay);
  }).observe(fermentCanvas);
  reducedMotion.addEventListener("change", () => restartFermentWeather(activeDay));
  document.addEventListener("visibilitychange", () => restartFermentWeather(activeDay));
}

updateFermentDay();
