// ── Scrapbook PWA — app.js ──

// ── Config ──────────────────────────────────────────────────────
// Supabase — replace with your own project URL and anon key
// Get a free project at https://supabase.com
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const USE_CLOUD = SUPABASE_URL !== 'YOUR_SUPABASE_URL';

// ── State ────────────────────────────────────────────────────────
let state = {
  bookId: null,
  bookName: 'Our Scrapbook',
  userName: '',
  userId: null,
  currentWeekIdx: 0,
  currentSpreadIdx: 0,   // 0–3 (pairs of days)
  weeks: [],
  theme: 'cream',
  drawMode: false,
  drawBrush: 'pen',
  drawColor: '#3d2e1e',
  drawSize: 4,
  textFont: 'caveat',
  textColor: '#3d2e1e',
  textSize: 18,
  activePage: null,      // 'left' | 'right'
  pendingPhotoPage: null,
  pendingCommentPhotoId: null,
};

// ── Sticker data ──────────────────────────────────────────────────
const STICKERS = {
  flowers: ['🌸','🌺','🌻','🌹','🌷','🌼','💐','🍀','🌿','🍃','🪷','🌱','🌾','🍂','🍁'],
  feelings: ['💛','💕','🤍','💙','💚','🧡','💜','🖤','🤎','✨','⭐','🌟','💫','❤️','🥹','😊','🥰','🌈','☀️','🌙'],
  objects: ['📷','🎞️','✈️','☕','🍵','🎵','🎶','📚','🎨','🖊️','🎀','🎁','🏡','🌊','⛵','🎪','🍓','🍑','🧁','🕯️'],
};
const TAPE_COLORS = [
  '#FFD55A','#B0C8DC','#D8A8B0','#A8D0A8',
  '#F0B888','#C8A8E0','#88C8C0','#F0D0A0'
];

const TEXT_COLORS = ['#3d2e1e','#b03a2e','#2e6da4','#2d7a45','#7b4ba8','#b8860b','#555','#111'];
const DRAW_COLORS = ['#3d2e1e','#b03a2e','#2e6da4','#2d7a45','#f0c040','#e08030','#a050c0','#50c0b0','#fff'];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const THEMES = [
  { id:'cream',  label:'Cream',   bg:'#f5f0e8' },
  { id:'garden', label:'Garden',  bg:'#e8f0e4' },
  { id:'night',  label:'Night',   bg:'#1e1a2e' },
  { id:'rose',   label:'Rose',    bg:'#f5e8ec' },
  { id:'slate',  label:'Slate',   bg:'#e4e8ec' },
];

// ── Canvas drawing state ──────────────────────────────────────────
const canvases = { left: null, right: null };
const ctxs = { left: null, right: null };
const drawHistories = { left: [], right: [] };
let isDrawing = false;
let lastX = 0, lastY = 0;

// ── Boot ─────────────────────────────────────────────────────────
function boot() {
  loadLocalState();
  applyTheme(state.theme);
  if (state.bookId) {
    showMain();
  } else {
    document.getElementById('setup-screen').classList.add('active');
  }
  bindUI();
}

function loadLocalState() {
  try {
    const raw = localStorage.getItem('scrapbook_v3');
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch(e) {}
}

function saveLocalState() {
  try {
    const slim = { ...state, drawMode: false };
    localStorage.setItem('scrapbook_v3', JSON.stringify(slim));
  } catch(e) {}
}

// ── Setup ────────────────────────────────────────────────────────
function bindUI() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  document.getElementById('create-book-btn').addEventListener('click', createBook);
  document.getElementById('join-book-btn').addEventListener('click', joinBook);

  // Topbar
  document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('menu-book-title').textContent = state.bookName;
    document.getElementById('menu-user-name').textContent = '✦ ' + state.userName;
    document.getElementById('side-menu').classList.remove('hidden');
  });
  document.getElementById('close-menu-btn').addEventListener('click', () => {
    document.getElementById('side-menu').classList.add('hidden');
  });
  document.getElementById('side-menu').addEventListener('click', e => {
    if (e.target === document.getElementById('side-menu')) {
      document.getElementById('side-menu').classList.add('hidden');
    }
  });
  document.getElementById('rename-book-btn').addEventListener('click', () => {
    const name = prompt('Rename your scrapbook:', state.bookName);
    if (name && name.trim()) {
      state.bookName = name.trim();
      document.getElementById('book-title-display').textContent = state.bookName;
      document.getElementById('side-menu').classList.add('hidden');
      saveLocalState();
    }
  });
  document.getElementById('change-theme-btn').addEventListener('click', () => {
    document.getElementById('side-menu').classList.add('hidden');
    openThemePicker();
  });
  document.getElementById('leave-book-btn').addEventListener('click', () => {
    if (confirm('Leave this scrapbook? Your local data will be cleared.')) {
      localStorage.removeItem('scrapbook_v3');
      location.reload();
    }
  });

  // Week nav
  document.getElementById('prev-spread').addEventListener('click', prevSpread);
  document.getElementById('next-spread').addEventListener('click', nextSpread);

  // Bottom toolbar
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      openTool(tool);
    });
  });

  // Write panel
  buildColorPicker('text-color-row', TEXT_COLORS, color => { state.textColor = color; }, state.textColor);
  document.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.textFont = btn.dataset.font;
    });
  });
  const textSizeInput = document.getElementById('text-size');
  textSizeInput.addEventListener('input', () => {
    state.textSize = parseInt(textSizeInput.value);
    document.getElementById('text-size-val').textContent = textSizeInput.value + 'px';
  });
  document.getElementById('add-note-btn').addEventListener('click', addNote);

  // Sticker panel
  buildStickerGrids();

  // Draw panel
  buildColorPicker('draw-color-row', DRAW_COLORS, color => {
    state.drawColor = color;
    if (ctxs.left) updateBrush(ctxs.left);
    if (ctxs.right) updateBrush(ctxs.right);
  }, state.drawColor);
  document.querySelectorAll('.draw-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.draw-tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.drawBrush = btn.dataset.brush;
      updateAllBrushes();
    });
  });
  const brushSizeInput = document.getElementById('brush-size');
  brushSizeInput.addEventListener('input', () => {
    state.drawSize = parseInt(brushSizeInput.value);
    document.getElementById('brush-size-val').textContent = brushSizeInput.value;
    updateAllBrushes();
  });
  document.getElementById('undo-draw-btn').addEventListener('click', undoDraw);
  document.getElementById('clear-draw-btn').addEventListener('click', clearDraw);

  // Weeks panel
  document.getElementById('add-week-btn').addEventListener('click', addWeek);
  document.getElementById('copy-code-btn').addEventListener('click', copyShareCode);

  // Theme picker
  buildThemeGrid();
  document.getElementById('close-theme-btn').addEventListener('click', () => {
    document.getElementById('theme-picker').classList.add('hidden');
  });
  document.getElementById('theme-picker').addEventListener('click', e => {
    if (e.target === document.getElementById('theme-picker')) {
      document.getElementById('theme-picker').classList.add('hidden');
    }
  });

  // Comment overlay
  document.getElementById('close-comment-btn').addEventListener('click', () => {
    document.getElementById('comment-overlay').classList.add('hidden');
  });
  document.getElementById('post-comment-btn').addEventListener('click', postComment);
  document.getElementById('comment-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') postComment();
  });

  // File input
  document.getElementById('file-input').addEventListener('change', handleFileInput);

  // PWA install
  setupPWA();

  // Offline
  window.addEventListener('offline', () => showToast('You\'re offline — changes saved locally'));
  window.addEventListener('online', () => showToast('Back online ✓'));
}

// ── Book creation / joining ──────────────────────────────────────
function createBook() {
  const name = document.getElementById('book-name-input').value.trim();
  const user = document.getElementById('creator-name-input').value.trim();
  if (!name || !user) { alert('Please fill in both fields!'); return; }

  state.bookId = generateId();
  state.bookName = name;
  state.userName = user;
  state.userId = generateId();
  state.weeks = generateWeeksUntilEndOf2025();
  const todayMonday = getMondayOf(new Date()).toISOString().slice(0,10);
  state.currentWeekIdx = Math.max(0, state.weeks.findIndex(w => w.start === todayMonday));
  state.currentSpreadIdx = 0;

  saveLocalState();
  showMain();
  if (USE_CLOUD) syncToCloud();
}

function joinBook() {
  const code = document.getElementById('join-code-input').value.trim();
  const user = document.getElementById('joiner-name-input').value.trim();
  if (!code || !user) { alert('Please fill in both fields!'); return; }
  state.bookId = code;
  state.userName = user;
  state.userId = generateId();
  saveLocalState();
  showMain();
  if (USE_CLOUD) loadFromCloud();
}

// ── Main screen ──────────────────────────────────────────────────
function showMain() {
  document.getElementById('setup-screen').classList.remove('active');
  document.getElementById('main-screen').classList.add('active');
  document.getElementById('book-title-display').textContent = state.bookName;
  renderWeeksList();
  renderSpread();
  updateShareCode();
}

function openTool(tool) {
  const panel = document.getElementById('tool-panel');
  const panels = { photo: null, write: 'panel-write', sticker: 'panel-sticker', draw: 'panel-draw', weeks: 'panel-weeks' };

  // Toggle draw mode
  state.drawMode = (tool === 'draw');
  [canvases.left, canvases.right].forEach(c => {
    if (!c) return;
    if (state.drawMode) c.classList.add('active');
    else c.classList.remove('active');
  });

  if (tool === 'photo') {
    panel.classList.add('hidden');
    // Handled by photo slot click
    return;
  }

  const panelId = panels[tool];
  if (!panelId) { panel.classList.add('hidden'); return; }

  document.querySelectorAll('.panel-content').forEach(p => p.classList.add('hidden'));
  document.getElementById(panelId).classList.remove('hidden');
  panel.classList.remove('hidden');

  if (tool === 'weeks') renderWeeksList();
}

// ── Spread navigation ────────────────────────────────────────────
let _flipping = false;

function prevSpread() {
  if (_flipping) return;
  const canGo = state.currentSpreadIdx > 0 || state.currentWeekIdx > 0;
  if (!canGo) return;
  flipPage('back', () => {
    if (state.currentSpreadIdx > 0) {
      state.currentSpreadIdx--;
    } else {
      state.currentWeekIdx--;
      state.currentSpreadIdx = 3;
    }
    renderSpread();
  });
}

function nextSpread() {
  if (_flipping) return;
  const canGo = state.currentSpreadIdx < 3 || state.currentWeekIdx < state.weeks.length - 1;
  if (!canGo) return;
  flipPage('forward', () => {
    if (state.currentSpreadIdx < 3) {
      state.currentSpreadIdx++;
    } else {
      state.currentWeekIdx++;
      state.currentSpreadIdx = 0;
    }
    renderSpread();
  });
}

function flipPage(direction, callback) {
  _flipping = true;
  const layer = document.getElementById('flip-layer');
  layer.innerHTML = '';

  const leaf = document.createElement('div');
  leaf.className = 'flip-leaf ' + (direction === 'forward' ? 'flip-right' : 'flip-left');

  const face = document.createElement('div');
  face.className = 'face';
  const back = document.createElement('div');
  back.className = 'back';

  leaf.appendChild(face);
  leaf.appendChild(back);
  layer.appendChild(leaf);

  // Trigger animation after paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      leaf.classList.add(direction === 'forward' ? 'flipping-fwd' : 'flipping-bck');
    });
  });

  leaf.addEventListener('animationend', () => {
    layer.innerHTML = '';
    _flipping = false;
    callback();
  }, { once: true });
}

function goToSpread(weekIdx, spreadIdx) {
  state.currentWeekIdx = weekIdx;
  state.currentSpreadIdx = spreadIdx;
  renderSpread();
  document.getElementById('tool-panel').classList.add('hidden');
}

// ── Render spread ────────────────────────────────────────────────
function renderSpread() {
  const week = state.weeks[state.currentWeekIdx];
  if (!week) return;

  const leftDayIdx = state.currentSpreadIdx * 2;
  const rightDayIdx = leftDayIdx + 1;
  const leftDay = week.days[leftDayIdx];
  const rightDay = week.days[rightDayIdx];

  // Update label
  const leftLabel = leftDay ? leftDay.dayName.slice(0,3) : '';
  const rightLabel = rightDay ? rightDay.dayName.slice(0,3) : '';
  document.getElementById('spread-label').textContent = leftLabel + ' · ' + rightLabel;

  renderPage('left', leftDay, leftDayIdx);
  renderPage('right', rightDay, rightDayIdx);

  renderSpreadDots();
  setupDrawCanvas('left');
  setupDrawCanvas('right');
}

function renderPage(side, dayData, dayIdx) {
  const container = document.getElementById('page-' + side);
  container.innerHTML = '';
  container.dataset.side = side;
  container.dataset.dayIdx = dayIdx;

  if (!dayData) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-family:Caveat,cursive;color:var(--kraft);font-size:14px;text-align:center;line-height:2;">no memories<br>yet ✦</div>`;
    addPageNum(container, dayIdx, side);
    return;
  }

  // Day header
  const header = el('div', 'day-header');
  const nameEl = el('span', 'day-name', dayData.dayName);
  const dateEl = el('span', 'day-date', formatDate(dayData.date));
  header.appendChild(nameEl);
  header.appendChild(dateEl);
  container.appendChild(header);

  // Photo grid
  const grid = el('div', 'photo-grid');
  for (let i = 0; i < 4; i++) {
    const photo = dayData.photos[i];
    const slot = el('div', 'photo-slot' + (photo ? ' has-photo' : ''));
    if (photo) {
      const img = document.createElement('img');
      img.src = photo.data;
      img.loading = 'lazy';
      img.alt = '';
      slot.appendChild(img);

      // Remove button
      const rmBtn = el('button', 'remove-slot', '×');
      rmBtn.title = 'Remove photo';
      rmBtn.addEventListener('click', e => { e.stopPropagation(); removePhoto(dayData, i); });
      slot.appendChild(rmBtn);

      // Comment button
      const commentBtn = el('button', 'comment-btn', '💬');
      commentBtn.addEventListener('click', e => { e.stopPropagation(); openComments(photo.id); });
      slot.appendChild(commentBtn);

      // Comment count badge
      const comments = photo.comments || [];
      if (comments.length > 0) {
        const badge = el('div', 'comment-count', comments.length + '');
        badge.style.display = 'block';
        slot.appendChild(badge);
      }
    } else if (dayData.photos.length < 4) {
      const addIcon = el('div', 'add-photo-icon');
      addIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="20" height="15" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M9 5l1.5-2h3L15 5"/></svg><span>add photo</span>`;
      slot.appendChild(addIcon);
      slot.addEventListener('click', () => triggerPhotoUpload(side, dayData));
    } else {
      slot.style.opacity = '0.25';
      slot.style.cursor = 'default';
    }
    grid.appendChild(slot);
  }
  container.appendChild(grid);

  // Stickers and notes
  const overlayLayer = el('div', '');
  overlayLayer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:8;';
  renderPageOverlays(overlayLayer, dayData, side);
  container.appendChild(overlayLayer);

  // Draw canvas placeholder (will be set up separately)
  const canvasEl = document.createElement('canvas');
  canvasEl.className = 'draw-canvas' + (state.drawMode ? ' active' : '');
  canvasEl.id = 'canvas-' + side;
  container.appendChild(canvasEl);

  // Restore canvas drawing
  if (dayData.drawing) {
    restoreDrawing(canvasEl, dayData.drawing);
  }

  addPageNum(container, dayIdx, side);
}

function addPageNum(container, idx, side) {
  const pn = el('div', 'page-num', String(idx + 1));
  container.appendChild(pn);
}

function renderPageOverlays(layer, dayData, side) {
  // Render stickers
  (dayData.stickers || []).forEach((s, i) => {
    const el2 = document.createElement('div');
    el2.className = 'page-sticker';
    el2.style.cssText = `left:${s.x}%;top:${s.y}%;pointer-events:all;`;
    el2.textContent = s.emoji;

    // Tape sticker
    if (s.tape) {
      el2.textContent = '';
      el2.style.cssText += `width:${s.tapeW || 60}px;height:14px;background:${s.color};border-radius:2px;opacity:0.65;`;
    }

    const del = document.createElement('div');
    del.className = 'del-overlay';
    del.textContent = '×';
    del.addEventListener('click', e => { e.stopPropagation(); removeSticker(dayData, i); });
    el2.appendChild(del);

    makeDraggable(el2, (nx, ny) => {
      s.x = nx; s.y = ny;
      saveLocalState();
    });
    layer.appendChild(el2);
  });

  // Render notes
  (dayData.notes || []).forEach((n, i) => {
    const noteEl = document.createElement('div');
    noteEl.className = 'page-note';
    noteEl.style.cssText = `left:${n.x}%;top:${n.y}%;color:${n.color};font-size:${n.size}px;pointer-events:all;`;
    if (n.font === 'lora') noteEl.style.fontFamily = "'Lora', serif";
    else if (n.font === 'mono') noteEl.style.fontFamily = "'Courier New', monospace";
    else noteEl.style.fontFamily = "'Caveat', cursive";
    noteEl.textContent = n.text;

    const del = document.createElement('div');
    del.style.cssText = 'position:absolute;top:-8px;right:-8px;background:var(--red-stamp);color:#fff;border-radius:50%;width:16px;height:16px;font-size:10px;display:none;align-items:center;justify-content:center;cursor:pointer;';
    del.textContent = '×';
    del.addEventListener('click', e => { e.stopPropagation(); removeNote(dayData, i); });
    noteEl.appendChild(del);
    noteEl.addEventListener('mouseenter', () => del.style.display = 'flex');
    noteEl.addEventListener('mouseleave', () => del.style.display = 'none');

    makeDraggable(noteEl, (nx, ny) => { n.x = nx; n.y = ny; saveLocalState(); });
    layer.appendChild(noteEl);
  });
}

// ── Spread dots ──────────────────────────────────────────────────
function renderSpreadDots() {
  const container = document.getElementById('spread-dots');
  container.innerHTML = '';
  const totalSpreads = state.weeks.length * 4;
  const currentGlobal = state.currentWeekIdx * 4 + state.currentSpreadIdx;

  // Show up to 9 dots with a window
  const maxDots = Math.min(totalSpreads, 9);
  let start = Math.max(0, currentGlobal - 4);
  let end = Math.min(totalSpreads, start + maxDots);
  start = Math.max(0, end - maxDots);

  for (let i = start; i < end; i++) {
    const dot = el('div', 'spread-dot' + (i === currentGlobal ? ' active' : ''));
    const wIdx = Math.floor(i / 4);
    const sIdx = i % 4;
    dot.addEventListener('click', () => goToSpread(wIdx, sIdx));
    container.appendChild(dot);
  }
}

// ── Canvas drawing ───────────────────────────────────────────────
function setupDrawCanvas(side) {
  const container = document.getElementById('page-' + side);
  const canvas = container.querySelector('.draw-canvas');
  if (!canvas) return;
  canvases[side] = canvas;

  // Size canvas to parent
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  const ctx = canvas.getContext('2d');
  ctxs[side] = ctx;
  updateBrush(ctx);

  // Restore saved drawing
  const week = state.weeks[state.currentWeekIdx];
  if (!week) return;
  const dayIdx = state.currentSpreadIdx * 2 + (side === 'right' ? 1 : 0);
  const day = week.days[dayIdx];
  if (day && day.drawing) restoreDrawing(canvas, day.drawing);

  canvas.addEventListener('pointerdown', e => startDraw(e, side));
  canvas.addEventListener('pointermove', e => moveDraw(e, side));
  canvas.addEventListener('pointerup', e => endDraw(e, side));
  canvas.addEventListener('pointerleave', e => endDraw(e, side));
}

function updateBrush(ctx) {
  if (!ctx) return;
  if (state.drawBrush === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = state.drawSize * 3;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = state.drawColor;
    if (state.drawBrush === 'highlighter') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = state.drawSize * 4;
    } else if (state.drawBrush === 'brush') {
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = state.drawSize * 2;
    } else {
      ctx.globalAlpha = 1;
      ctx.lineWidth = state.drawSize;
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function updateAllBrushes() {
  if (ctxs.left) updateBrush(ctxs.left);
  if (ctxs.right) updateBrush(ctxs.right);
}

function getCanvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
}

function startDraw(e, side) {
  if (!state.drawMode) return;
  e.preventDefault();
  isDrawing = true;
  const pos = getCanvasPos(canvases[side], e);
  lastX = pos.x; lastY = pos.y;
  const ctx = ctxs[side];
  updateBrush(ctx);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
}

function moveDraw(e, side) {
  if (!isDrawing || !state.drawMode) return;
  e.preventDefault();
  const pos = getCanvasPos(canvases[side], e);
  const ctx = ctxs[side];
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  lastX = pos.x; lastY = pos.y;
}

function endDraw(e, side) {
  if (!isDrawing) return;
  isDrawing = false;
  // Save canvas state
  const canvas = canvases[side];
  const dataURL = canvas.toDataURL('image/png');
  const week = state.weeks[state.currentWeekIdx];
  const dayIdx = state.currentSpreadIdx * 2 + (side === 'right' ? 1 : 0);
  if (week && week.days[dayIdx]) {
    week.days[dayIdx].drawing = dataURL;
    saveLocalState();
  }
}

function undoDraw() {
  const side = 'left'; // simplified — undo on active page
  const canvas = canvases[side];
  if (!canvas) return;
  const ctx = ctxs[side];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveLocalState();
}

function clearDraw() {
  ['left','right'].forEach(side => {
    const canvas = canvases[side];
    if (!canvas) return;
    const ctx = ctxs[side];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const week = state.weeks[state.currentWeekIdx];
    const dayIdx = state.currentSpreadIdx * 2 + (side === 'right' ? 1 : 0);
    if (week && week.days[dayIdx]) {
      week.days[dayIdx].drawing = null;
      saveLocalState();
    }
  });
}

function restoreDrawing(canvas, dataURL) {
  if (!dataURL) return;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  img.src = dataURL;
}

// ── Photos ───────────────────────────────────────────────────────
function triggerPhotoUpload(side, dayData) {
  state.pendingPhotoPage = { side, dayData };
  document.getElementById('file-input').click();
}

function handleFileInput(e) {
  if (!state.pendingPhotoPage || !e.target.files.length) return;
  const { dayData } = state.pendingPhotoPage;
  const files = Array.from(e.target.files).slice(0, 4 - dayData.photos.length);
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      // Compress image
      compressImage(ev.target.result, 800, (compressed) => {
        dayData.photos.push({ id: generateId(), data: compressed, comments: [] });
        loaded++;
        if (loaded === files.length) {
          saveLocalState();
          renderSpread();
          if (USE_CLOUD) syncToCloud();
        }
      });
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
  state.pendingPhotoPage = null;
}

function removePhoto(dayData, idx) {
  dayData.photos.splice(idx, 1);
  saveLocalState();
  renderSpread();
}

function compressImage(dataURL, maxW, cb) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxW / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    cb(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.src = dataURL;
}

// ── Notes ─────────────────────────────────────────────────────────
function addNote() {
  const text = document.getElementById('note-input').value.trim();
  if (!text) return;
  const week = state.weeks[state.currentWeekIdx];
  if (!week) return;
  // Add to left page by default (or whichever was last interacted with)
  const dayIdx = state.currentSpreadIdx * 2;
  const day = week.days[dayIdx];
  if (!day) return;
  if (!day.notes) day.notes = [];
  day.notes.push({
    text, color: state.textColor, font: state.textFont,
    size: state.textSize, x: 5, y: 35
  });
  document.getElementById('note-input').value = '';
  saveLocalState();
  renderSpread();
}

function removeNote(dayData, idx) {
  dayData.notes.splice(idx, 1);
  saveLocalState();
  renderSpread();
}

// ── Stickers ──────────────────────────────────────────────────────
function buildStickerGrids() {
  populateStickerGrid('grid-flowers', STICKERS.flowers, false);
  populateStickerGrid('grid-feelings', STICKERS.feelings, false);
  populateStickerGrid('grid-objects', STICKERS.objects, false);

  const tapeGrid = document.getElementById('grid-tape');
  TAPE_COLORS.forEach(color => {
    const item = document.createElement('div');
    item.className = 'tape-sticker-item';
    item.style.background = color;
    item.addEventListener('click', () => addTapeSticker(color));
    tapeGrid.appendChild(item);
  });
}

function populateStickerGrid(gridId, emojis, isTape) {
  const grid = document.getElementById(gridId);
  emojis.forEach(emoji => {
    const item = el('div', 'sticker-item', emoji);
    item.addEventListener('click', () => addSticker(emoji));
    grid.appendChild(item);
  });
}

function addSticker(emoji) {
  const week = state.weeks[state.currentWeekIdx];
  const dayIdx = state.currentSpreadIdx * 2;
  const day = week.days[dayIdx];
  if (!day) return;
  if (!day.stickers) day.stickers = [];
  day.stickers.push({ emoji, x: 10 + Math.random() * 70, y: 20 + Math.random() * 60 });
  saveLocalState();
  renderSpread();
}

function addTapeSticker(color) {
  const week = state.weeks[state.currentWeekIdx];
  const dayIdx = state.currentSpreadIdx * 2;
  const day = week.days[dayIdx];
  if (!day) return;
  if (!day.stickers) day.stickers = [];
  day.stickers.push({ emoji: '', tape: true, color, tapeW: 50 + Math.random() * 40, x: 5 + Math.random() * 60, y: 10 + Math.random() * 80 });
  saveLocalState();
  renderSpread();
}

function removeSticker(dayData, idx) {
  dayData.stickers.splice(idx, 1);
  saveLocalState();
  renderSpread();
}

// ── Comments ──────────────────────────────────────────────────────
function openComments(photoId) {
  state.pendingCommentPhotoId = photoId;
  const photo = findPhoto(photoId);
  const list = document.getElementById('comments-list');
  list.innerHTML = '';
  const comments = (photo && photo.comments) || [];
  if (comments.length === 0) {
    list.innerHTML = '<div class="no-comments">No comments yet — be the first! ✦</div>';
  } else {
    comments.forEach(c => {
      const item = el('div', 'comment-item');
      item.innerHTML = `<div class="comment-author">${escHtml(c.author)}</div><div class="comment-text">${escHtml(c.text)}</div><div class="comment-time">${c.time}</div>`;
      list.appendChild(item);
    });
  }
  document.getElementById('comment-overlay').classList.remove('hidden');
}

function postComment() {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();
  if (!text) return;
  const photo = findPhoto(state.pendingCommentPhotoId);
  if (!photo) return;
  if (!photo.comments) photo.comments = [];
  photo.comments.push({
    author: state.userName,
    text,
    time: new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
  });
  input.value = '';
  saveLocalState();
  openComments(state.pendingCommentPhotoId);
  renderSpread();
}

function findPhoto(id) {
  for (const week of state.weeks) {
    for (const day of week.days) {
      for (const photo of (day.photos || [])) {
        if (photo.id === id) return photo;
      }
    }
  }
  return null;
}

// ── Weeks ─────────────────────────────────────────────────────────
function generateWeeksUntilEndOf2025() {
  const weeks = [];
  const start = getMondayOf(new Date(2025, 0, 1)); // First Monday of/before Jan 1 2025
  const end = new Date(2025, 11, 31); // Dec 31 2025
  let current = new Date(start);
  while (current <= end) {
    weeks.push(createWeek(new Date(current)));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function createWeek(mondayDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    days.push({ date: d.toISOString().slice(0,10), dayName: DAYS[i], photos: [], notes: [], stickers: [], drawing: null });
  }
  return { id: generateId(), start: mondayDate.toISOString().slice(0,10), days };
}

function addWeek() {
  const lastWeek = state.weeks[state.weeks.length - 1];
  const lastStart = new Date(lastWeek.start + 'T00:00:00');
  lastStart.setDate(lastStart.getDate() + 7);
  state.weeks.push(createWeek(lastStart));
  state.currentWeekIdx = state.weeks.length - 1;
  state.currentSpreadIdx = 0;
  saveLocalState();
  renderWeeksList();
  renderSpread();
}

function renderWeeksList() {
  const list = document.getElementById('weeks-list');
  list.innerHTML = '';
  state.weeks.forEach((week, wIdx) => {
    const photoCount = week.days.reduce((n, d) => n + (d.photos||[]).length, 0);
    const item = el('div', 'week-item' + (wIdx === state.currentWeekIdx ? ' active' : ''));
    const label = el('div', 'week-item-label', weekRangeLabel(week));
    const photos = el('div', 'week-item-photos', photoCount + ' photo' + (photoCount !== 1 ? 's' : ''));
    item.appendChild(label);
    item.appendChild(photos);
    item.addEventListener('click', () => goToSpread(wIdx, 0));
    list.appendChild(item);
  });
}

// ── Theme ─────────────────────────────────────────────────────────
function buildThemeGrid() {
  const grid = document.getElementById('theme-grid');
  THEMES.forEach(t => {
    const swatch = el('div', 'theme-swatch' + (t.id === state.theme ? ' active' : ''));
    const color = el('div', 'theme-swatch-color');
    color.style.background = t.bg;
    const label = el('span', '', t.label);
    swatch.appendChild(color);
    swatch.appendChild(label);
    swatch.addEventListener('click', () => {
      document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      state.theme = t.id;
      applyTheme(t.id);
      saveLocalState();
    });
    grid.appendChild(swatch);
  });
}

function applyTheme(themeId) {
  document.documentElement.removeAttribute('data-theme');
  if (themeId !== 'cream') document.documentElement.setAttribute('data-theme', themeId);
}

function openThemePicker() {
  document.getElementById('theme-picker').classList.remove('hidden');
}

// ── Share ─────────────────────────────────────────────────────────
function updateShareCode() {
  document.getElementById('share-code-display').textContent = state.bookId || '';
}

function copyShareCode() {
  const code = state.bookId || '';
  navigator.clipboard.writeText(code).then(() => {
    showToast('Code copied! ✓');
    document.getElementById('copy-code-btn').textContent = 'Copied!';
    setTimeout(() => document.getElementById('copy-code-btn').textContent = 'Copy', 2000);
  }).catch(() => {
    prompt('Copy this code:', code);
  });
}

// ── Cloud sync (Supabase) ─────────────────────────────────────────
async function syncToCloud() {
  if (!USE_CLOUD) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/scrapbooks`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ id: state.bookId, name: state.bookName, data: JSON.stringify(state.weeks), updated_at: new Date().toISOString() })
    });
  } catch(e) { console.warn('Cloud sync failed', e); }
}

async function loadFromCloud() {
  if (!USE_CLOUD) return;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scrapbooks?id=eq.${state.bookId}&select=*`, {
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY }
    });
    const rows = await res.json();
    if (rows && rows[0] && rows[0].data) {
      state.weeks = JSON.parse(rows[0].data);
      state.bookName = rows[0].name || state.bookName;
      saveLocalState();
      renderSpread();
    }
  } catch(e) { console.warn('Cloud load failed', e); }
}

// ── Color picker helper ───────────────────────────────────────────
function buildColorPicker(containerId, colors, onChange, selected) {
  const row = document.getElementById(containerId);
  colors.forEach(color => {
    const dot = el('div', 'color-dot' + (color === selected ? ' selected' : ''));
    dot.style.background = color === '#fff' ? '#f0f0f0' : color;
    if (color === '#fff') dot.style.border = '2px solid #ccc';
    dot.addEventListener('click', () => {
      row.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      onChange(color);
    });
    row.appendChild(dot);
  });
}

// ── Drag helper ───────────────────────────────────────────────────
function makeDraggable(el2, onMove) {
  let dragging = false, startX, startY, startLeft, startTop;
  el2.addEventListener('pointerdown', e => {
    if (e.target.classList.contains('del-overlay')) return;
    dragging = true;
    el2.setPointerCapture(e.pointerId);
    startX = e.clientX; startY = e.clientY;
    startLeft = parseFloat(el2.style.left) || 0;
    startTop = parseFloat(el2.style.top) || 0;
    e.stopPropagation();
  });
  el2.addEventListener('pointermove', e => {
    if (!dragging) return;
    const parent = el2.parentElement;
    const pr = parent.getBoundingClientRect();
    const dx = (e.clientX - startX) / pr.width * 100;
    const dy = (e.clientY - startY) / pr.height * 100;
    const nx = Math.max(0, Math.min(90, startLeft + dx));
    const ny = Math.max(0, Math.min(90, startTop + dy));
    el2.style.left = nx + '%';
    el2.style.top = ny + '%';
    onMove(nx, ny);
    e.stopPropagation();
  });
  el2.addEventListener('pointerup', () => { dragging = false; });
}

// ── PWA setup ─────────────────────────────────────────────────────
function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('install-banner');
    banner.classList.remove('hidden');
    banner.querySelector('#install-now-btn').addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { deferredPrompt = null; banner.classList.add('hidden'); });
    });
    banner.querySelector('#dismiss-banner-btn').addEventListener('click', () => banner.classList.add('hidden'));
  });
}

// ── Utilities ─────────────────────────────────────────────────────
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function weekRangeLabel(week) {
  const s = new Date(week.start + 'T00:00:00');
  const e = new Date(s); e.setDate(s.getDate() + 6);
  return s.toLocaleDateString('en-GB',{day:'numeric',month:'short'}) + ' – ' + e.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  const t = document.getElementById('offline-toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Start ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
