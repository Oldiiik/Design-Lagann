const products = new Map(
  [...document.querySelectorAll("[data-product-id]")].map((element) => [
    element.dataset.productId,
    {
      id: element.dataset.productId,
      name: element.dataset.name,
      price: Number(element.dataset.price),
      quantity: 0,
      element
    }
  ])
);

const bagDialog = document.querySelector("#bag-dialog");
const bagEmpty = document.querySelector("[data-bag-empty]");
const reservationForm = document.querySelector("[data-reservation-form]");
const successState = document.querySelector("[data-success-state]");
const bagItems = document.querySelector("[data-bag-items]");
const liveStatus = document.querySelector("[data-live-status]");
const mobileBag = document.querySelector(".mobile-bag");
const pickupCta = document.querySelector("[data-pickup-cta]");

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

function bagCount() {
  return [...products.values()].reduce((sum, product) => sum + product.quantity, 0);
}

function bagTotal() {
  return [...products.values()].reduce(
    (sum, product) => sum + product.quantity * product.price,
    0
  );
}

function announce(message) {
  liveStatus.textContent = "";
  window.requestAnimationFrame(() => {
    liveStatus.textContent = message;
  });
}

function setQuantity(id, quantity, shouldAnnounce = true) {
  const product = products.get(id);
  if (!product) return;

  product.quantity = Math.max(0, Math.min(8, quantity));
  render();

  if (shouldAnnounce) {
    const action = product.quantity === 0 ? "Removed" : "Updated";
    announce(`${action} ${product.name}. ${bagCount()} items in bag.`);
  }
}

function renderProductControls(product) {
  const addButton = product.element.querySelector(".add-button");
  const stepper = product.element.querySelector("[data-stepper]");
  const output = product.element.querySelector("[data-quantity]");

  addButton.hidden = product.quantity > 0;
  stepper.hidden = product.quantity === 0;
  output.textContent = String(product.quantity);
}

function renderBagItems() {
  bagItems.replaceChildren();

  for (const product of products.values()) {
    if (product.quantity === 0) continue;

    const item = document.createElement("li");
    item.className = "bag-item";
    item.innerHTML = `
      <p class="bag-item-name">${product.name}</p>
      <p class="bag-item-price">${money.format(product.quantity * product.price)}</p>
      <div class="bag-item-control">
        <button type="button" data-dialog-remove="${product.id}" aria-label="Remove one ${product.name}">−</button>
        <output aria-label="${product.quantity} ${product.name} in bag">${product.quantity}</output>
        <button type="button" data-dialog-add="${product.id}" aria-label="Add one ${product.name}">+</button>
      </div>
    `;
    bagItems.append(item);
  }
}

function render() {
  const count = bagCount();
  const total = bagTotal();
  const totalLabel = money.format(total);
  const selectedNames = [...products.values()]
    .filter((product) => product.quantity > 0)
    .map((product) => `${product.quantity} ${product.name}`)
    .join(", ");

  for (const product of products.values()) renderProductControls(product);

  for (const countNode of document.querySelectorAll("[data-bag-count]")) {
    countNode.textContent = String(count);
    countNode.setAttribute("aria-label", `${count} ${count === 1 ? "item" : "items"}`);
  }

  document.querySelector("[data-mobile-count]").textContent = String(count);
  document.querySelector("[data-mobile-total]").textContent = totalLabel;
  document.querySelector("[data-bag-total]").textContent = totalLabel;
  document.querySelector("[data-dialog-total]").textContent = totalLabel;
  document.querySelector("[data-reserve-total]").textContent = totalLabel;
  document.querySelector("[data-slip-summary]").textContent =
    count === 0 ? "No pastries selected yet." : selectedNames;

  pickupCta.textContent =
    count === 0 ? "Choose from today" : `Reserve ${count} ${count === 1 ? "pastry" : "pastries"}`;

  mobileBag.hidden = count === 0;
  bagEmpty.hidden = count > 0;
  reservationForm.hidden = count === 0;
  renderBagItems();
}

function openBag() {
  successState.hidden = true;
  if (typeof bagDialog.showModal === "function") {
    if (!bagDialog.open) bagDialog.showModal();
  } else {
    bagDialog.setAttribute("open", "");
  }
}

function closeBag() {
  if (typeof bagDialog.close === "function") {
    bagDialog.close();
  } else {
    bagDialog.removeAttribute("open");
  }
}

for (const product of products.values()) {
  product.element.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add]");
    const removeButton = event.target.closest("[data-remove]");

    if (addButton) setQuantity(product.id, product.quantity + 1);
    if (removeButton) setQuantity(product.id, product.quantity - 1);
  });
}

bagItems.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-dialog-add]");
  const removeButton = event.target.closest("[data-dialog-remove]");

  if (addButton) {
    const product = products.get(addButton.dataset.dialogAdd);
    setQuantity(product.id, product.quantity + 1);
  }

  if (removeButton) {
    const product = products.get(removeButton.dataset.dialogRemove);
    setQuantity(product.id, product.quantity - 1);
  }
});

for (const trigger of document.querySelectorAll("[data-open-bag]")) {
  trigger.addEventListener("click", openBag);
}

document.querySelector("[data-close-bag]").addEventListener("click", closeBag);

document.querySelector("[data-shop-now]").addEventListener("click", () => {
  closeBag();
  document.querySelector("#today").scrollIntoView({ block: "start" });
});

pickupCta.addEventListener("click", () => {
  if (bagCount() === 0) {
    document.querySelector("#today").scrollIntoView({ block: "start" });
    return;
  }

  openBag();
});

reservationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (bagCount() === 0) return;

  const data = new FormData(reservationForm);
  const pickupDay = data.get("pickup-day");
  const pickupTime = data.get("pickup-time");
  const reservationCode = `SC-${String(Date.now()).slice(-3)}`;

  document.querySelector("[data-success-day]").textContent = pickupDay;
  document.querySelector("[data-success-time]").textContent = pickupTime;
  document.querySelector("[data-reservation-code]").textContent = reservationCode;

  reservationForm.hidden = true;
  bagEmpty.hidden = true;
  successState.hidden = false;

  for (const product of products.values()) {
    product.quantity = 0;
  }
  render();

  reservationForm.hidden = true;
  bagEmpty.hidden = true;
  successState.hidden = false;
  successState.querySelector("[data-finish]").focus();
  announce(`Reservation ${reservationCode} confirmed for ${pickupDay}, ${pickupTime}.`);
});

document.querySelector("[data-finish]").addEventListener("click", () => {
  successState.hidden = true;
  bagEmpty.hidden = false;
  closeBag();
});

bagDialog.addEventListener("click", (event) => {
  if (event.target === bagDialog) closeBag();
});

render();
