/**
 * Cosplay Card Editor – Nekomizu
 * ES6: upload ảnh, pan/zoom, form → preview, export PNG 1020×1680
 */

// Card hiển thị scale 0.35; delta drag (px màn hình) chia cho scale = px trong card
const PREVIEW_SCALE = 0.35;

const photoLayer = document.getElementById('photo-layer');
const photoImg = document.getElementById('photo-img');
const placeholder = document.getElementById('placeholder');
const imgControls = document.getElementById('imgControls');
const scaleSlider = document.getElementById('scaleSlider');
const scaleVal = document.getElementById('scaleVal');
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');

let loaded = false;
let scale = 1.0;
let ox = 0, oy = 0;
let dragging = false;
let dsx, dsy, dox, doy;
/** Kích thước/vị trí gốc ảnh (sau fit) — dùng để bake pan/zoom khi export */
let basePhotoWidth = 0, basePhotoHeight = 0, basePhotoLeft = 0, basePhotoTop = 0;

function applyTransform() {
  if (photoImg) photoImg.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
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
  photoImg.style.width = w + 'px';
  photoImg.style.height = h + 'px';
  photoImg.style.left = left + 'px';
  photoImg.style.top = top + 'px';
  applyTransform();
}

/** Tính style đã bake (pan/zoom → position + size) để export đúng view như preview */
function getBakedPhotoStyle() {
  if (!loaded || !basePhotoWidth) return null;
  const w = basePhotoWidth * scale;
  const h = basePhotoHeight * scale;
  const left = basePhotoLeft + (basePhotoWidth - w) / 2 + ox;
  const top = basePhotoTop + (basePhotoHeight - h) / 2 + oy;
  return { width: w + 'px', height: h + 'px', left: left + 'px', top: top + 'px', transform: 'none' };
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
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) loadFile(f);
});

// Paste ảnh từ clipboard (copy ảnh từ web / màn hình)
document.addEventListener('paste', (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (items[i].type.indexOf('image') !== -1) {
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
    scale = 1; ox = 0; oy = 0;
    scaleSlider.value = 100;
    scaleVal.textContent = '100%';

    photoImg.onload = () => {
      sizePhotoToFit();
    };
    photoImg.src = ev.target.result;
    photoImg.style.display = 'block';
    placeholder.style.display = 'none';
    loaded = true;
    if (imgControls) imgControls.classList.add('active');
  };
  reader.onerror = () => alert('Không đọc được file ảnh.');
  reader.readAsDataURL(file);
}

document.getElementById('removeBtn').addEventListener('click', () => {
  photoImg.src = '';
  photoImg.style.display = 'none';
  photoImg.style.width = '';
  photoImg.style.height = '';
  photoImg.style.left = '';
  photoImg.style.top = '';
  placeholder.style.display = 'flex';
  loaded = false;
  imgControls.classList.remove('active');
  fileInput.value = '';
  scale = 1; ox = 0; oy = 0;
});

// ─── SCALE SLIDER ────────────────────────────────────────
scaleSlider.addEventListener('input', (e) => {
  scale = e.target.value / 100;
  scaleVal.textContent = `${e.target.value}%`;
  applyTransform();
});

// ─── DRAG TO PAN ─────────────────────────────────────────
photoLayer.addEventListener('mousedown', (e) => {
  if (!loaded) return;
  dragging = true;
  dsx = e.clientX; dsy = e.clientY;
  dox = ox; doy = oy;
  photoLayer.style.cursor = 'grabbing';
  e.preventDefault();
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  ox = dox + (e.clientX - dsx) / PREVIEW_SCALE;
  oy = doy + (e.clientY - dsy) / PREVIEW_SCALE;
  applyTransform();
});

document.addEventListener('mouseup', () => {
  if (dragging) {
    dragging = false;
    photoLayer.style.cursor = 'crosshair';
  }
});

photoLayer.addEventListener('touchstart', (e) => {
  if (!loaded) return;
  dragging = true;
  const t = e.touches[0];
  dsx = t.clientX; dsy = t.clientY;
  dox = ox; doy = oy;
  e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (!dragging) return;
  const t = e.touches[0];
  ox = dox + (t.clientX - dsx) / PREVIEW_SCALE;
  oy = doy + (t.clientY - dsy) / PREVIEW_SCALE;
  applyTransform();
}, { passive: false });

document.addEventListener('touchend', () => { dragging = false; });

// ─── SCROLL TO ZOOM ──────────────────────────────────────
photoLayer.addEventListener('wheel', (e) => {
  if (!loaded) return;
  e.preventDefault();
  const step = e.deltaY > 0 ? -0.04 : 0.04;
  scale = Math.max(0.1, Math.min(10, scale + step));
  const pct = Math.round(scale * 100);
  scaleSlider.value = Math.min(400, Math.max(20, pct));
  scaleVal.textContent = `${pct}%`;
  applyTransform();
}, { passive: false });

// ─── INPUT → PREVIEW ─────────────────────────────────────
function nl2br(s) {
  return s.replace(/\n/g, '<br>');
}

function syncTitle() {
  const el = document.getElementById('txt-name');
  const val = document.getElementById('iName').value || '';
  el.innerHTML = nl2br(val);
}
document.getElementById('iName').addEventListener('input', syncTitle);

document.getElementById('iNameFontSize').addEventListener('change', (e) => {
  document.getElementById('txt-name').style.fontSize = e.target.value + 'px';
});
// Áp cỡ chữ mặc định khi load
document.getElementById('txt-name').style.fontSize = document.getElementById('iNameFontSize').value + 'px';

document.getElementById('iPrice').addEventListener('input', (e) => {
  document.getElementById('txt-price').innerHTML = nl2br(e.target.value) || '';
});

document.getElementById('iDetail').addEventListener('input', (e) => {
  document.getElementById('txt-detail').innerHTML = nl2br(e.target.value) || '';
});

document.getElementById('iDisclaimer').addEventListener('input', (e) => {
  document.getElementById('txt-disclaimer').textContent = e.target.value;
});

document.getElementById('iNotice').addEventListener('input', (e) => {
  document.getElementById('txt-notice').textContent = e.target.value;
});

// ─── EXPORT PNG 1020×1680 ────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', async () => {
  const btn = document.getElementById('exportBtn');
  btn.textContent = '⏳ Đang xuất...';
  btn.disabled = true;

  const card = document.getElementById('card');
  const bakedStyle = getBakedPhotoStyle();

  try {
    // Clone card để export — giữ nguyên preview, clone có layout 1020×1680 + ảnh đúng pan/zoom
    const clone = card.cloneNode(true);
    clone.style.transform = 'scale(1)';
    const clonePhotoImg = clone.querySelector('#photo-img');
    if (clonePhotoImg && bakedStyle) applyBakedPhotoStyle(clonePhotoImg, bakedStyle);
    // Clone vẫn dùng cùng src (data URL) nên ảnh vẽ được
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1020px;height:1680px;overflow:visible;';
    wrap.appendChild(clone);
    document.body.appendChild(wrap);

    await new Promise((r) => setTimeout(r, 300));

    const canvas = await html2canvas(clone, {
      scale: 1,
      width: 1020,
      height: 1680,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    wrap.remove();

    const name = document.getElementById('iName').value.trim().replace(/\s+/g, '_') || 'cosplay_card';
    const a = document.createElement('a');
    a.download = `${name}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  } catch (err) {
    alert(`Lỗi export: ${err.message}`);
  }

  btn.textContent = '⬇ Export PNG';
  btn.disabled = false;
});
