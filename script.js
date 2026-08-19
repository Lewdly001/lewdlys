// script.js — поведение сайта LEWDLY

let PORTFOLIO_ITEMS = [];
let ACTIVE_CATEGORY = "all";
let lottieInstances = new Map(); // element -> lottie animation instance
let mediaObserver = null;

const CATEGORY_LABELS = {
  all: "Все",
  emoji: "Emoji",
};

document.addEventListener("DOMContentLoaded", () => {
  wireLinks();
  wireHeaderScroll();
  loadPortfolio();
  loadPricing();
  wireLightbox();
  observeReveal(".card, .section-head, .chat, .cta-strip");
});

/* ---------- ССЫЛКИ ИЗ CONFIG.JS ---------- */

function wireLinks() {
  const map = {
    order: LEWDLY_CONFIG.orderUrl,
    channel: LEWDLY_CONFIG.channelUrl,
  };
  document.querySelectorAll("[data-link]").forEach((el) => {
    const key = el.getAttribute("data-link");
    if (map[key]) el.setAttribute("href", map[key]);
  });
  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = LEWDLY_CONFIG.brandName));
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = LEWDLY_CONFIG.year));
}

function wireHeaderScroll() {
  const header = document.querySelector("header");
  if (!header) return;
  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 10);
  });
}

/* Плавное появление блоков при прокрутке — добавляет .reveal/.visible,
   остальное (переход) делает CSS. Можно звать повторно на новых элементах. */
function observeReveal(selector, root) {
  const scope = root || document;
  const els = scope.querySelectorAll(selector);
  els.forEach((el) => {
    if (!el.classList.contains("reveal")) el.classList.add("reveal");
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  scope.querySelectorAll(selector + ".reveal:not(.visible)").forEach((el) => io.observe(el));
}

/* ---------- ПОРТФОЛИО ---------- */

const FALLBACK_PORTFOLIO = [
  { title: "Набор «Лисята»", category: "emoji", type: "placeholder", emoji: "🦊" },
];

// Пример группы: несколько работ (svg / lottie / video / картинки) в ОДНОЙ карточке.
// Собирается через type:"group" и массив items (см. portfolio.json).

async function loadPortfolio() {
  try {
    const res = await fetch("portfolio.json");
    if (!res.ok) throw new Error("bad response");
    PORTFOLIO_ITEMS = await res.json();
  } catch (e) {
    PORTFOLIO_ITEMS = FALLBACK_PORTFOLIO;
  }
  renderFilters();
  renderPortfolio();
  renderMarquee(PORTFOLIO_ITEMS);
}

function renderFilters() {
  const bar = document.getElementById("portfolio-filters");
  if (!bar) return;
  const cats = ["all", ...new Set(PORTFOLIO_ITEMS.map((i) => i.category).filter(Boolean))];
  bar.innerHTML = cats
    .map(
      (c) =>
        `<button class="filter-pill${c === ACTIVE_CATEGORY ? " active" : ""}" data-cat="${c}">${
          CATEGORY_LABELS[c] || c
        }</button>`
    )
    .join("");
  bar.querySelectorAll(".filter-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      ACTIVE_CATEGORY = btn.getAttribute("data-cat");
      bar.querySelectorAll(".filter-pill").forEach((b) => b.classList.toggle("active", b === btn));
      renderPortfolio();
    });
  });
}

function renderPortfolio() {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;

  destroyLotties();
  if (mediaObserver) mediaObserver.disconnect();

  const items =
    ACTIVE_CATEGORY === "all" ? PORTFOLIO_ITEMS : PORTFOLIO_ITEMS.filter((i) => i.category === ACTIVE_CATEGORY);

  if (!items.length) {
    grid.innerHTML = `<p class="portfolio-empty">Работы скоро появятся здесь.</p>`;
    return;
  }

  grid.innerHTML = items.map((item, i) => workCardMarkup(item, i)).join("");

  // клик по карточке -> лайтбокс
  grid.querySelectorAll(".work").forEach((el, i) => {
    el.addEventListener("click", () => openLightbox(items[i]));
  });

  initMediaForItems(items, grid);
  observeReveal(".work", grid);
}

// Подпись поверх карточки (категория + название) — использует готовые классы
// .work-overlay/.work-tag/.work-title из style.css.
function overlayMarkup(item) {
  const tag = CATEGORY_LABELS[item.category] || item.category || "";
  const title = item.title || "";
  if (!tag && !title) return "";
  return `
        <div class="work-overlay">
          ${tag ? `<span class="work-tag">${escapeHtml(tag)}</span>` : ""}
          ${title ? `<span class="work-title">${escapeHtml(title)}</span>` : ""}
        </div>`;
}

function workCardMarkup(item, i) {
  const overlay = overlayMarkup(item);

  if (item.type === "group") {
    const subs = item.items || [];
    const shown = subs.slice(0, 4);
    const extra = subs.length - shown.length;
    const cellsHtml = shown
      .map((sub, si) => groupCellMarkup(sub, si === shown.length - 1 ? extra : 0))
      .join("");
    return `
      <div class="work work-group cells-${shown.length}" data-idx="${i}">
        <div class="group-grid">${cellsHtml}</div>
        <span class="media-badge">${subs.length} шт.</span>
        ${overlay}
      </div>`;
  }

  if (item.type === "lottie") {
    return `
      <div class="work" data-idx="${i}">
        <div class="work-media"><div class="media-lottie" data-lottie-src="${item.src}"></div></div>
        ${overlay}
      </div>`;
  }
  if (item.type === "video") {
    return `
      <div class="work" data-idx="${i}">
        <div class="work-media"><video class="media-video" src="${item.src}" muted loop playsinline preload="metadata"></video></div>
        ${overlay}
      </div>`;
  }
  if (item.type === "svg" || item.type === "image") {
    return `
      <div class="work" data-idx="${i}">
        <div class="work-media"><img class="media-image" src="${item.src}" loading="lazy" alt="${escapeHtml(item.title || "")}"></div>
        ${overlay}
      </div>`;
  }

  // placeholder — работа ещё не загружена
  const colors = item.colors || ["#8A8A96", "#3A3A42"];
  return `
    <div class="work is-placeholder" data-idx="${i}" style="background:linear-gradient(135deg, ${hex2rgba(
    colors[0],
    0.18
  )}, ${hex2rgba(colors[1], 0.12)})">
      <span class="work-emoji">${item.emoji || "✨"}</span>
      ${overlay}
    </div>`;
}

// Одна ячейка внутри карточки-группы (использует те же классы .media-lottie/.media-video,
// поэтому initMediaForItems ниже подхватывает их автоматически — без доп. кода).
function groupCellMarkup(sub, extraCount) {
  let inner = "";
  if (sub.type === "lottie") {
    inner = `<div class="media-lottie" data-lottie-src="${sub.src}"></div>`;
  } else if (sub.type === "video") {
    inner = `<video class="media-video" src="${sub.src}" muted loop playsinline preload="metadata"></video>`;
  } else if (sub.type === "svg" || sub.type === "image") {
    inner = `<img class="media-image" src="${sub.src}" loading="lazy" alt="">`;
  } else {
    inner = `<span class="group-cell-emoji">${sub.emoji || "✨"}</span>`;
  }
  const more = extraCount > 0 ? `<span class="group-more">+${extraCount}</span>` : "";
  return `<div class="group-cell">${inner}${more}</div>`;
}

/* Инициализация Lottie/видео + ленивый play/pause по видимости (для качества и производительности) */
function initMediaForItems(items, grid) {
  mediaObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        if (el.classList.contains("media-lottie")) {
          const anim = lottieInstances.get(el);
          if (!anim) return;
          entry.isIntersecting ? anim.play() : anim.pause();
        } else if (el.tagName === "VIDEO") {
          entry.isIntersecting ? el.play().catch(() => {}) : el.pause();
        }
      });
    },
    { threshold: 0.35 }
  );

  grid.querySelectorAll(".media-lottie").forEach((el) => {
    if (typeof lottie === "undefined") return;
    const anim = lottie.loadAnimation({
      container: el,
      path: el.getAttribute("data-lottie-src"),
      renderer: "canvas",
      loop: true,
      autoplay: false,
    });
    lottieInstances.set(el, anim);
    mediaObserver.observe(el);
  });

  grid.querySelectorAll(".media-video").forEach((el) => mediaObserver.observe(el));
}

function destroyLotties() {
  lottieInstances.forEach((anim) => anim.destroy());
  lottieInstances = new Map();
}

/* ---------- ЛАЙТБОКС (крупный просмотр в хорошем качестве) ---------- */

function wireLightbox() {
  const box = document.getElementById("lightbox");
  const closeBtn = document.getElementById("lightbox-close");
  if (!box) return;
  closeBtn.addEventListener("click", closeLightbox);
  box.addEventListener("click", (e) => {
    if (e.target === box) closeLightbox();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLightbox();
  });
}

let lightboxAnims = [];
let lightboxDotObserver = null;

function openLightbox(item) {
  const box = document.getElementById("lightbox");
  const content = document.getElementById("lightbox-content");
  const title = document.getElementById("lightbox-title");
  const dotsBox = document.getElementById("lightbox-dots");
  if (!box || !content) return;

  content.innerHTML = "";
  content.classList.remove("lightbox-gallery");
  if (dotsBox) dotsBox.innerHTML = "";
  if (lightboxDotObserver) lightboxDotObserver.disconnect();
  title.textContent = item.title || "";

  if (item.type === "group") {
    content.classList.add("lightbox-gallery");
    const subs = item.items || [];
    subs.forEach((sub) => content.appendChild(buildGalleryCell(sub, item.title)));
    if (subs.length > 1) buildLightboxDots(subs.length, content, dotsBox);
  } else if (item.type === "lottie" && typeof lottie !== "undefined") {
    const holder = document.createElement("div");
    holder.className = "media-lottie";
    content.appendChild(holder);
    lightboxAnims.push(
      lottie.loadAnimation({ container: holder, path: item.src, renderer: "canvas", loop: true, autoplay: true })
    );
  } else if (item.type === "video") {
    const video = document.createElement("video");
    video.src = item.src;
    video.controls = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    content.appendChild(video);
  } else if (item.type === "svg" || item.type === "image") {
    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.title || "";
    content.appendChild(img);
  } else {
    content.innerHTML = `<span style="font-size:64px">${item.emoji || "✨"}</span>`;
  }

  box.classList.add("open");
}

// Одна ячейка внутри лайтбокс-галереи для группы (полноразмерная версия groupCellMarkup)
function buildGalleryCell(sub, groupTitle) {
  const cell = document.createElement("div");
  cell.className = "gallery-cell";
  if (sub.type === "lottie" && typeof lottie !== "undefined") {
    const holder = document.createElement("div");
    holder.className = "media-lottie";
    cell.appendChild(holder);
    lightboxAnims.push(
      lottie.loadAnimation({ container: holder, path: sub.src, renderer: "canvas", loop: true, autoplay: true })
    );
  } else if (sub.type === "video") {
    const video = document.createElement("video");
    video.src = sub.src;
    video.autoplay = true;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = true;
    cell.appendChild(video);
  } else if (sub.type === "svg" || sub.type === "image") {
    const img = document.createElement("img");
    img.src = sub.src;
    img.alt = groupTitle || "";
    cell.appendChild(img);
  } else {
    cell.innerHTML = `<span style="font-size:44px">${sub.emoji || "✨"}</span>`;
  }
  return cell;
}

// Точки-навигация под галереей — клик скроллит к нужной карточке,
// активная точка обновляется автоматически по свайпу (IntersectionObserver).
function buildLightboxDots(count, content, dotsBox) {
  if (!dotsBox) return;
  dotsBox.innerHTML = Array.from({ length: count })
    .map((_, i) => `<span class="lightbox-dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`)
    .join("");
  const dots = [...dotsBox.querySelectorAll(".lightbox-dot")];
  const cells = [...content.querySelectorAll(".gallery-cell")];

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      cells[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    });
  });

  lightboxDotObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = cells.indexOf(entry.target);
        dots.forEach((d, di) => d.classList.toggle("active", di === idx));
      });
    },
    { root: content, threshold: 0.6 }
  );
  cells.forEach((c) => lightboxDotObserver.observe(c));
}

function closeLightbox() {
  const box = document.getElementById("lightbox");
  if (!box) return;
  box.classList.remove("open");
  lightboxAnims.forEach((anim) => anim.destroy());
  lightboxAnims = [];
  if (lightboxDotObserver) {
    lightboxDotObserver.disconnect();
    lightboxDotObserver = null;
  }
  const content = document.getElementById("lightbox-content");
  const dotsBox = document.getElementById("lightbox-dots");
  content.innerHTML = "";
  content.classList.remove("lightbox-gallery");
  if (dotsBox) dotsBox.innerHTML = "";
}

/* ---------- БЕГУЩАЯ СТРОКА В ХИРО ---------- */

function renderMarquee(items) {
  const track = document.getElementById("marquee-track");
  if (!track || !items.length) return;
  const doubled = [...items, ...items];
  track.innerHTML = doubled
    .map((item, i) => `<div class="m-tile"><span class="m-emoji" style="animation-delay:${(i % 6) * -1.5}s">${item.emoji || "✨"}</span></div>`)
    .join("");
}

/* ---------- ПРАЙС (несколько направлений × несколько тарифов) ---------- */

let PRICING = [];
let ACTIVE_PRICE_CAT = null;

async function loadPricing() {
  try {
    const res = await fetch("pricing.json");
    if (!res.ok) throw new Error("bad response");
    PRICING = await res.json();
  } catch (e) {
    PRICING = [];
  }
  if (!PRICING.length) return;
  ACTIVE_PRICE_CAT = PRICING[0].id;
  renderPriceTabs();
  renderPriceGrid();
}

function renderPriceTabs() {
  const tabs = document.getElementById("price-tabs");
  if (!tabs) return;
  tabs.innerHTML = PRICING.map(
    (cat) =>
      `<button class="price-tab${cat.id === ACTIVE_PRICE_CAT ? " active" : ""}" data-cat="${cat.id}">${escapeHtml(
        cat.label
      )}</button>`
  ).join("");
  tabs.querySelectorAll(".price-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      ACTIVE_PRICE_CAT = btn.getAttribute("data-cat");
      tabs.querySelectorAll(".price-tab").forEach((b) => b.classList.toggle("active", b === btn));
      renderPriceGrid();
    });
  });
}

function renderPriceGrid() {
  const grid = document.getElementById("price-grid");
  if (!grid) return;
  const cat = PRICING.find((c) => c.id === ACTIVE_PRICE_CAT);
  if (!cat) {
    grid.innerHTML = "";
    return;
  }
  grid.innerHTML = cat.tiers
    .map(
      (tier) => `
      <div class="price-card${tier.featured ? " featured" : ""}">
        ${tier.featured ? '<span class="badge">Популярный</span>' : ""}
        <h3>${escapeHtml(tier.name)}</h3>
        <p class="tier-desc">${escapeHtml(tier.desc || "")}</p>
        <div class="price">${tier.price} <span>${tier.unit || "⭐"}</span></div>
        <div class="price-alt">${formatPriceAlt(tier)}</div>
        <ul>
          ${tier.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
        <a class="button ${tier.featured ? "" : "ghost"}" data-link="order" target="_blank" rel="noopener">Выбрать</a>
      </div>`
    )
    .join("");
  // ссылка уже стоит через data-link, но wireLinks уже отработал раньше —
  // подставим её явно для только что созданных элементов
  grid.querySelectorAll("[data-link='order']").forEach((el) => el.setAttribute("href", LEWDLY_CONFIG.orderUrl));
  observeReveal(".price-card", grid);
}

// Цена в $ и ₽ рядом со звёздами — берётся напрямую из pricing.json
// (поля priceUsd / priceRub у каждого тарифа), никакого курса не считаем.
function formatPriceAlt(tier) {
  const isFrom = (tier.unit || "").includes("+");
  const prefix = isFrom ? "от " : "";
  const parts = [];
  if (tier.priceUsd != null) parts.push(`${prefix}$${tier.priceUsd}`);
  if (tier.priceRub != null) parts.push(`${prefix}${tier.priceRub} ₽`);
  return parts.join(" · ");
}

/* ---------- УТИЛИТЫ ---------- */

function hex2rgba(hex, alpha) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}
