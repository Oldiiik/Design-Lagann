const stages = [...document.querySelectorAll(".frame-stage")];

function setView(stage, view) {
  const image = stage.querySelector("img");
  const source = image.dataset[view];
  if (!source || stage.dataset.current === view) return;
  stage.dataset.current = view;
  image.style.opacity = ".15";
  image.addEventListener("load", () => {
    image.style.opacity = "1";
  }, { once: true });
  image.src = source;
  for (const button of stage.querySelectorAll("[data-view]")) {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

for (const stage of stages) {
  stage.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view]");
    if (button) setView(stage, button.dataset.view);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.target.closest("button, a, input, select, textarea")) return;
  const index = Number(event.key) - 1;
  if (index >= 0 && index < 3) {
    document.querySelectorAll("[data-direction]")[index].scrollIntoView({ block: "start" });
    return;
  }
  if (event.key.toLowerCase() === "m") {
    const visible = stages.find((stage) => {
      const rect = stage.getBoundingClientRect();
      return rect.top < innerHeight * .7 && rect.bottom > innerHeight * .3;
    }) || stages[0];
    setView(visible, visible.dataset.current === "desktop" ? "mobile" : "desktop");
  }
});
