(function () {
  "use strict";

  const CART_KEY = "hours25_cart";
  const REMOVED_CART_IDS = new Set(["rc06", "t93"]);

  const itemListEl = document.querySelector("[data-cart-item-list]");
  if (!itemListEl) return;

  const layoutEl = document.querySelector("[data-cart-layout]");
  const emptyEl = document.querySelector("[data-cart-empty]");
  const subLabelEl = document.querySelector("[data-cart-sub-label]");
  const subtotalEl = document.querySelector("[data-cart-subtotal]");

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          const cleaned = data.filter((item) => !REMOVED_CART_IDS.has(item.id));
          if (cleaned.length !== data.length) {
            localStorage.setItem(CART_KEY, JSON.stringify(cleaned));
          }
          const items = cleaned.map((item) => ({ ...item }));
          const catalog = window.HOURS25_CATALOG;
          if (catalog && catalog.repairCartItems(items)) {
            try {
              localStorage.setItem(CART_KEY, JSON.stringify(items));
            } catch (_) {
              /* ignore */
            }
          }
          return items;
        }
      }
    } catch (_) {
      /* ignore */
    }
    return [];
  }

  function itemImage(item) {
    const catalog = window.HOURS25_CATALOG;
    return (catalog && catalog.resolveProductImage(item)) || item.img || "";
  }

  let cartItems = loadCart();

  function formatMoney(n) {
    return (
      "$" +
      n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
      " USD"
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function persistCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch (_) {
      /* ignore */
    }
    window.dispatchEvent(new Event("hours25:cart-change"));
  }

  function cartTotals() {
    const count = cartItems.reduce((sum, item) => sum + item.qty, 0);
    const sub = cartItems.reduce((sum, item) => sum + item.qty * item.price, 0);
    return { count, sub };
  }

  function render() {
    const { count, sub } = cartTotals();
    const isEmpty = cartItems.length === 0;

    if (layoutEl) layoutEl.hidden = isEmpty;
    if (emptyEl) emptyEl.hidden = !isEmpty;

    if (subLabelEl) {
      subLabelEl.textContent = "Subtotal · " + count + (count === 1 ? " item" : " items");
    }
    if (subtotalEl) subtotalEl.textContent = formatMoney(sub);

    itemListEl.innerHTML = "";
    cartItems.forEach((item) => {
      const li = document.createElement("li");
      li.className = "cart-item";
      li.dataset.cartId = item.id;
      const titleHtml = item.href
        ? `<h3 class="cart-item-title"><a href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a></h3>`
        : `<h3 class="cart-item-title">${escapeHtml(item.title)}</h3>`;
      li.innerHTML = `
        <div class="cart-item-product">
          <div class="cart-item-photo">
            <img src="${escapeHtml(itemImage(item))}" alt="" width="96" height="96" loading="lazy" />
          </div>
          <div class="cart-item-info">
            ${titleHtml}
            <p class="cart-item-unit">${formatMoney(item.price)} each</p>
            <button type="button" class="cart-item-remove" data-cart-remove>Remove</button>
          </div>
        </div>
        <div class="cart-item-qty" role="group" aria-label="Quantity">
          <button type="button" class="cart-item-qty-btn" data-cart-dec aria-label="Decrease quantity">−</button>
          <span class="cart-item-qty-value">${item.qty}</span>
          <button type="button" class="cart-item-qty-btn" data-cart-inc aria-label="Increase quantity">+</button>
        </div>
        <div class="cart-item-total">${formatMoney(item.qty * item.price)}</div>
      `;
      itemListEl.appendChild(li);
    });
  }

  function changeQty(id, delta) {
    const index = cartItems.findIndex((item) => item.id === id);
    if (index === -1) return;
    cartItems[index].qty += delta;
    if (cartItems[index].qty <= 0) cartItems.splice(index, 1);
    persistCart();
    render();
  }

  function removeItem(id) {
    cartItems = cartItems.filter((item) => item.id !== id);
    persistCart();
    render();
  }

  itemListEl.addEventListener("click", (e) => {
    const row = e.target.closest(".cart-item[data-cart-id]");
    if (!row) return;
    const id = row.dataset.cartId;
    if (e.target.closest("[data-cart-inc]")) changeQty(id, 1);
    else if (e.target.closest("[data-cart-dec]")) changeQty(id, -1);
    else if (e.target.closest("[data-cart-remove]")) removeItem(id);
  });

  window.addEventListener("hours25:cart-change", () => {
    cartItems = loadCart();
    render();
  });

  render();
})();
