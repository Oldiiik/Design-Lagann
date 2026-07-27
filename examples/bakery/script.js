document.documentElement.classList.add("js");

const navToggle = document.querySelector("[data-nav-toggle]");
const nav = document.querySelector("[data-nav]");
const dialog = document.querySelector("[data-bag-dialog]");
const count = document.querySelector("[data-bag-count]");
const empty = document.querySelector("[data-bag-empty]");
const list = document.querySelector("[data-bag-list]");
const totalWrap = document.querySelector("[data-bag-total]");
const total = document.querySelector("[data-total]");
const status = document.querySelector("[data-reservation-status]");
const items = [];

const money = new Intl.NumberFormat("kk-KZ", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0
});

function closeNav() {
  nav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
}

navToggle.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(open));
});

nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeNav();
});

function renderBag() {
  count.textContent = String(items.length);
  empty.hidden = items.length > 0;
  totalWrap.hidden = items.length === 0;
  list.replaceChildren();

  items.forEach((item, index) => {
    const row = document.createElement("li");
    const label = document.createElement("span");
    const price = document.createElement("strong");
    const remove = document.createElement("button");

    label.textContent = item.name;
    price.textContent = money.format(item.price);
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Remove ${item.name}`);
    remove.addEventListener("click", () => {
      items.splice(index, 1);
      status.textContent = `${item.name} removed.`;
      renderBag();
    });

    row.append(label, price, remove);
    list.append(row);
  });

  total.textContent = money.format(items.reduce((sum, item) => sum + item.price, 0));
}

document.querySelectorAll("[data-add-item]").forEach((button) => {
  button.addEventListener("click", () => {
    const item = { name: button.dataset.addItem, price: Number(button.dataset.price) };
    items.push(item);
    button.classList.add("added");
    button.setAttribute("aria-pressed", "true");
    button.textContent = "Added";
    window.setTimeout(() => {
      button.classList.remove("added");
      button.setAttribute("aria-pressed", "false");
      button.textContent = "Add";
    }, 900);
    renderBag();
  });
});

document.querySelectorAll("[data-add-item]").forEach((button) => {
  button.setAttribute("aria-pressed", "false");
});

document.querySelectorAll("[data-open-bag]").forEach((button) => {
  button.addEventListener("click", () => {
    status.textContent = "";
    dialog.showModal();
  });
});

document.querySelectorAll("[data-close-bag]").forEach((button) => {
  button.addEventListener("click", () => dialog.close());
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector("[data-reserve]").addEventListener("click", () => {
  status.textContent = "Your demo reservation is ready. In a real shop, this would continue to checkout.";
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
document.querySelector("[data-year]").textContent = String(new Date().getFullYear());
renderBag();
