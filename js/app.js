/**
 * Cosplay Card Editor – Nekomizu
 * ES6: upload ảnh, pan/zoom, form → preview, export PNG 1020×1680
 */

const LAYOUT_CONFIG = {
  layout1: {
    key: "layout1",
    bodyClass: "layout-1",
    frameSrc: "assets/frame.jpg",
    exportWidth: 1020,
    exportHeight: 1680,
  },
  layout2: {
    key: "layout2",
    bodyClass: "layout-2",
    frameSrc: "assets/layout-2.png",
    exportWidth: 1260,
    exportHeight: 640,
  },
};

const photoLayer = document.getElementById("photo-layer");
const photoImg = document.getElementById("photo-img");
const placeholder = document.getElementById("placeholder");
const imgControls = document.getElementById("imgControls");
const scaleSlider = document.getElementById("scaleSlider");
const scaleVal = document.getElementById("scaleVal");
const uploadZone = document.getElementById("uploadZone");
const fileInput = document.getElementById("fileInput");
const frameImg = document.getElementById("frame-img");
const layoutTabs = document.querySelectorAll(".layout-tab");
const cardScaler = document.querySelector(".card-scaler");

let loaded = false;
let scale = 1.0;
let ox = 0,
  oy = 0;
let dragging = false;
let dsx, dsy, dox, doy;
let currentLayout = LAYOUT_CONFIG.layout1;
/** Kích thước/vị trí gốc ảnh (sau fit) — dùng để bake pan/zoom khi export */
let basePhotoWidth = 0,
  basePhotoHeight = 0,
  basePhotoLeft = 0,
  basePhotoTop = 0;
const SHARED_INPUT_IDS = ["iName", "iNameFontSize", "iPrice", "iDisclaimer", "iNotice"];
const LAYOUT_INPUT_IDS = {
  layout1: ["iDetail", "iExtra"],
  layout2: [
    "iDesc1",
    "iDesc2",
    "iDesc3",
    "iDesc4",
    "iDesc1Color",
    "iDesc2Color",
    "iDesc3Color",
    "iDesc4Color",
  ],
};
const layoutFormState = { layout1: {}, layout2: {} };

function captureFormState(layoutKey) {
  const ids = [...SHARED_INPUT_IDS, ...(LAYOUT_INPUT_IDS[layoutKey] || [])];
  const next = {};
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) next[id] = el.value;
  });
  layoutFormState[layoutKey] = next;
}

function applyFormState(layoutKey) {
  const ids = [...SHARED_INPUT_IDS, ...(LAYOUT_INPUT_IDS[layoutKey] || [])];
  const state = layoutFormState[layoutKey] || {};
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (Object.prototype.hasOwnProperty.call(state, id)) el.value = state[id];
  });
}

function applyTitleFontByLayout() {
  const titleEl = document.getElementById("txt-name");
  const fontSizeInput = document.getElementById("iNameFontSize");
  if (!titleEl || !fontSizeInput) return;
  // Cả 2 layout đều nhận cỡ chữ từ dropdown; layout2 mặc định 60 khi switch tab.
  titleEl.style.fontSize = fontSizeInput.value + "px";
}

function updatePreviewScale() {
  if (!currentLayout) return;
  if (currentLayout.key === "layout2" && cardScaler) {
    const liveScale = cardScaler.clientWidth / currentLayout.exportWidth;
    const safeScale = Number.isFinite(liveScale) && liveScale > 0 ? liveScale : 0.28;
    document.body.style.setProperty("--preview-scale", String(safeScale));
    return;
  }
  const baseScale = window.innerWidth <= 900 ? 0.28 : 0.35;
  document.body.style.setProperty("--preview-scale", String(baseScale));
}

function getPreviewScale() {
  const card = document.getElementById("card");
  if (!card) return 1;
  const t = window.getComputedStyle(card).transform;
  if (!t || t === "none") return 1;
  const m = t.match(/matrix\(([^)]+)\)/);
  if (!m) return 1;
  const a = parseFloat(m[1].split(",")[0]);
  return Number.isFinite(a) && a > 0 ? a : 1;
}

function switchLayout(layoutKey) {
  const cfg = LAYOUT_CONFIG[layoutKey];
  if (!cfg) return;
  captureFormState(currentLayout.key);
  currentLayout = cfg;
  document.body.classList.remove("layout-1", "layout-2");
  document.body.classList.add(cfg.bodyClass);
  applyFormState(layoutKey);
  if (frameImg) frameImg.src = cfg.frameSrc;
  layoutTabs.forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.layout === layoutKey),
  );
  applyTitleFontByLayout();
  syncTitle();
  syncPrice();
  syncDescriptionsAndDisclaimer();
  updatePreviewScale();
  if (loaded) {
    setTimeout(() => sizePhotoToFit(), 0);
  }
}

function applyTransform() {
  if (photoImg)
    photoImg.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
}

/** Đặt kích thước ảnh theo tỉ lệ gốc (fit trong khung) để export không bị stretch */
function sizePhotoToFit() {
  if (!photoImg || !photoLayer || !photoImg.naturalWidth) return;
  const nw = photoImg.naturalWidth;
  const nh = photoImg.naturalHeight;
  const boxW = photoLayer.offsetWidth;
  const boxH = photoLayer.offsetHeight;
  const fitScale = Math.min(boxW / nw, boxH / nh);
  const w = nw * fitScale;
  const h = nh * fitScale;
  const left = (boxW - w) / 2;
  const top = (boxH - h) / 2;
  basePhotoWidth = w;
  basePhotoHeight = h;
  basePhotoLeft = left;
  basePhotoTop = top;
  photoImg.style.width = w + "px";
  photoImg.style.height = h + "px";
  photoImg.style.left = left + "px";
  photoImg.style.top = top + "px";
  applyTransform();
}

/** Tính style đã bake (pan/zoom → position + size) để export đúng view như preview */
function getBakedPhotoStyle() {
  if (!loaded || !basePhotoWidth) return null;
  const w = basePhotoWidth * scale;
  const h = basePhotoHeight * scale;
  const left = basePhotoLeft + (basePhotoWidth - w) / 2 + ox;
  const top = basePhotoTop + (basePhotoHeight - h) / 2 + oy;
  return {
    width: w + "px",
    height: h + "px",
    left: left + "px",
    top: top + "px",
    transform: "none",
  };
}

/** Áp style đã bake lên element ảnh (dùng cho clone khi export) */
function applyBakedPhotoStyle(imgEl, style) {
  if (!imgEl || !style) return;
  imgEl.style.width = style.width;
  imgEl.style.height = style.height;
  imgEl.style.left = style.left;
  imgEl.style.top = style.top;
  imgEl.style.transform = style.transform;
}

// ─── UPLOAD ──────────────────────────────────────────────
fileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () =>
  uploadZone.classList.remove("drag-over"),
);
uploadZone.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith("image/")) loadFile(f);
});

// Paste ảnh từ clipboard (copy ảnh từ web / màn hình)
document.addEventListener("paste", (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf("image") !== -1) {
      const file = items[i].getAsFile();
      if (file) {
        loadFile(file);
        e.preventDefault();
      }
      break;
    }
  }
});

function loadFile(file) {
  if (!photoImg || !placeholder) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    scale = 1;
    ox = 0;
    oy = 0;
    scaleSlider.value = 100;
    scaleVal.textContent = "100%";

    photoImg.onload = () => {
      sizePhotoToFit();
    };
    photoImg.src = ev.target.result;
    photoImg.style.display = "block";
    placeholder.style.display = "none";
    loaded = true;
    if (imgControls) imgControls.classList.add("active");
  };
  reader.onerror = () => alert("Không đọc được file ảnh.");
  reader.readAsDataURL(file);
}

document.getElementById("removeBtn").addEventListener("click", () => {
  photoImg.src = "";
  photoImg.style.display = "none";
  photoImg.style.width = "";
  photoImg.style.height = "";
  photoImg.style.left = "";
  photoImg.style.top = "";
  placeholder.style.display = "flex";
  loaded = false;
  imgControls.classList.remove("active");
  fileInput.value = "";
  scale = 1;
  ox = 0;
  oy = 0;
});

// ─── SCALE SLIDER ────────────────────────────────────────
scaleSlider.addEventListener("input", (e) => {
  scale = e.target.value / 100;
  scaleVal.textContent = `${e.target.value}%`;
  applyTransform();
});

// ─── DRAG TO PAN ─────────────────────────────────────────
photoLayer.addEventListener("mousedown", (e) => {
  if (!loaded) return;
  dragging = true;
  dsx = e.clientX;
  dsy = e.clientY;
  dox = ox;
  doy = oy;
  photoLayer.style.cursor = "grabbing";
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  const previewScale = getPreviewScale();
  ox = dox + (e.clientX - dsx) / previewScale;
  oy = doy + (e.clientY - dsy) / previewScale;
  applyTransform();
});

document.addEventListener("mouseup", () => {
  if (dragging) {
    dragging = false;
    photoLayer.style.cursor = "crosshair";
  }
});

photoLayer.addEventListener(
  "touchstart",
  (e) => {
    if (!loaded) return;
    dragging = true;
    const t = e.touches[0];
    dsx = t.clientX;
    dsy = t.clientY;
    dox = ox;
    doy = oy;
    e.preventDefault();
  },
  { passive: false },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    const previewScale = getPreviewScale();
    ox = dox + (t.clientX - dsx) / previewScale;
    oy = doy + (t.clientY - dsy) / previewScale;
    applyTransform();
  },
  { passive: false },
);

document.addEventListener("touchend", () => {
  dragging = false;
});

// ─── SCROLL TO ZOOM ──────────────────────────────────────
photoLayer.addEventListener(
  "wheel",
  (e) => {
    if (!loaded) return;
    e.preventDefault();
    const step = e.deltaY > 0 ? -0.04 : 0.04;
    scale = Math.max(0.1, Math.min(10, scale + step));
    const pct = Math.round(scale * 100);
    scaleSlider.value = Math.min(400, Math.max(20, pct));
    scaleVal.textContent = `${pct}%`;
    applyTransform();
  },
  { passive: false },
);

// ─── INPUT → PREVIEW ─────────────────────────────────────
function nl2br(s) {
  return s.replace(/\n/g, "<br>");
}

function syncTitle() {
  const el = document.getElementById("txt-name");
  const val = document.getElementById("iName").value || "";
  el.innerHTML = nl2br(val);
}
document.getElementById("iName").addEventListener("input", syncTitle);

function syncPrice() {
  const inputVal = document.getElementById("iPrice").value || "";
  const outputEl = document.getElementById("txt-price");
  if (!outputEl) return;
  let val = inputVal;
  if (currentLayout && currentLayout.key === "layout2") {
    val = inputVal.split("\n").slice(0, 2).join("\n");
  }
  outputEl.innerHTML = nl2br(val) || "";
}

function syncDescriptionsAndDisclaimer() {
  const disclaimerInput = document.getElementById("iDisclaimer");
  const disclaimerEl = document.getElementById("txt-disclaimer");
  const detailInput = document.getElementById("iDetail");
  const extraInput = document.getElementById("iExtra");
  const detailEl = document.getElementById("txt-detail");
  const extraEl = document.getElementById("txt-extra");
  if (!disclaimerInput || !disclaimerEl || !detailEl || !extraEl) return;

  const descInputs = [
    document.getElementById("iDesc1"),
    document.getElementById("iDesc2"),
    document.getElementById("iDesc3"),
    document.getElementById("iDesc4"),
  ];
  const colorInputs = [
    document.getElementById("iDesc1Color"),
    document.getElementById("iDesc2Color"),
    document.getElementById("iDesc3Color"),
    document.getElementById("iDesc4Color"),
  ];
  const descEls = [
    document.getElementById("txt-desc1"),
    document.getElementById("txt-desc2"),
    document.getElementById("txt-desc3"),
    document.getElementById("txt-desc4"),
  ];
  if (descInputs.some((x) => !x) || colorInputs.some((x) => !x) || descEls.some((x) => !x)) return;

  const disclaimerRaw = disclaimerInput.value || "";

  if (currentLayout && currentLayout.key === "layout2") {
    const baseTop = 244;
    const lineHeight = 36;
    const maxLines = 9;
    let usedLines = 0;

    for (let i = 0; i < descInputs.length; i++) {
      const raw = descInputs[i].value || "";
      const lines = raw ? raw.split("\n") : [];
      const remaining = Math.max(0, maxLines - usedLines);
      const shown = lines.slice(0, remaining);
      const outEl = descEls[i];
      outEl.innerHTML = nl2br(shown.join("\n"));
      outEl.style.top = `${baseTop + usedLines * lineHeight}px`;
      outEl.style.color = colorInputs[i].value || "#1a1a1a";
      outEl.style.display = shown.length ? "block" : "none";
      usedLines += shown.length;
    }

    const disclaimerLines = disclaimerRaw ? disclaimerRaw.split("\n") : [];
    const shownDisclaimer = disclaimerLines.slice(0, Math.max(0, maxLines - usedLines));
    disclaimerEl.innerHTML = nl2br(shownDisclaimer.join("\n"));
    disclaimerEl.style.top = `${baseTop + usedLines * lineHeight}px`;
    disclaimerEl.style.display = shownDisclaimer.length ? "block" : "none";
    detailEl.style.display = "none";
    extraEl.style.display = "none";
    return;
  }

  const detailRaw = detailInput ? (detailInput.value || "") : "";
  const extraRaw = extraInput ? (extraInput.value || "") : "";
  const detailLines = detailRaw ? detailRaw.split("\n") : [];
  const extraLines = extraRaw ? extraRaw.split("\n") : [];
  const maxLines = 4;
  const shownExtra = extraLines.slice(0, maxLines);
  const shownDetail = detailLines.slice(0, Math.max(0, maxLines - shownExtra.length));

  extraEl.innerHTML = nl2br(shownExtra.join("\n"));
  detailEl.innerHTML = nl2br(shownDetail.join("\n"));

  // Layout 1: group "Ghi chú" trước rồi mới "Chi tiết".
  const baseTop = 1326;
  const extraLineHeight = parseFloat(window.getComputedStyle(extraEl).lineHeight) || 54;
  extraEl.style.top = `${baseTop}px`;
  detailEl.style.top = `${baseTop + shownExtra.length * extraLineHeight}px`;
  extraEl.style.display = shownExtra.length ? "block" : "none";
  detailEl.style.display = shownDetail.length ? "block" : "none";

  descEls.forEach((el) => {
    el.innerHTML = "";
    el.style.display = "none";
    el.style.top = "";
  });
  disclaimerEl.innerHTML = nl2br(disclaimerRaw) || "";
  disclaimerEl.style.display = disclaimerRaw ? "block" : "none";
  disclaimerEl.style.top = "";
}

document.getElementById("iNameFontSize").addEventListener("change", (e) => {
  applyTitleFontByLayout();
  syncTitle();
});
// Áp cỡ chữ mặc định khi load
applyTitleFontByLayout();

document.getElementById("iPrice").addEventListener("input", syncPrice);

document.getElementById("iDesc1").addEventListener("input", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc2").addEventListener("input", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc3").addEventListener("input", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc4").addEventListener("input", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc1Color").addEventListener("change", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc2Color").addEventListener("change", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc3Color").addEventListener("change", syncDescriptionsAndDisclaimer);
document.getElementById("iDesc4Color").addEventListener("change", syncDescriptionsAndDisclaimer);
document.getElementById("iDisclaimer").addEventListener("input", syncDescriptionsAndDisclaimer);
document.getElementById("iDetail").addEventListener("input", syncDescriptionsAndDisclaimer);
document.getElementById("iExtra").addEventListener("input", syncDescriptionsAndDisclaimer);

document.getElementById("iNotice").addEventListener("input", (e) => {
  document.getElementById("txt-notice").innerHTML = nl2br(e.target.value) || "";
});

// ─── EXPORT PNG 1020×1680 ────────────────────────────────
document.getElementById("exportBtn").addEventListener("click", async () => {
  const btn = document.getElementById("exportBtn");
  btn.textContent = "⏳ Đang xuất...";
  btn.disabled = true;

  const card = document.getElementById("card");
  const bakedStyle = getBakedPhotoStyle();

  try {
    // Clone card để export — giữ nguyên preview, clone có layout 1020×1680 + ảnh đúng pan/zoom
    const clone = card.cloneNode(true);
    clone.style.transform = "scale(1)";
    clone.style.width = currentLayout.exportWidth + "px";
    clone.style.height = currentLayout.exportHeight + "px";
    const clonePhotoImg = clone.querySelector("#photo-img");
    if (clonePhotoImg && bakedStyle)
      applyBakedPhotoStyle(clonePhotoImg, bakedStyle);
    // Clone vẫn dùng cùng src (data URL) nên ảnh vẽ được
    const wrap = document.createElement("div");
    wrap.style.cssText = `position:fixed;left:-9999px;top:0;width:${currentLayout.exportWidth}px;height:${currentLayout.exportHeight}px;overflow:visible;`;
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(clone, {
      scale: 1,
      width: currentLayout.exportWidth,
      height: currentLayout.exportHeight,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    wrap.remove();

    const name =
      document.getElementById("iName").value.trim().replace(/\s+/g, "_") ||
      "cosplay_card";
    const a = document.createElement("a");
    a.download = `${name}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  } catch (err) {
    alert(`Lỗi export: ${err.message}`);
  }

  btn.textContent = "⬇ Export PNG";
  btn.disabled = false;
});
layoutTabs.forEach((btn) => {
  btn.addEventListener("click", () => switchLayout(btn.dataset.layout));
});

window.addEventListener("resize", () => {
  updatePreviewScale();
  if (loaded) sizePhotoToFit();
});

captureFormState("layout1");
captureFormState("layout2");
layoutFormState.layout2.iNameFontSize = "60";
if (!layoutFormState.layout1.iNameFontSize) layoutFormState.layout1.iNameFontSize = "70";

switchLayout("layout2");
