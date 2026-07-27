const stage = document.querySelector("#book-stage");
const openButton = document.querySelector("#open-book");
const closeButton = document.querySelector("#close-book");
const excerpt = document.querySelector("#excerpt");
const reserveButton = document.querySelector("#reserve-copy");
const reserveStatus = document.querySelector("#reserve-status");
const year = document.querySelector("#current-year");

function setBookOpen(isOpen, moveFocus = true) {
  stage.dataset.state = isOpen ? "open" : "closed";
  openButton.setAttribute("aria-expanded", String(isOpen));
  excerpt.setAttribute("aria-hidden", String(!isOpen));
  excerpt.inert = !isOpen;

  if (moveFocus) {
    window.setTimeout(() => {
      (isOpen ? closeButton : openButton).focus();
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 780);
  }
}

openButton.addEventListener("click", () => setBookOpen(true));
closeButton.addEventListener("click", () => setBookOpen(false));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && stage.dataset.state === "open") {
    setBookOpen(false);
  }
});

reserveButton.addEventListener("click", () => {
  const isReserved = reserveButton.getAttribute("aria-pressed") === "true";
  const nextState = !isReserved;

  reserveButton.setAttribute("aria-pressed", String(nextState));
  reserveButton.textContent = nextState
    ? "Reserved · copy 184"
    : "Reserve copy · $24";
  reserveStatus.textContent = nextState
    ? "Held for 24 hours. No payment taken."
    : "Reservation released.";
});

year.textContent = String(new Date().getFullYear());
