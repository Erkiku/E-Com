const state = { products: [], cart: {}, promo: 0, step: 1, transactions: JSON.parse(localStorage.getItem("ecomTransactions") || "[]") };
const money = (value) => `₹${value.toFixed(2)}`;
const $ = (selector) => document.querySelector(selector);

async function loadProducts() {
  const response = await fetch("./products.json");
  state.products = await response.json();
  renderProducts();
  renderCart();
}

function renderProducts() {
  $("#productGrid").innerHTML = state.products
    .map(
      (product, index) => `
		<article class="product-card" style="--product-color:${product.color};--delay:${index * 70}ms">
      <div class="product-image"><img src="${product.image}" alt="${product.name}" loading="lazy"><span class="image-fallback">${product.icon}</span><button class="quick-add" data-add="${product.id}" type="button">Add to bag <b>+</b></button></div>
      <div class="product-info"><div><h3>${product.name}</h3><p>${product.category}</p></div><strong>${money(product.price)}</strong></div>
      <button class="buy-now" data-buy="${product.id}" type="button">Buy now <span>↗</span></button>
			<div class="product-meta"><span>★★★★★ <small>${product.rating}</small></span><p>${product.description}</p></div>
		</article>`,
    )
    .join("");
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => ({
      product: state.products.find((item) => item.id === Number(id)),
      quantity,
    }))
    .filter((entry) => entry.product);
}

function renderCart() {
  const entries = cartEntries();
  const count = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  $("#cartCount").textContent = count;
  $("#drawerCount").textContent = `(${count})`;
  $("#emptyCart").hidden = entries.length > 0;
  $("#cartSummary").hidden = entries.length === 0;
  $("#cartItems").innerHTML = entries
    .map(
      ({ product, quantity }) =>
        `<div class="cart-item"><div class="cart-item-art" style="--product-color:${product.color}"><img src="${product.image}" alt="${product.name}"></div><div class="cart-item-copy"><h3>${product.name}</h3><p>${money(product.price)}</p><div class="quantity"><button data-minus="${product.id}" type="button" aria-label="Decrease ${product.name}">−</button><span>${quantity}</span><button data-plus="${product.id}" type="button" aria-label="Increase ${product.name}">+</button></div></div><button class="remove-item" data-remove="${product.id}" type="button" aria-label="Remove ${product.name}">×</button></div>`,
    )
    .join("");
  document
    .querySelectorAll("[data-plus]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        changeQuantity(Number(button.dataset.plus), 1),
      ),
    );
  document
    .querySelectorAll("[data-minus]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        changeQuantity(Number(button.dataset.minus), -1),
      ),
    );
  document.querySelectorAll("[data-remove]").forEach((button) =>
    button.addEventListener("click", () => {
      delete state.cart[button.dataset.remove];
      renderCart();
    }),
  );
  updateTotals();
}

function changeQuantity(id, amount) {
  state.cart[id] = (state.cart[id] || 0) + amount;
  if (state.cart[id] <= 0) delete state.cart[id];
  renderCart();
}

function buyNow(id) {
  state.cart = { [id]: 1 };
  state.promo = 0;
  renderCart();
  openCheckout();
}

function renderSummary() {
  const entries = cartEntries();
  $("#summaryContent").innerHTML = entries.length
    ? `<div class="info-items">${entries.map(({ product, quantity }) => `<div class="info-item"><span>${product.name} × ${quantity}</span><strong>${money(product.price * quantity)}</strong></div>`).join("")}</div><div class="info-total"><span>Current total</span><strong>${$("#total").textContent}</strong></div><button class="primary-button info-continue" type="button">Continue shopping <span>↗</span></button>`
    : '<p class="info-empty">Your order summary is empty. Add a product to begin.</p>';
}

function renderHistory() {
  $("#historyContent").innerHTML = state.transactions.length
    ? state.transactions.map((transaction) => `<div class="history-item"><div><strong>${transaction.id}</strong><small>${transaction.date}</small></div><strong>${money(transaction.total)}</strong><span>${transaction.items} item${transaction.items === 1 ? "" : "s"}</span></div>`).join("")
    : '<p class="info-empty">No completed transactions yet.</p>';
}

function openInfoModal(id) {
  if (id === "summaryModal") renderSummary();
  if (id === "historyModal") renderHistory();
  $("#" + id).hidden = false;
}

function updateTotals() {
  const subtotal = cartEntries().reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0,
  );
  const discount = subtotal * state.promo;
  $("#subtotal").textContent = money(subtotal);
  $("#discount").textContent = `-${money(discount)}`;
  $("#discountLine").hidden = discount === 0;
  $("#tax").textContent = money((subtotal - discount) * 0.08);
  $("#total").textContent = money((subtotal - discount) * 1.08);
}

function toggleCart(open) {
  $("#cartDrawer").classList.toggle("open", open);
  $("#drawerBackdrop").hidden = !open;
  $("#cartDrawer").setAttribute("aria-hidden", String(!open));
  $("#cartTrigger").setAttribute("aria-expanded", String(open));
}

function validateStep(step) {
  const fields = [
    ...document.querySelectorAll(`.checkout-step[data-step="${step}"] input`),
  ].filter((input) => input.offsetParent !== null);
  let valid = true;
  fields.forEach((field) => {
    let message = field.value.trim() ? "" : "This field is required";
    if (
      field.id === "email" &&
      field.value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)
    )
      message = "Enter a valid email address";
    if (
      field.id === "cardNumber" &&
      field.value.replace(/\s/g, "") !== "4242424242424242"
    )
      message = "Use the dummy card shown below";
    if (
      field.id === "expiry" &&
      field.value &&
      !/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(field.value)
    )
      message = "Use MM / YY";
    if (field.id === "cvv" && field.value && !/^\d{3,4}$/.test(field.value))
      message = "Enter 3 or 4 digits";
    field.classList.toggle("invalid", Boolean(message));
    field.nextElementSibling.textContent = message;
    if (message) valid = false;
  });
  return valid;
}

function showStep(step) {
  state.step = step;
  document
    .querySelectorAll(".checkout-step")
    .forEach((item) =>
      item.classList.toggle("active", Number(item.dataset.step) === step),
    );
  document
    .querySelectorAll("[data-step-dot]")
    .forEach((dot) =>
      dot.classList.toggle("active", Number(dot.dataset.stepDot) <= step),
    );
  $("#checkoutKicker").textContent =
    step === 3
      ? "One last look"
      : step === 2
        ? "Payment details"
        : "Almost yours";
  $("#checkoutTitle").textContent =
    step === 3
      ? "Ready to make it yours?"
      : step === 2
        ? "How will you pay?"
        : "Where should we send it?";
}

function openCheckout() {
  toggleCart(false);
  $("#checkoutModal").hidden = false;
  $("#checkoutForm").hidden = false;
  $("#checkoutKicker").hidden = false;
  $("#checkoutTitle").hidden = false;
  $(".checkout-progress").hidden = false;
  $("#successState").hidden = true;
  showStep(1);
}

document.addEventListener("input", (event) => {
  if (event.target.id === "cardNumber")
    event.target.value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 16)
      .replace(/(.{4})/g, "$1 ")
      .trim();
  if (event.target.id === "expiry")
    event.target.value = event.target.value
      .replace(/\D/g, "")
      .slice(0, 4)
      .replace(/(.{2})/, "$1 / ");
  if (event.target.classList.contains("invalid")) validateStep(state.step);
});
$("#productGrid").addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add]");
  const buyButton = event.target.closest("[data-buy]");
  if (addButton) changeQuantity(Number(addButton.dataset.add), 1);
  if (buyButton) buyNow(Number(buyButton.dataset.buy));
});
document.addEventListener("click", (event) => {
  if (event.target.matches(".next-step")) {
    if (validateStep(state.step)) {
      if (state.step === 2) {
        const total = $("#total").textContent;
        $("#reviewBox").innerHTML =
          `<p>Shipping to <strong>${$("#fullName").value}</strong><br>${$("#address").value}, ${$("#city").value} ${$("#postcode").value}</p><div><span>Order total</span><strong>${total}</strong></div>`;
      }
      showStep(state.step + 1);
    }
  }
  if (event.target.matches(".back-button")) showStep(state.step - 1);
});
$("#cartTrigger").addEventListener("click", () => toggleCart(true));
$("#closeCart").addEventListener("click", () => toggleCart(false));
$("#drawerBackdrop").addEventListener("click", () => toggleCart(false));
$("#startShopping").addEventListener("click", () => toggleCart(false));
$("#checkoutButton").addEventListener("click", openCheckout);
$("#closeCheckout").addEventListener("click", () => {
  $("#checkoutModal").hidden = true;
});
$("#doneButton").addEventListener("click", () => {
  $("#checkoutModal").hidden = true;
});
$("#applyPromo").addEventListener("click", () => {
  const code = $("#promoCode").value.trim().toUpperCase();
  state.promo = code === "SAVE20" ? 0.2 : 0;
  $("#promoMessage").textContent = state.promo
    ? "20% discount applied."
    : "That code is not valid.";
  $("#promoMessage").className = state.promo ? "success-text" : "error-text";
  updateTotals();
});
$("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  if (validateStep(2)) {
    $("#checkoutForm").hidden = true;
    $("#checkoutKicker").hidden = true;
    $("#checkoutTitle").hidden = true;
    $(".checkout-progress").hidden = true;
    $("#successState").hidden = false;
    const total = Number($("#total").textContent.replace("₹", ""));
    const items = cartEntries().reduce((sum, entry) => sum + entry.quantity, 0);
    state.transactions.unshift({ id: `EC-${Date.now().toString().slice(-6)}`, date: new Date().toLocaleDateString("en-IN"), total, items });
    localStorage.setItem("ecomTransactions", JSON.stringify(state.transactions.slice(0, 20)));
    state.cart = {};
    renderCart();
  }
});
$("#summaryTrigger").addEventListener("click", () => openInfoModal("summaryModal"));
$("#historyTrigger").addEventListener("click", () => openInfoModal("historyModal"));
document.querySelectorAll("[data-close-info]").forEach((button) => button.addEventListener("click", () => { $("#" + button.dataset.closeInfo).hidden = true; }));
document.querySelectorAll(".info-modal").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) modal.hidden = true; }));
loadProducts().catch(() => {
  $("#productGrid").innerHTML =
    '<p class="load-error">Products could not be loaded. Please refresh the page.</p>';
});

$("#newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();
  $("#newsletterMessage").textContent = "You're on the list. Welcome to E-Com.";
  $("#newsletterEmail").value = "";
});
