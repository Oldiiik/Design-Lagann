const sessionButtons = [...document.querySelectorAll(".session-node")];
const orbit = document.querySelector(".orbit-shell");
const reserveButton = document.querySelector("#reserve-button");
const reserveLabel = document.querySelector("#reserve-label");
const reservePrice = document.querySelector("#reserve-price");
const sessionName = document.querySelector("#session-name");
const sessionTime = document.querySelector("#session-time");
const sessionMeridiem = document.querySelector("#session-meridiem");
const sessionDetail = document.querySelector("#session-detail");
const sessionSeats = document.querySelector("#session-seats");
const statusToast = document.querySelector("#status-toast");

let selectedSession = sessionButtons[0];
let heldSessionId = null;
let toastTimer;

function readableSession(button) {
  return `${button.dataset.day}, ${button.dataset.time} ${button.dataset.meridiem}, ${button.dataset.name}`;
}

function announce(message) {
  window.clearTimeout(toastTimer);
  statusToast.textContent = message;
  statusToast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => {
    statusToast.classList.remove("is-visible");
  }, 4200);
}

function paintSelection(button, shouldAnnounce = true) {
  selectedSession = button;

  sessionButtons.forEach((sessionButton) => {
    const isCurrent = sessionButton === button;
    sessionButton.classList.toggle("is-selected", isCurrent);
    sessionButton.classList.toggle(
      "is-reserved",
      sessionButton.dataset.session === heldSessionId,
    );
    sessionButton.setAttribute("aria-pressed", String(isCurrent));
  });

  sessionName.textContent = `${button.dataset.day} / ${button.dataset.name}`;
  sessionTime.textContent = button.dataset.time;
  sessionTime.dateTime = button.dataset.datetime;
  sessionMeridiem.textContent = button.dataset.meridiem;
  sessionDetail.textContent = button.dataset.detail;
  sessionSeats.textContent = button.dataset.seats;
  reservePrice.textContent = button.dataset.price;

  const isHeld = heldSessionId === button.dataset.session;
  reserveButton.setAttribute("aria-pressed", String(isHeld));
  reserveLabel.textContent = isHeld ? "Release hold" : "Hold this loop";
  orbit.classList.toggle("is-booked", isHeld);

  if (shouldAnnounce) {
    announce(`${readableSession(button)} selected. ${button.dataset.seats}.`);
  }
}

function toggleHold() {
  const sessionId = selectedSession.dataset.session;
  const isReleasing = heldSessionId === sessionId;

  heldSessionId = isReleasing ? null : sessionId;
  orbit.classList.toggle("is-booked", !isReleasing);
  selectedSession.classList.toggle("is-reserved", !isReleasing);
  reserveButton.setAttribute("aria-pressed", String(!isReleasing));
  reserveLabel.textContent = isReleasing ? "Hold this loop" : "Release hold";
  reservePrice.textContent = isReleasing ? selectedSession.dataset.price : "Held";

  if (isReleasing) {
    announce(`Hold released for ${readableSession(selectedSession)}.`);
  } else {
    announce(
      `Two places held for ${readableSession(selectedSession)}. Pay at Mercury Hall.`,
    );
  }
}

sessionButtons.forEach((button, index) => {
  button.addEventListener("click", () => paintSelection(button));

  button.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = (index + direction + sessionButtons.length) % sessionButtons.length;
    sessionButtons[nextIndex].focus();
    paintSelection(sessionButtons[nextIndex]);
  });
});

reserveButton.addEventListener("click", toggleHold);
paintSelection(selectedSession, false);
