const examples = {
  editorial: {
    name: "Morrow Editions",
    title: "Editorial design example: Morrow Editions",
    url: "./editorial/index.html",
    thesis: "A new book physically opens the page; its spine becomes the alignment hinge.",
    material: "Ink, paper, one vermilion signal. No surface effects.",
    shell: "#e8e5de",
    ink: "#161616",
    accent: "#c9472d",
    palette: ["#f1eee6", "#11100e", "#c9472d"]
  },
  industrial: {
    name: "Rivet FM",
    title: "Industrial brutalist design example: Rivet FM",
    url: "./industrial/index.html",
    thesis: "The live radio frequency becomes the page axis; tuning changes the composition’s active point.",
    material: "Black steel, safety yellow, off-white rules. Motion only communicates broadcast state.",
    shell: "#d7d4ca",
    ink: "#111111",
    accent: "#e7fb00",
    palette: ["#e7fb00", "#111111", "#e9e6dc"]
  },
  "retro-future": {
    name: "Luma Loop",
    title: "Retro-future design example: Luma Loop",
    url: "./retro-future/index.html",
    thesis: "The skate route is also the session schedule; booking means entering the orbit.",
    material: "Deep plum field, one chrome loop, coral/cyan state signals. Glow stays on the moving route.",
    shell: "#cfc8d8",
    ink: "#1e102b",
    accent: "#ff5b6f",
    palette: ["#23112f", "#f6cbd4", "#ff5b6f", "#5af2e9"]
  },
  organic: {
    name: "Kin Ferment",
    title: "Organic folk design example: Kin Ferment",
    url: "./organic/index.html",
    thesis: "Fermentation time rises through the page like bubbles in a jar; the day scale becomes its spine.",
    material: "Recycled paper, forest ink, mustard and tomato signals. Depth belongs only to the jar.",
    shell: "#e5d8b9",
    ink: "#183d2f",
    accent: "#cf4931",
    palette: ["#efe4c8", "#183d2f", "#d9a92b", "#cf4931"]
  }
};

const tabs = [...document.querySelectorAll(".style-tab")];
const frame = document.querySelector("#style-frame");
const frameWrap = document.querySelector(".frame-wrap");
const previewTitle = document.querySelector("#preview-title");
const thesis = document.querySelector("#direction-thesis");
const material = document.querySelector("#direction-material");
const palette = document.querySelector("#direction-palette");
const openExample = document.querySelector("#open-example");
const themeMeta = document.querySelector('meta[name="theme-color"]');

let activeStyle = "editorial";

function renderPalette(colors) {
  palette.replaceChildren(...colors.map((color) => {
    const swatch = document.createElement("span");
    swatch.style.setProperty("--swatch", color);
    return swatch;
  }));
}

function selectStyle(id, { updateHash = true, focus = false } = {}) {
  const example = examples[id];
  if (!example) return;
  window.scrollTo({ left: 0, top: window.scrollY, behavior: "auto" });
  activeStyle = id;
  let selectedTab = null;
  tabs.forEach((tab) => {
    const selected = tab.dataset.style === id;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected) selectedTab = tab;
    if (selected && focus) tab.focus();
  });
  if (selectedTab && matchMedia("(max-width: 900px)").matches) {
    setTimeout(() => {
      const strip = selectedTab.parentElement;
      strip.scrollLeft = Math.max(
        0,
        selectedTab.offsetLeft - (strip.clientWidth - selectedTab.clientWidth) / 2
      );
    }, 40);
  }
  frameWrap.classList.add("is-loading");
  frame.src = example.url;
  frame.title = example.title;
  previewTitle.textContent = example.name;
  thesis.textContent = example.thesis;
  material.textContent = example.material;
  openExample.href = example.url;
  renderPalette(example.palette);
  document.documentElement.style.setProperty("--shell", example.shell);
  document.documentElement.style.setProperty("--shell-ink", example.ink);
  document.documentElement.style.setProperty("--accent", example.accent);
  themeMeta.content = example.shell;
  if (updateHash) history.replaceState(null, "", `#${id}`);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => selectStyle(tab.dataset.style));
});

frame.addEventListener("load", () => {
  frameWrap.classList.remove("is-loading");
  try {
    frame.contentWindow.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    // Same-origin examples allow this; the fallback simply preserves browser position.
  }
});

document.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  if (event.target.matches("input, textarea, select")) return;
  const ids = Object.keys(examples);
  const direction = event.key === "ArrowRight" ? 1 : -1;
  const nextIndex = (ids.indexOf(activeStyle) + direction + ids.length) % ids.length;
  selectStyle(ids[nextIndex], { focus: document.activeElement?.classList.contains("style-tab") });
});

const initialStyle = location.hash.slice(1);
selectStyle(examples[initialStyle] ? initialStyle : "editorial", { updateHash: Boolean(initialStyle) });
