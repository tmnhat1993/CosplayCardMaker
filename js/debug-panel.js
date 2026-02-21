/**
 * Debug panel: căn chỉnh vị trí text & ảnh (px) trên card 1020×1680.
 * Áp dụng inline style khi đổi số; Copy CSS để dán vào css/main.css.
 */

const CARD_ID = 'card';

// Giá trị mặc định (khớp css/main.css) — dùng khi reset & khi lấy giá trị lần đầu
const DEFAULTS = {
  'photo-layer': { top: 29, left: 56, width: 905, height: 905 },
  'txt-name': { top: 1002, left: 60, right: 60, height: 70, fontSize: 70, lineHeight: 1.1 },
  'txt-price': { top: 1138, left: 60, right: 60, fontSize: 52, lineHeight: 1.3 },
  'txt-detail': { top: 1340, left: 80, right: 80, fontSize: 45, lineHeight: 1.25 },
  'txt-disclaimer': { top: 1525, left: 80, right: 80, fontSize: 42, lineHeight: 1.4 },
  'txt-notice': { top: 1580, left: 80, right: 80, fontSize: 45, lineHeight: 1.4 },
};

function getCard() {
  return document.getElementById(CARD_ID);
}

function getEl(id) {
  const card = getCard();
  return card ? card.querySelector(`#${id}`) : null;
}

function px(val) {
  if (val === '' || val == null) return '';
  const n = Number(val);
  if (Number.isNaN(n)) return '';
  return `${n}px`;
}

function applyToElement(elId, prop, value) {
  const el = getEl(elId);
  if (!el) return;
  if (value === '' || value == null) {
    el.style[prop] = '';
    return;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return;
  if (prop === 'lineHeight') {
    el.style.lineHeight = String(num);
  } else if (prop === 'fontSize') {
    el.style.fontSize = px(num);
  } else {
    el.style[prop] = px(num);
  }
}

function readComputed(el, prop) {
  const s = window.getComputedStyle(el);
  if (prop === 'lineHeight') {
    const v = s.lineHeight;
    return v === 'normal' ? '' : parseFloat(v, 10);
  }
  if (prop === 'fontSize') {
    return parseFloat(s.fontSize, 10) || '';
  }
  const v = s.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
  if (!v || v === 'auto') return '';
  return parseFloat(v, 10) || '';
}

function fillInputsFromDom() {
  document.querySelectorAll('.debug-panel input[type=number][data-el][data-prop]').forEach((input) => {
    const elId = input.dataset.el;
    const prop = input.dataset.prop;
    const el = getEl(elId);
    if (!el) return;
    const val = readComputed(el, prop);
    input.value = val === '' ? '' : (prop === 'lineHeight' ? Number(val).toFixed(2) : Math.round(val));
  });
}

function applyInputToCard(input) {
  const elId = input.dataset.el;
  const prop = input.dataset.prop;
  const value = input.value.trim();
  applyToElement(elId, prop, value === '' ? '' : value);
}

function openPanel() {
  const overlay = document.getElementById('debugOverlay');
  if (!overlay) return;
  fillInputsFromDom();
  overlay.hidden = false;
}

function closePanel() {
  const overlay = document.getElementById('debugOverlay');
  if (overlay) overlay.hidden = true;
}

function resetToDefaults() {
  Object.keys(DEFAULTS).forEach((elId) => {
    const el = getEl(elId);
    const def = DEFAULTS[elId];
    if (!el || !def) return;
    Object.keys(def).forEach((prop) => {
      el.style[prop === 'fontSize' ? 'fontSize' : prop === 'lineHeight' ? 'lineHeight' : prop] = '';
    });
  });
  fillInputsFromDom();
}

function buildCssFromCurrent() {
  const byEl = {};
  document.querySelectorAll('.debug-panel input[type=number][data-el][data-prop]').forEach((input) => {
    const elId = input.dataset.el;
    const prop = input.dataset.prop;
    const raw = input.value.trim();
    if (raw === '') return;
    const val = prop === 'lineHeight' ? parseFloat(raw, 10) : Math.round(parseFloat(raw, 10));
    if (Number.isNaN(val)) return;
    if (!byEl[elId]) byEl[elId] = {};
    byEl[elId][prop] = val;
  });

  const lines = [];
  Object.keys(byEl).forEach((elId) => {
    const props = byEl[elId];
    const parts = [];
    Object.keys(props).forEach((prop) => {
      const v = props[prop];
      const cssName = prop === 'fontSize' ? 'font-size' : prop === 'lineHeight' ? 'line-height' : prop;
      const cssVal = prop === 'lineHeight' && typeof v === 'number' ? String(v) : `${v}px`;
      parts.push(`  ${cssName}: ${cssVal};`);
    });
    if (parts.length) {
      lines.push(`#${elId} {`);
      lines.push(parts.join('\n'));
      lines.push('}');
      lines.push('');
    }
  });
  return lines.join('\n').trim();
}

function copyCssToClipboard() {
  const css = buildCssFromCurrent();
  if (!css) return;
  navigator.clipboard.writeText(css).then(() => {
    const btn = document.getElementById('debugCopyCss');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = '✓ Đã copy!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }
  }).catch(() => alert('Không thể copy. Bạn có thể chọn và copy thủ công từ console.'));
}

function init() {
  const overlay = document.getElementById('debugOverlay');
  const toggle = document.getElementById('debugToggle');
  const closeBtn = document.getElementById('debugClose');
  const copyBtn = document.getElementById('debugCopyCss');
  const resetBtn = document.getElementById('debugReset');

  if (toggle) toggle.addEventListener('click', openPanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (overlay) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });
  }
  if (copyBtn) copyBtn.addEventListener('click', copyCssToClipboard);
  if (resetBtn) resetBtn.addEventListener('click', resetToDefaults);

  document.querySelectorAll('.debug-panel input[type=number][data-el][data-prop]').forEach((input) => {
    const onApply = () => applyInputToCard(input);
    input.addEventListener('input', onApply);
    input.addEventListener('change', onApply);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closePanel();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
