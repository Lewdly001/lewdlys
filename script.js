// script.js — поведение сайта LEWDLY

let PORTFOLIO_ITEMS = [];
let ACTIVE_CATEGORY = "all";
let lottieInstances = new Map(); // element -> lottie animation instance
let mediaObserver = null;

const CATEGORY_LABELS = {
  all: "Все",
  emoji: "Emoji",
  gift: "Gifts",
  animation: "Animation",
};

document.addEventListener("DOMContentLoaded", () => {
  wireLinks();
  wireHeaderScroll();
  loadPortfolio();
  loadPricing();
  wireLightbox();
});

/* ---------- ССЫЛКИ ИЗ CONFIG.JS ---------- */

function wireLinks() {
  const map = {
    bot: LEWDLY_CONFIG.botUrl,
    contact: LEWDLY_CONFIG.contactUrl,
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

/* ---------- ПОРТФОЛИО ---------- */

const FALLBACK_PORTFOLIO = [
  { title: "Набор «Лисята»", category: "emoji", type: "placeholder", emoji: "🦊" },
  { title: "NFT Gift «Кристалл»", category: "gift", type: "placeholder", emoji: "💎" },
  { title: "Анимация «Огонь»", category: "animation", type: "placeholder", emoji: "🔥" },
];

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
}

function workCardMarkup(item, i) {
  const tagLabel = CATEGORY_LABELS[item.category] || item.category || "";

  if (item.type === "lottie") {
    return `
      <div class="work" data-idx="${i}">
        <div class="work-media"><div class="media-lottie" data-lottie-src="${item.src}"></div></div>
        <span class="media-badge">Lottie</span>
        <div class="work-overlay">
          <span class="work-tag">${escapeHtml(tagLabel)}</span>
          <span class="work-title">${escapeHtml(item.title || "")}</span>
        </div>
      </div>`;
  }
  if (item.type === "video") {
    return `
      <div class="work" data-idx="${i}">
        <div class="work-media"><video class="media-video" src="${item.src}" muted loop playsinline preload="metadata"></video></div>
        <span class="media-badge">MP4</span>
        <div class="work-overlay">
          <span class="work-tag">${escapeHtml(tagLabel)}</span>
          <span class="work-title">${escapeHtml(item.title || "")}</span>
        </div>
      </div>`;
  }
  if (item.type === "svg" || item.type === "image") {
    const badge = item.type === "svg" ? "SVG" : "PNG";
    return `
      <div class="work" data-idx="${i}">
        <div class="work-media"><img class="media-image" src="${item.src}" loading="lazy" alt="${escapeHtml(item.title || "")}"></div>
        <span class="media-badge">${badge}</span>
        <div class="work-overlay">
          <span class="work-tag">${escapeHtml(tagLabel)}</span>
          <span class="work-title">${escapeHtml(item.title || "")}</span>
        </div>
      </div>`;
  }

  // placeholder — работа ещё не загружена
  const colors = item.colors || ["#7C5CFF", "#FF4FA3"];
  return `
    <div class="work is-placeholder" data-idx="${i}" style="background:linear-gradient(135deg, ${hex2rgba(
    colors[0],
    0.18
  )}, ${hex2rgba(colors[1], 0.12)})">
      <span class="work-tag">${escapeHtml(tagLabel)}</span>
      <span class="work-emoji">${item.emoji || "✨"}</span>
      <span class="work-title">${escapeHtml(item.title || "")}</span>
    </div>`;
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
      renderer: "svg",
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

let lightboxAnim = null;

function openLightbox(item) {
  const box = document.getElementById("lightbox");
  const content = document.getElementById("lightbox-content");
  const title = document.getElementById("lightbox-title");
  if (!box || !content) return;

  content.innerHTML = "";
  title.textContent = item.title || "";

  if (item.type === "lottie" && typeof lottie !== "undefined") {
    const holder = document.createElement("div");
    holder.className = "media-lottie";
    content.appendChild(holder);
    lightboxAnim = lottie.loadAnimation({
      container: holder,
      path: item.src,
      renderer: "svg",
      loop: true,
      autoplay: true,
    });
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

function closeLightbox() {
  const box = document.getElementById("lightbox");
  if (!box) return;
  box.classList.remove("open");
  if (lightboxAnim) {
    lightboxAnim.destroy();
    lightboxAnim = null;
  }
  document.getElementById("lightbox-content").innerHTML = "";
}

/* ---------- БЕГУЩАЯ СТРОКА В ХИРО ---------- */

function renderMarquee(items) {
  const track = document.getElementById("marquee-track");
  if (!track || !items.length) return;
  const doubled = [...items, ...items];
  track.innerHTML = doubled
    .map((item) => `<div class="m-tile">${item.emoji || "✨"}</div>`)
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
        <ul>
          ${tier.features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}
        </ul>
        <a class="button ${tier.featured ? "" : "ghost"}" data-link="bot" target="_blank" rel="noopener">Выбрать</a>
      </div>`
    )
    .join("");
  // ссылка на бота уже стоит через data-link, но wireLinks уже отработал —
  // подставим ссылку явно для новых элементов
  const map = { bot: LEWDLY_CONFIG.botUrl };
  grid.querySelectorAll("[data-link='bot']").forEach((el) => el.setAttribute("href", map.bot));
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
