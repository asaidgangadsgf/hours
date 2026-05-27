(function (global) {
  "use strict";

  const PRODUCT_IDS = [
    "2.5D",
    "004",
    "6.86 inches",
    "7 inch",
    "9 inch",
    "028",
    "044",
    "045",
    "046",
    "Camera 1",
    "Camera 2",
    "Line 1",
    "Line 2",
    "Motorcycle vehicle side",
    "Motorcycle vehicle vertical",
  ];

  /** 560px cart thumbnails — must match files under _image/{id}/560px/ */
  const PRODUCT_THUMBS = Object.fromEntries(
    PRODUCT_IDS.map((id) => [id, `_image/${id}/560px/主图1.webp`])
  );
  PRODUCT_THUMBS["hk3-carplay"] = PRODUCT_THUMBS["045"];

  /** Site-wide header search — all products under _Product Details */
  const SEARCH_PRODUCTS = [
    {
      id: "2.5D",
      href: "_Product Details/2.5D.html",
      title: '25hours 7" CarPlay Smart Screen',
      keywords:
        "2.5D Krania K1 2K Wi-Fi Dash Cam CarPlay Android Auto smart screen",
      price: "$45.58 USD",
    },
    {
      id: "004",
      href: "_Product Details/004.html",
      title: "Adaire A5 4K Front and Rear",
      keywords:
        "004 7 inch CarPlay Android Auto 25HOURS wireless display HK3",
      price: "$44.98 USD",
    },
    {
      id: "6.86 inches",
      href: "_Product Details/6.86 inches.html",
      title: "Krania Mini 1080P Front and Rear",
      keywords:
        "6.86 baby monitor CarPlay night vision USB-C charger RC07",
      price: "$69.98 USD",
    },
    {
      id: "7 inch",
      href: "_Product Details/7 inch.html",
      title: "HK3 Carplay Screen for Car",
      keywords: "7 inch Vezla M2 1080P Wi-Fi Dash Cam CarPlay Android",
      price: "$44.98 USD",
    },
    {
      id: "9 inch",
      href: "_Product Details/9 inch.html",
      title: "25 HOURS HK9 9 Inch Apple Carplay & Android Screen",
      keywords: "9 inch Krania T93 2.5 HD Wi-Fi 4K recording CarPlay",
      price: "$44.98 USD",
    },
    {
      id: "028",
      href: "_Product Details/028.html",
      title: "TSG G36 4K Dash Cam",
      keywords:
        "028 portable smart car stereo dual recording USB-C cable kit",
      price: "$84.97 USD",
    },
    {
      id: "044",
      href: "_Product Details/044.html",
      title: '25HOURS 10.26" Wireless Car Display',
      keywords: "044 GPS module Krania CarPlay wireless display",
      price: "$44.98 USD",
    },
    {
      id: "045",
      href: "_Product Details/045.html",
      title: "25 HOURS HK5 10.26 Inch Apple Carplay & Android Screen",
      keywords: "045 HK3 HK5 10 inch CarPlay Android Auto",
      price: "$89.99 USD",
    },
    {
      id: "046",
      href: "_Product Details/046.html",
      title: "Krania Car Screen with Rear Camera",
      keywords: "046 Netflix YouTube in-cell ultra-thin built-in apps",
      price: "$199.99 USD",
    },
    {
      id: "Camera 1",
      href: "_Product Details/Camera 1.html",
      title: "Smart Outdoor Camera with Solar Panel",
      keywords:
        "Camera 1 4G LTE AI detection outdoor security Krania K1 dash cam",
      price: "$129.99 USD",
    },
    {
      id: "Camera 2",
      href: "_Product Details/Camera 2.html",
      title: "Adaire A5 4K Front and Rear",
      keywords: "Camera 2 CarPlay dash cam front rear",
      price: "$44.98 USD",
    },
    {
      id: "Line 1",
      href: "_Product Details/Line 1.html",
      title: "Krania K1 2K Wi-Fi Dash Cam",
      keywords: "Line 1 accessory cable CarPlay",
      price: "$44.98 USD",
    },
    {
      id: "Line 2",
      href: "_Product Details/Line 2.html",
      title: "Adaire A5 4K Front and Rear",
      keywords: "Line 2 accessory cable CarPlay",
      price: "$44.98 USD",
    },
    {
      id: "Motorcycle vehicle side",
      href: "_Product Details/Motorcycle vehicle side.html",
      title: "Krania Portable Screen Hardwire Kit Black/Yellow",
      keywords:
        "Motorcycle side landscape 5 inch CarPlay Android hardwire kit",
      price: "$69.99 USD",
    },
    {
      id: "Motorcycle vehicle vertical",
      href: "_Product Details/Motorcycle vehicle vertical.html",
      title: "Krania Portable Screen Hardwire Kit Blush Nebula/Black",
      keywords:
        "Motorcycle vertical 5 inch CarPlay Android hardwire kit",
      price: "$89.99 USD",
    },
  ].map((product) => ({
    ...product,
    img: PRODUCT_THUMBS[product.id] || "",
  }));

  function slugFromHref(href) {
    if (!href) return "";
    const match = String(href).match(/_Product Details\/([^/?#]+)\.html/i);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function normalizeCartImageSrc(src) {
    if (!src) return "";
    let path = src;
    if (path.includes("/100px/")) path = path.replace("/100px/", "/560px/");
    path = path.replace(/主图1（1200）\.webp/gi, "主图1.webp");
    path = path.replace(/主图1（1）1200\.webp/gi, "主图1.webp");
    return path;
  }

  function cartThumbFromGallerySrc(src) {
    return normalizeCartImageSrc(src);
  }

  function resolveProductImage(item) {
    if (!item) return "";
    const normalized = normalizeCartImageSrc(item.img);
    if (normalized) return normalized;
    const id = item.id || "";
    const slug = slugFromHref(item.href);
    if (id && PRODUCT_THUMBS[id]) return PRODUCT_THUMBS[id];
    if (slug && PRODUCT_THUMBS[slug]) return PRODUCT_THUMBS[slug];
    return "";
  }

  function repairCartItem(item) {
    const img = resolveProductImage(item);
    if (!img) return false;
    if (item.img !== img) {
      item.img = img;
      return true;
    }
    return false;
  }

  function repairCartItems(items) {
    let changed = false;
    items.forEach((item) => {
      if (repairCartItem(item)) changed = true;
    });
    return changed;
  }

  global.HOURS25_CATALOG = {
    PRODUCT_THUMBS,
    SEARCH_PRODUCTS,
    slugFromHref,
    normalizeCartImageSrc,
    cartThumbFromGallerySrc,
    resolveProductImage,
    repairCartItem,
    repairCartItems,
  };
})(typeof window !== "undefined" ? window : globalThis);
