(function () {
  "use strict";

  const CART_KEY = "hours25_cart";

  const REMOVED_CART_IDS = new Set(["rc06", "t93"]);

  function repairStoredCart(items) {
    const catalog = window.HOURS25_CATALOG;
    if (!catalog || !Array.isArray(items)) return items;
    if (catalog.repairCartItems(items)) {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
      } catch (_) {
        /* ignore */
      }
    }
    return items;
  }

  function loadStoredCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((item) => !REMOVED_CART_IDS.has(item.id));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(CART_KEY, JSON.stringify(cleaned));
          }
          return repairStoredCart(cleaned.map((item) => ({ ...item })));
        }
      }
    } catch (_) {
      /* ignore */
    }
    return null;
  }

  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    } catch (_) {
      /* ignore */
    }
  }

  function notifyCartChange() {
    window.dispatchEvent(new Event("hours25:cart-change"));
  }

  const formatMoney = (n) =>
    "$" +
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    " USD";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* —— 搜索：弹层 + 产品联想 —— */
  const searchWrap = document.querySelector("[data-search-wrap]");
  const searchToggle = document.querySelector("[data-search-toggle]");
  const searchDropdown = document.querySelector("[data-search-dropdown]");
  const searchPanel = document.querySelector("[data-search-panel]");
  const searchInput = document.querySelector("[data-search-input]");
  const searchResults = document.querySelector("[data-search-results]");

  function buildProductIndexFromPage() {
    return Array.from(document.querySelectorAll("[data-product-card]"))
      .map((card, index) => {
        const link =
          card.querySelector(".product-card-link") ||
          card.querySelector(".manual-product");
        const titleEl =
          card.querySelector(".product-title") ||
          card.querySelector(".manual-product__name");
        const imgEl =
          card.querySelector(".product-img.img-a") ||
          card.querySelector(".product-thumb img") ||
          card.querySelector(".manual-product__photo img");
        const priceEl = card.querySelector(".product-price strong");
        return {
          id: (link && link.getAttribute("href")) || "#p" + (index + 1),
          title: (titleEl && titleEl.textContent.trim()) || "",
          href: (link && link.getAttribute("href")) || "#featured",
          img: (imgEl && imgEl.getAttribute("src")) || "",
          price: (priceEl && priceEl.textContent.trim()) || "",
        };
      })
      .filter((product) => /_Product Details\//i.test(product.href));
  }

  const catalogSearch = window.HOURS25_CATALOG && window.HOURS25_CATALOG.SEARCH_PRODUCTS;
  const PRODUCT_INDEX =
    catalogSearch && catalogSearch.length
      ? catalogSearch.slice()
      : buildProductIndexFromPage();

  function normalizeQuery(q) {
    return String(q || "")
      .trim()
      .toLowerCase();
  }

  function productMatches(product, query) {
    const haystack = [product.title, product.keywords, product.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.includes(term));
  }

  function filterProducts(query) {
    const q = normalizeQuery(query);
    if (!q) return [];
    return PRODUCT_INDEX.filter((product) => productMatches(product, q));
  }

  function renderSearchResults(query) {
    if (!searchResults) return;
    const matches = filterProducts(query);
    const q = normalizeQuery(query);

    searchResults.innerHTML = "";
    if (!q) {
      searchResults.setAttribute("hidden", "");
      return;
    }

    searchResults.removeAttribute("hidden");
    if (matches.length === 0) {
      const li = document.createElement("li");
      li.className = "search-result-empty";
      li.setAttribute("role", "presentation");
      li.textContent = "No products found.";
      searchResults.appendChild(li);
      return;
    }

    matches.forEach((product) => {
      const li = document.createElement("li");
      li.className = "search-result-item";
      li.setAttribute("role", "option");
      li.innerHTML = `
        <a href="${escapeHtml(product.href)}">
          <img class="search-result-thumb" src="${escapeHtml(product.img)}" alt="" width="48" height="48" />
          <div class="search-result-body">
            <div class="search-result-title">${escapeHtml(product.title)}</div>
            <p class="search-result-price">${escapeHtml(product.price)}</p>
          </div>
        </a>
      `;
      searchResults.appendChild(li);
    });
  }

  function setSearchOpen(open) {
    if (!searchWrap || !searchDropdown || !searchToggle) return;
    searchWrap.classList.toggle("is-open", open);
    searchToggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      setNavOpen(false, { instant: true });
      searchDropdown.removeAttribute("hidden");
      requestAnimationFrame(() => searchInput && searchInput.focus());
    } else {
      searchDropdown.setAttribute("hidden", "");
      if (searchInput) searchInput.value = "";
      renderSearchResults("");
    }
  }

  /* —— 移动端导航抽屉 —— */
  const siteHeader = document.querySelector(".site-header");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const mainNav = document.querySelector("[data-main-nav]");
  const navOverlay = document.querySelector("[data-nav-overlay]");

  const NAV_MOBILE_MQ = window.matchMedia("(max-width: 1024px)");

  function setNavOpen(open, options) {
    if (!siteHeader) return;
    const animate = !(options && options.instant);
    const wasOpen = siteHeader.classList.contains("is-nav-open");

    if (!open && wasOpen && animate && NAV_MOBILE_MQ.matches) {
      siteHeader.classList.add("nav-drawer-animating");
      siteHeader.classList.remove("is-nav-open");
      if (navToggle) {
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      }
      if (navOverlay) {
        navOverlay.classList.remove("is-open");
      }
      document.body.classList.remove("nav-open");
      return;
    }

    siteHeader.classList.remove("nav-drawer-animating");
    siteHeader.classList.toggle("is-nav-open", open);
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (navOverlay) {
      navOverlay.hidden = !open;
      navOverlay.classList.toggle("is-open", open);
    }
    if (mainNav) {
      mainNav.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (open) {
      setSearchOpen(false);
      document.body.classList.add("nav-open");
    } else {
      document.body.classList.remove("nav-open");
    }
    syncNavAccessibility();
  }

  function syncNavAccessibility() {
    if (!mainNav || !siteHeader) return;
    if (!NAV_MOBILE_MQ.matches) {
      mainNav.removeAttribute("aria-hidden");
      return;
    }
    if (!siteHeader.classList.contains("is-nav-open")) {
      mainNav.setAttribute("aria-hidden", "true");
    }
  }

  if (navToggle && mainNav) {
    syncNavAccessibility();

    mainNav.addEventListener("transitionend", (e) => {
      if (e.propertyName !== "transform" || !siteHeader.classList.contains("nav-drawer-animating")) {
        return;
      }
      siteHeader.classList.remove("nav-drawer-animating");
      if (navOverlay) {
        navOverlay.hidden = true;
      }
      if (mainNav) {
        mainNav.setAttribute("aria-hidden", "true");
      }
    });

    navToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      setNavOpen(!siteHeader.classList.contains("is-nav-open"));
    });
    if (navOverlay) navOverlay.addEventListener("click", () => setNavOpen(false));
    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setNavOpen(false));
    });
    window.addEventListener("resize", () => {
      if (!NAV_MOBILE_MQ.matches) {
        setNavOpen(false, { instant: true });
      } else if (!siteHeader.classList.contains("is-nav-open")) {
        siteHeader.classList.remove("nav-drawer-animating");
        if (navOverlay) {
          navOverlay.hidden = true;
          navOverlay.classList.remove("is-open");
        }
      }
      syncNavAccessibility();
    });
  }

  if (searchToggle && searchDropdown) {
    searchToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = !searchWrap.classList.contains("is-open");
      setSearchOpen(open);
    });

    document.addEventListener("click", (e) => {
      if (searchWrap && !searchWrap.contains(e.target)) setSearchOpen(false);
    });

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        renderSearchResults(searchInput.value);
      });
    }

    if (searchPanel) {
      searchPanel.addEventListener("submit", (e) => {
        e.preventDefault();
        const firstLink = searchResults && searchResults.querySelector(".search-result-item a");
        if (firstLink) {
          firstLink.click();
          setSearchOpen(false);
        }
      });
    }

    if (searchResults) {
      searchResults.addEventListener("click", () => {
        setSearchOpen(false);
      });
    }
  }

  /* —— 购物车侧栏 —— */
  const cartOpenBtn = document.querySelector("[data-cart-open]");
  const cartCloseBtn = document.querySelector("[data-cart-close]");
  const cartDrawer = document.querySelector("[data-cart-drawer]");
  const cartOverlay = document.querySelector("[data-cart-overlay]");
  const cartLinesEl = document.querySelector("[data-cart-lines]");
  const cartBadge = document.querySelector("[data-cart-badge]");
  const cartCountLabel = document.querySelector("[data-cart-count-label]");
  const cartTotalEl = document.querySelector("[data-cart-total]");

  const stored = loadStoredCart();
  const cartItems = (stored ?? []).map((x) => ({ ...x }));

  function cartTotals() {
    const count = cartItems.reduce((s, i) => s + i.qty, 0);
    const sub = cartItems.reduce((s, i) => s + i.qty * i.price, 0);
    return { count, sub };
  }

  function renderCart() {
    const { count, sub } = cartTotals();
    if (cartBadge) {
      cartBadge.textContent = String(count);
      const empty = count === 0;
      cartBadge.classList.toggle("is-zero", empty);
      cartBadge.hidden = empty;
    }
    if (cartCountLabel) cartCountLabel.textContent = String(count);
    if (cartTotalEl) cartTotalEl.textContent = formatMoney(sub);
    saveCart();

    if (!cartLinesEl) return;
    cartLinesEl.innerHTML = "";
    if (cartItems.length === 0) {
      const li = document.createElement("li");
      li.className = "cart-line";
      li.style.gridTemplateColumns = "1fr";
      li.textContent = "Your cart is empty.";
      cartLinesEl.appendChild(li);
      return;
    }
    cartItems.forEach((item) => {
      const imgSrc =
        (window.HOURS25_CATALOG && window.HOURS25_CATALOG.resolveProductImage(item)) ||
        item.img ||
        "";
      if (imgSrc && item.img !== imgSrc) item.img = imgSrc;
      const li = document.createElement("li");
      li.className = "cart-line";
      li.dataset.cartId = item.id;
      const titleHtml = item.href
        ? `<a class="cart-line-title" href="${escapeHtml(item.href)}">${escapeHtml(item.title)}</a>`
        : `<div class="cart-line-title">${escapeHtml(item.title)}</div>`;
      li.innerHTML = `
        <img src="${escapeHtml(imgSrc)}" alt="" width="56" height="56" loading="lazy" />
        <div class="cart-line-body">
          ${titleHtml}
          <div class="cart-line-meta">${formatMoney(item.price)} each</div>
          <div class="cart-qty" role="group" aria-label="Quantity">
            <button type="button" class="cart-qty-btn" data-cart-dec aria-label="Decrease quantity">−</button>
            <span class="cart-qty-value" data-cart-qty-value>${item.qty}</span>
            <button type="button" class="cart-qty-btn" data-cart-inc aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="cart-line-price">${formatMoney(item.qty * item.price)}</div>
      `;
      cartLinesEl.appendChild(li);
    });
  }

  function changeCartQty(id, delta) {
    const index = cartItems.findIndex((item) => item.id === id);
    if (index === -1) return;
    const item = cartItems[index];
    item.qty += delta;
    if (item.qty <= 0) cartItems.splice(index, 1);
    renderCart();
    notifyCartChange();
  }

  function setCartOpen(open) {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.hidden = !open;
    cartOverlay.hidden = !open;
    cartDrawer.classList.toggle("is-open", open);
    cartOverlay.classList.toggle("is-open", open);
    cartDrawer.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (cartLinesEl) {
    cartLinesEl.addEventListener("click", (e) => {
      const line = e.target.closest(".cart-line[data-cart-id]");
      if (!line) return;
      if (e.target.closest("[data-cart-inc]")) changeCartQty(line.dataset.cartId, 1);
      else if (e.target.closest("[data-cart-dec]")) changeCartQty(line.dataset.cartId, -1);
    });
  }

  if (cartOpenBtn) {
    cartOpenBtn.addEventListener("click", () => {
      setNavOpen(false, { instant: true });
      renderCart();
      setCartOpen(true);
    });
  }
  if (cartCloseBtn) cartCloseBtn.addEventListener("click", () => setCartOpen(false));
  if (cartOverlay) cartOverlay.addEventListener("click", () => setCartOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setCartOpen(false);
      setSearchOpen(false);
      setNavOpen(false, { instant: true });
    }
  });

  renderCart();

  window.addEventListener("hours25:cart-change", () => {
    const fresh = loadStoredCart();
    cartItems.length = 0;
    (fresh ?? []).forEach((item) => cartItems.push({ ...item }));
    renderCart();
  });

  function parsePriceText(text) {
    const match = String(text || "").match(/[\d,]+\.?\d*/);
    if (!match) return NaN;
    return parseFloat(match[0].replace(/,/g, ""), 10);
  }

  function productSlugFromPath() {
    const parts = window.location.pathname.split("/");
    const file = parts[parts.length - 1] || "";
    return file.replace(/\.html$/i, "") || "product";
  }

  function productHrefFromPath() {
    const parts = window.location.pathname.split("/");
    const file = parts[parts.length - 1] || "";
    if (!/\.html$/i.test(file)) return "";
    const folderIdx = parts.indexOf("_Product Details");
    if (folderIdx !== -1) {
      return "_Product Details/" + decodeURIComponent(file);
    }
    return "";
  }

  function getProductFromPage(btn) {
    const catalog = window.HOURS25_CATALOG;
    const titleEl = document.querySelector(".product-info__title");
    const priceEl = document.querySelector(".product-info__price-current");
    const thumbImg =
      document.querySelector(".product-gallery__thumb img") ||
      document.querySelector(".product-gallery__slide img");

    const title = (titleEl && titleEl.textContent.trim()) || "";
    const price = parsePriceText(priceEl && priceEl.textContent);
    const id = productSlugFromPath();
    const href = productHrefFromPath();
    const imgFromBtn = btn && btn.getAttribute("data-product-img");
    const gallerySrc = thumbImg && thumbImg.getAttribute("src");
    let img = imgFromBtn
      ? catalog
        ? catalog.cartThumbFromGallerySrc(imgFromBtn)
        : imgFromBtn.replace("/100px/", "/560px/")
      : catalog
        ? catalog.cartThumbFromGallerySrc(gallerySrc)
        : gallerySrc
          ? gallerySrc.replace("/100px/", "/560px/")
          : "";
    if (catalog) img = catalog.normalizeCartImageSrc(img);
    if (!img && catalog) {
      img = catalog.resolveProductImage({ id, href });
    }

    return { id, title, price, img, href };
  }

  function addToCartFromProduct(btn) {
    const { id, title, price, img, href } = getProductFromPage(btn);
    const qtyInput = document.querySelector("[data-qty-input]");
    const qty = Math.max(1, parseInt((qtyInput && qtyInput.value) || "1", 10) || 1);
    if (!id || !title || Number.isNaN(price)) return;

    const existing = cartItems.find((item) => item.id === id);
    if (existing) {
      existing.qty += qty;
      if (href) existing.href = href;
      if (img) existing.img = img;
    } else {
      const entry = { id, title, qty, price, img };
      if (href) entry.href = href;
      cartItems.push(entry);
    }
    renderCart();
    notifyCartChange();
    setCartOpen(true);
  }

  document.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
    btn.addEventListener("click", () => addToCartFromProduct(btn));
  });

  const buyNowBtn = document.querySelector("[data-buy-now]");
  if (buyNowBtn) {
    buyNowBtn.addEventListener("click", () => {
      const addBtn = document.querySelector("[data-add-to-cart]");
      if (addBtn) {
        addToCartFromProduct(addBtn);
        window.location.href = "checkout.html";
      }
    });
  }

  /* —— 商品主图轮播 —— */
  const gallery = document.querySelector("[data-product-gallery]");
  if (gallery) {
    const track = gallery.querySelector("[data-gallery-track]");
    const viewport = gallery.querySelector("[data-gallery-viewport]");
    const dotsWrap = gallery.querySelector("[data-gallery-dots]");
    const thumbs = gallery.querySelectorAll("[data-gallery-thumb]");
    const prevBtn = gallery.querySelector("[data-gallery-prev]");
    const nextBtn = gallery.querySelector("[data-gallery-next]");
    const slides = gallery.querySelectorAll(".product-gallery__slide");
    const count = slides.length;
    let index = 0;
    let startX = 0;
    let deltaX = 0;
    let isDragging = false;

    function goTo(i, animate) {
      index = ((i % count) + count) % count;
      if (track) {
        track.classList.toggle("is-dragging", animate === false);
        track.style.transform = "translateX(-" + index * 100 + "%)";
        if (animate !== false) {
          requestAnimationFrame(() => track.classList.remove("is-dragging"));
        }
      }
      if (dotsWrap) {
        dotsWrap.querySelectorAll(".product-gallery__dot").forEach((dot, n) => {
          dot.classList.toggle("is-active", n === index);
          dot.setAttribute("aria-selected", n === index ? "true" : "false");
        });
      }
      thumbs.forEach((thumb, n) => {
        thumb.classList.toggle("is-active", n === index);
      });
    }

    if (dotsWrap && count > 0) {
      slides.forEach((_, n) => {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "product-gallery__dot" + (n === 0 ? " is-active" : "");
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Image " + (n + 1));
        dot.setAttribute("aria-selected", n === 0 ? "true" : "false");
        dot.addEventListener("click", () => goTo(n));
        dotsWrap.appendChild(dot);
      });
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const i = parseInt(thumb.getAttribute("data-gallery-thumb"), 10);
        if (!Number.isNaN(i)) goTo(i);
      });
    });

    if (prevBtn) prevBtn.addEventListener("click", () => goTo(index - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => goTo(index + 1));

    function onPointerDown(clientX) {
      isDragging = true;
      startX = clientX;
      deltaX = 0;
      if (viewport) viewport.classList.add("is-dragging");
      if (track) track.classList.add("is-dragging");
    }

    function onPointerMove(clientX) {
      if (!isDragging || !track || !viewport) return;
      deltaX = clientX - startX;
      const width = viewport.offsetWidth || 1;
      const offset = -index * 100 + (deltaX / width) * 100;
      track.style.transform = "translateX(" + offset + "%)";
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      if (viewport) viewport.classList.remove("is-dragging");
      const width = viewport ? viewport.offsetWidth : 1;
      if (Math.abs(deltaX) > width * 0.18) {
        goTo(index + (deltaX < 0 ? 1 : -1));
      } else {
        goTo(index);
      }
      deltaX = 0;
    }

    if (viewport) {
      viewport.addEventListener("mousedown", (e) => {
        e.preventDefault();
        onPointerDown(e.clientX);
      });
      window.addEventListener("mousemove", (e) => onPointerMove(e.clientX));
      window.addEventListener("mouseup", onPointerUp);

      viewport.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length === 1) onPointerDown(e.touches[0].clientX);
        },
        { passive: true }
      );
      viewport.addEventListener(
        "touchmove",
        (e) => {
          if (e.touches.length === 1) onPointerMove(e.touches[0].clientX);
        },
        { passive: true }
      );
      viewport.addEventListener("touchend", onPointerUp);
    }

    gallery.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    });
  }

  /* —— 数量加减 —— */
  const qtyControl = document.querySelector("[data-qty-control]");
  if (qtyControl) {
    const qtyInput = qtyControl.querySelector("[data-qty-input]");
    const clampQty = (n) => Math.min(99, Math.max(1, n));
    qtyControl.querySelector("[data-qty-dec]")?.addEventListener("click", () => {
      if (qtyInput) qtyInput.value = String(clampQty(parseInt(qtyInput.value, 10) - 1));
    });
    qtyControl.querySelector("[data-qty-inc]")?.addEventListener("click", () => {
      if (qtyInput) qtyInput.value = String(clampQty(parseInt(qtyInput.value, 10) + 1));
    });
    if (qtyInput) {
      qtyInput.addEventListener("change", () => {
        qtyInput.value = String(clampQty(parseInt(qtyInput.value, 10) || 1));
      });
    }
  }

  /* —— 激活保修表单 —— */
  const warrantyForm = document.querySelector("[data-warranty-form]");
  const warrantyMessage = document.querySelector("[data-warranty-message]");

  if (warrantyForm) {
    warrantyForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = warrantyForm.querySelector("#warranty-name");
      const email = warrantyForm.querySelector("#warranty-email");
      const order = warrantyForm.querySelector("#warranty-order");

      [name, email, order].forEach((el) => el && el.classList.remove("is-invalid"));

      if (!warrantyForm.checkValidity()) {
        [name, email, order].forEach((el) => {
          if (el && !el.validity.valid) el.classList.add("is-invalid");
        });
        if (warrantyMessage) {
          warrantyMessage.hidden = false;
          warrantyMessage.className = "warranty-form-message is-error";
          warrantyMessage.textContent = "Please fill in all required fields.";
        }
        return;
      }

      if (warrantyMessage) {
        warrantyMessage.hidden = false;
        warrantyMessage.className = "warranty-form-message is-success";
        warrantyMessage.textContent =
          "Thank you! Your warranty activation request has been submitted.";
      }
      warrantyForm.reset();
    });
  }

  /* —— 联系我们表单 —— */
  const contactForm = document.querySelector("[data-contact-form]");
  const contactMessage = document.querySelector("[data-contact-message]");

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = contactForm.querySelector("#contact-name");
      const email = contactForm.querySelector("#contact-email");
      const product = contactForm.querySelector("#contact-product");
      const country = contactForm.querySelector("#contact-country");
      const order = contactForm.querySelector("#contact-order");
      const description = contactForm.querySelector("#contact-description");

      [name, email, product, country, order, description].forEach(
        (el) => el && el.classList.remove("is-invalid")
      );

      if (!contactForm.checkValidity()) {
        [name, email, product, country, order, description].forEach((el) => {
          if (el && !el.validity.valid) el.classList.add("is-invalid");
        });
        if (contactMessage) {
          contactMessage.hidden = false;
          contactMessage.className = "warranty-form-message is-error";
          contactMessage.textContent = "Please fill in all required fields.";
        }
        return;
      }

      if (contactMessage) {
        contactMessage.hidden = false;
        contactMessage.className = "warranty-form-message is-success";
        contactMessage.textContent =
          "Thank you! Your message has been submitted. We will get back to you soon.";
      }
      contactForm.reset();
    });
  }

  /* —— 产品分类页：筛选 + 排序 —— */
  const catalogRoot = document.querySelector("[data-catalog]");
  if (catalogRoot) {
    const catalogGrid = catalogRoot.querySelector("[data-catalog-grid]");
    const catalogSort = catalogRoot.querySelector("[data-catalog-sort]");
    const catalogCount = catalogRoot.querySelector("[data-catalog-count]");
    const catalogEmpty = catalogRoot.querySelector("[data-catalog-empty]");
    const filterPanel = catalogRoot.querySelector("[data-catalog-filter]");
    const filterOverlay = catalogRoot.querySelector("[data-filter-overlay]");
    const filterOpenBtn = catalogRoot.querySelector("[data-filter-open]");
    const filterCloseBtn = catalogRoot.querySelector("[data-filter-close]");
    const filterApplyBtn = catalogRoot.querySelector("[data-filter-apply]");
    const filterClearBtn = catalogRoot.querySelector("[data-filter-clear]");
    const availabilityInputs = catalogRoot.querySelectorAll("[data-filter-availability]");
    const priceMinInput = catalogRoot.querySelector("[data-filter-price-min]");
    const priceMaxInput = catalogRoot.querySelector("[data-filter-price-max]");

    const catalogItems = Array.from(catalogRoot.querySelectorAll("[data-catalog-item]"));

    const getItemMeta = (item) => ({
      el: item,
      title: (item.querySelector(".product-title")?.textContent || "").trim().toLowerCase(),
      price: parseFloat(item.dataset.price, 10) || 0,
      available: item.dataset.available || "in-stock",
      featured: parseInt(item.dataset.featured, 10) || 999,
      relevance: parseInt(item.dataset.relevance, 10) || 0,
      sales: parseInt(item.dataset.sales, 10) || 0,
      date: Date.parse(item.dataset.date) || 0,
    });

    let filterState = {
      availability: new Set(["in-stock", "out-of-stock"]),
      min: null,
      max: null,
    };

    function parsePriceInput(input) {
      if (!input || input.value === "") return null;
      const n = parseFloat(input.value, 10);
      return Number.isFinite(n) ? n : null;
    }

    function readFilterFromInputs() {
      const availability = new Set();
      availabilityInputs.forEach((input) => {
        if (input.checked) availability.add(input.value);
      });
      filterState = {
        availability,
        min: parsePriceInput(priceMinInput),
        max: parsePriceInput(priceMaxInput),
      };
    }

    function itemPassesFilter(meta) {
      if (!filterState.availability.has(meta.available)) return false;
      if (filterState.min !== null && meta.price < filterState.min) return false;
      if (filterState.max !== null && meta.price > filterState.max) return false;
      return true;
    }

    function sortMetas(metas, sortKey) {
      const list = metas.slice();
      const byTitle = (a, b) => a.title.localeCompare(b.title);
      switch (sortKey) {
        case "relevant":
          list.sort((a, b) => b.relevance - a.relevance || a.featured - b.featured);
          break;
        case "bestselling":
          list.sort((a, b) => b.sales - a.sales || a.featured - b.featured);
          break;
        case "title-asc":
          list.sort(byTitle);
          break;
        case "title-desc":
          list.sort((a, b) => byTitle(b, a));
          break;
        case "price-asc":
          list.sort((a, b) => a.price - b.price || byTitle(a, b));
          break;
        case "price-desc":
          list.sort((a, b) => b.price - a.price || byTitle(a, b));
          break;
        case "date-asc":
          list.sort((a, b) => a.date - b.date || a.featured - b.featured);
          break;
        case "date-desc":
          list.sort((a, b) => b.date - a.date || a.featured - b.featured);
          break;
        case "featured":
        default:
          list.sort((a, b) => a.featured - b.featured);
          break;
      }
      return list;
    }

    function updateCatalog() {
      const sortKey = (catalogSort && catalogSort.value) || "featured";
      const metas = catalogItems.map(getItemMeta);
      const visible = sortMetas(
        metas.filter(itemPassesFilter),
        sortKey
      );

      catalogItems.forEach((item) => item.classList.add("is-hidden"));
      visible.forEach((meta) => meta.el.classList.remove("is-hidden"));

      if (catalogGrid) {
        visible.forEach((meta) => catalogGrid.appendChild(meta.el));
      }

      const count = visible.length;
      if (catalogCount) {
        catalogCount.textContent = count + (count === 1 ? " product" : " products");
      }
      if (catalogEmpty) {
        catalogEmpty.hidden = count > 0;
      }
    }

    function setFilterOpen(open) {
      if (!filterPanel || !filterOverlay) return;
      filterPanel.hidden = false;
      filterOverlay.hidden = false;
      filterPanel.classList.toggle("is-open", open);
      filterOverlay.classList.toggle("is-open", open);
      document.body.classList.toggle("filter-open", open);
      if (filterOpenBtn) {
        filterOpenBtn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      if (!open) {
        requestAnimationFrame(() => {
          if (!filterPanel.classList.contains("is-open")) {
            filterPanel.hidden = true;
            filterOverlay.hidden = true;
          }
        });
      }
    }

    if (filterOpenBtn) {
      filterOpenBtn.addEventListener("click", () => setFilterOpen(true));
    }
    if (filterCloseBtn) filterCloseBtn.addEventListener("click", () => setFilterOpen(false));
    if (filterOverlay) filterOverlay.addEventListener("click", () => setFilterOpen(false));
    if (filterApplyBtn) {
      filterApplyBtn.addEventListener("click", () => {
        readFilterFromInputs();
        updateCatalog();
        setFilterOpen(false);
      });
    }
    if (filterClearBtn) {
      filterClearBtn.addEventListener("click", () => {
        availabilityInputs.forEach((input) => {
          input.checked = true;
        });
        if (priceMinInput) priceMinInput.value = "";
        if (priceMaxInput) priceMaxInput.value = "";
        readFilterFromInputs();
        updateCatalog();
      });
    }
    if (catalogSort) {
      catalogSort.addEventListener("change", updateCatalog);
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && filterPanel?.classList.contains("is-open")) {
        setFilterOpen(false);
      }
    });

    readFilterFromInputs();
    updateCatalog();
  }

  /* —— 瀑布滚动：区块进入视口时淡入上浮 —— */
  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const sections = document.querySelectorAll("[data-reveal]");
  if (!prefersReduced && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target;
          el.classList.add("is-visible");
          const kids = el.querySelectorAll("[data-reveal-child]");
          kids.forEach((k, idx) => {
            k.style.setProperty("--d", `${80 + idx * 90}ms`);
          });
          io.unobserve(el);
        });
      },
      { root: null, threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    sections.forEach((s) => {
      if (!s.classList.contains("is-visible")) io.observe(s);
    });
  } else {
    sections.forEach((s) => s.classList.add("is-visible"));
  }

})();
