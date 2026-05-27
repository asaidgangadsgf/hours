(function () {
  "use strict";

  const CART_KEY = "hours25_cart";

  const REMOVED_CART_IDS = new Set(["rc06", "t93"]);

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

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
          const items = cleaned.map((i) => ({ ...i }));
          const catalog = window.HOURS25_CATALOG;
          if (catalog && catalog.repairCartItems(items)) {
            try {
              localStorage.setItem(CART_KEY, JSON.stringify(items));
            } catch (_) {}
          }
          return items;
        }
      }
    } catch (_) {}
    return [];
  }

  function itemImage(item) {
    const catalog = window.HOURS25_CATALOG;
    return (catalog && catalog.resolveProductImage(item)) || item.img || "";
  }

  function money(n) {
    return "$" + n.toFixed(2);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const cart = loadCart();

  /* —— Order summary —— */
  const productsEl = $("[data-co-products]");
  const emptyEl = $("[data-co-empty]");
  const subLabel = $("[data-co-sub-label]");
  const subEl = $("[data-co-sub]");
  const shipPriceEl = $("[data-co-ship-price]");
  const totalEl = $("[data-co-total]");

  function itemCount() {
    return cart.reduce((n, i) => n + i.qty, 0);
  }

  function subtotal() {
    return cart.reduce((n, i) => n + i.qty * i.price, 0);
  }

  function renderProducts() {
    if (!productsEl) return;

    productsEl.innerHTML = "";
    if (!cart.length) {
      if (emptyEl) emptyEl.hidden = false;
      refreshTotals();
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    cart.forEach((item) => {
      const li = document.createElement("li");
      li.className = "co-product";
      li.innerHTML = `
        <div class="co-product__media">
          <img src="${esc(itemImage(item))}" alt="" loading="lazy" />
          <span class="co-product__qty">${item.qty}</span>
        </div>
        <p class="co-product__name">${esc(item.title)}</p>
        <span class="co-product__price">${money(item.qty * item.price)}</span>
      `;
      productsEl.appendChild(li);
    });
    refreshTotals();
  }

  /* —— Shipping address → methods —— */
  const shipFields = $$("[data-co-ship]");
  const shipHint = $("[data-co-ship-hint]");
  const shipList = $("[data-co-ship-list]");
  const shipOpts = $$("[data-co-ship-opt]");

  function addressReady() {
    const ids = ["co-country", "co-fname", "co-lname", "co-address", "co-city", "co-state", "co-zip"];
    return ids.every((id) => {
      const el = document.getElementById(id);
      return el && String(el.value || "").trim() !== "";
    });
  }

  function shippingFee() {
    if (!addressReady()) return null;
    const checked = $('input[name="shipMethod"]:checked');
    if (!checked) return 5.99;
    const row = checked.closest("[data-co-ship-opt]");
    return row ? parseFloat(row.dataset.rate, 10) : 5.99;
  }

  function refreshTotals() {
    const count = itemCount();
    const sub = subtotal();
    const ship = shippingFee();

    if (subLabel) {
      subLabel.textContent = "Subtotal . " + count + (count === 1 ? " item" : " items");
    }
    if (subEl) subEl.textContent = money(sub);
    if (shipPriceEl) {
      shipPriceEl.textContent = ship === null ? "Enter shipping address" : money(ship);
    }
    if (totalEl) totalEl.textContent = money(sub + (ship === null ? 0 : ship));
  }

  function refreshShipping() {
    const ready = addressReady();
    if (shipHint) shipHint.hidden = ready;
    if (shipList) {
      shipList.hidden = !ready;
    }
    refreshTotals();
  }

  shipFields.forEach((f) => {
    f.addEventListener("input", refreshShipping);
    f.addEventListener("change", refreshShipping);
  });

  if (shipList) {
    shipList.addEventListener("change", (e) => {
      if (e.target.name !== "shipMethod") return;
      shipOpts.forEach((opt) => {
        opt.classList.toggle("is-on", opt.contains(e.target));
      });
      refreshTotals();
    });
  }

  /* —— Payment: slide message + reorder —— */
  const payBox = $("[data-co-pay]");
  const payRows = $$("[data-co-pay-row]");
  const payRadios = $$('input[name="payment"]');
  function setPayment(mode) {
    if (payBox) payBox.dataset.payMode = mode;

    payRows.forEach((row) => {
      row.classList.toggle("is-on", row.dataset.coPayRow === mode);
    });
  }

  payRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) setPayment(radio.value);
    });
  });

  /* Click entire row */
  payRows.forEach((row) => {
    row.addEventListener("click", (e) => {
      const input = row.querySelector('input[type="radio"]');
      if (input && e.target !== input) {
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });

  /* —— Card brands: click frame to slide icons —— */
  const CARD_SLOT = 39; /* 36px card + 3px gap */
  const CARD_VISIBLE = 3;
  const cardBrands = $("[data-co-card-brands]");
  const cardFrame = $("[data-co-card-frame]");
  const cardTrack = $("[data-co-card-track]");
  let cardOffset = 0;

  function initCardBrands() {
    if (!cardBrands || !cardTrack) return;
    const cards = $$(".co-card", cardTrack);
    const overflow = cards.length > CARD_VISIBLE;
    cardBrands.classList.toggle("is-overflow", overflow);
    if (!overflow) {
      cardOffset = 0;
      cardTrack.style.transform = "";
      return;
    }
    const maxOffset = (cards.length - CARD_VISIBLE) * CARD_SLOT;
    cardOffset = Math.min(cardOffset, maxOffset);
    cardTrack.style.transform = "translateX(-" + cardOffset + "px)";
  }

  function slideCardBrands() {
    if (!cardTrack) return;
    const cards = $$(".co-card", cardTrack);
    if (cards.length <= CARD_VISIBLE) return;
    const maxOffset = (cards.length - CARD_VISIBLE) * CARD_SLOT;
    cardOffset = cardOffset >= maxOffset ? 0 : cardOffset + CARD_SLOT;
    cardTrack.style.transform = "translateX(-" + cardOffset + "px)";
  }

  if (cardFrame) {
    cardFrame.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      slideCardBrands();
    });
    cardFrame.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      slideCardBrands();
    });
  }

  /* —— Billing expand —— */
  const billBox = $("[data-co-bill]");
  const billRows = $$("[data-co-bill-row]");
  const billExpand = $("[data-co-bill-expand]");
  const billInner = billExpand ? $(".co-bill-expand__inner", billExpand) : null;
  const billRadios = $$('input[name="billing"]');

  function billExpandHeight() {
    if (!billInner) return 0;
    return billInner.scrollHeight;
  }

  function setBilling(mode) {
    billRows.forEach((row) => {
      row.classList.toggle("is-on", row.dataset.coBillRow === mode);
    });
    if (!billExpand) return;

    const open = mode === "different";
    if (open) {
      billExpand.classList.add("is-open");
      billExpand.style.maxHeight = "0";
      requestAnimationFrame(() => {
        billExpand.style.maxHeight = billExpandHeight() + "px";
      });
      return;
    }

    billExpand.style.maxHeight = billExpandHeight() + "px";
    requestAnimationFrame(() => {
      billExpand.style.maxHeight = "0";
    });
  }

  function refreshBillExpand() {
    if (billExpand && billExpand.classList.contains("is-open")) {
      billExpand.style.maxHeight = billExpandHeight() + "px";
    }
  }

  if (billExpand) {
    billExpand.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "max-height") return;
      if (billExpand.style.maxHeight === "0px" || billExpand.style.maxHeight === "0") {
        billExpand.classList.remove("is-open");
      }
    });
  }

  window.addEventListener("resize", refreshBillExpand);

  billRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      if (radio.checked) setBilling(radio.value);
    });
  });

  billRows.forEach((row) => {
    row.addEventListener("click", (e) => {
      const input = row.querySelector('input[type="radio"]');
      if (input && e.target !== input) {
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });

  /* —— Init —— */
  const form = $("[data-co-form]");
  if (form) form.addEventListener("submit", (e) => e.preventDefault());

  renderProducts();
  refreshShipping();
  setPayment("paypal");
  setBilling("same");
  initCardBrands();
})();
