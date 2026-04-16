const STORAGE_KEYS = {
  userId: 'swearjar:userId',
  fineAmount: 'swearjar:fineAmount',
  localRecord: 'swearjar:localRecord'
};

const state = {
  userId: '',
  fineAmount: 1,
  todayCount: 0,
  weekCount: 0,
  recordCount: 0,
  totalAmount: 0,
  recentEvents: [],
  trend: [],
  adding: false
};

const elements = {
  streakBadge: document.getElementById('streak-badge'),
  total: document.getElementById('total'),
  offenses: document.getElementById('offenses'),
  tapHint: document.getElementById('tap-hint'),
  todayCount: document.getElementById('today-count'),
  weekCount: document.getElementById('week-count'),
  recordCount: document.getElementById('record-count'),
  addButton: document.getElementById('add-btn'),
  resetButton: document.getElementById('reset-btn'),
  jarArea: document.getElementById('jar-area'),
  bubble: document.getElementById('reaction-bubble'),
  mouth: document.getElementById('mouth'),
  pupilL: document.getElementById('pupil-l'),
  pupilR: document.getElementById('pupil-r'),
  fillRect: document.getElementById('fill-rect'),
  coinsInJar: document.getElementById('coins-in-jar'),
  coinEl: document.getElementById('coin-el'),
  historyArea: document.getElementById('history-area'),
  historyList: document.getElementById('history-list'),
  statusMessage: document.getElementById('status-message')
};

const reactions = ['Oh my...', 'Really?!', 'Again?!', 'Tsk tsk.', 'Goodness.', 'My word!', 'Oh dear.', 'For shame!', 'Yikes.', 'Hmm.'];

function getOrCreateUserId() {
  const existing = localStorage.getItem(STORAGE_KEYS.userId);
  if (existing) {
    return existing;
  }

  const generated = `user-${crypto.randomUUID()}`;
  localStorage.setItem(STORAGE_KEYS.userId, generated);
  return generated;
}

function loadFineAmount() {
  const value = Number.parseFloat(localStorage.getItem(STORAGE_KEYS.fineAmount));
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return value;
}

function loadLocalRecord() {
  const stored = Number.parseInt(localStorage.getItem(STORAGE_KEYS.localRecord), 10);
  if (!Number.isFinite(stored) || stored < 0) {
    return 0;
  }
  return stored;
}

function saveLocalRecord(value) {
  localStorage.setItem(STORAGE_KEYS.localRecord, String(value));
}

function currency(value) {
  return `$${value.toFixed(2)}`;
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
}

function getMouthPath(count) {
  if (count === 0) return 'M82 158 Q100 155 118 158';
  if (count <= 1) return 'M82 160 Q100 157 118 160';
  if (count <= 3) return 'M82 161 Q100 159 118 161';
  if (count <= 6) return 'M80 162 Q100 162 120 162';
  if (count <= 10) return 'M78 164 Q100 168 122 164';
  if (count <= 15) return 'M76 165 Q100 172 124 165';
  return 'M74 166 Q100 178 126 166';
}

function getPupilOffset(count) {
  if (count === 0) return { lx: 80, ly: 132, rx: 120, ry: 132 };
  if (count <= 3) return { lx: 80, ly: 133, rx: 120, ry: 133 };
  if (count <= 8) return { lx: 79, ly: 134, rx: 119, ry: 134 };
  return { lx: 78, ly: 135, rx: 118, ry: 135 };
}

function updateJarFill(count) {
  const maxFill = 110;
  const fillHeight = Math.min(count * 7, maxFill);
  const baseY = 208;
  elements.fillRect.setAttribute('y', String(baseY - fillHeight));
  elements.fillRect.setAttribute('height', String(fillHeight + 5));
}

function renderCoinsInJar() {
  const positions = [
    { cx: 65, cy: 195 }, { cx: 110, cy: 195 }, { cx: 88, cy: 190 },
    { cx: 55, cy: 185 }, { cx: 130, cy: 185 }, { cx: 100, cy: 182 },
    { cx: 70, cy: 178 }, { cx: 120, cy: 178 }, { cx: 85, cy: 175 },
    { cx: 105, cy: 172 }, { cx: 60, cy: 170 }, { cx: 140, cy: 170 }
  ];

  elements.coinsInJar.innerHTML = '';

  for (let i = 0; i < state.todayCount; i += 1) {
    const pos = positions[i % positions.length];

    const coin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    coin.setAttribute('cx', String(pos.cx));
    coin.setAttribute('cy', String(pos.cy));
    coin.setAttribute('r', '9');
    coin.setAttribute('fill', '#e8b840');
    coin.setAttribute('stroke', '#c09020');
    coin.setAttribute('stroke-width', '1');
    elements.coinsInJar.appendChild(coin);

    const shine = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    shine.setAttribute('cx', String(pos.cx - 3));
    shine.setAttribute('cy', String(pos.cy - 3));
    shine.setAttribute('r', '2.5');
    shine.setAttribute('fill', 'white');
    shine.setAttribute('opacity', '0.5');
    elements.coinsInJar.appendChild(shine);
  }
}

function updateCounters() {
  state.totalAmount = state.todayCount * state.fineAmount;

  elements.total.textContent = currency(state.totalAmount);
  elements.todayCount.textContent = String(state.todayCount);
  elements.weekCount.textContent = String(state.weekCount);
  elements.recordCount.textContent = String(state.recordCount);
  elements.streakBadge.textContent = `${state.todayCount} today`;

  if (state.todayCount === 0) {
    elements.offenses.textContent = 'Clean slate — keep it up!';
    elements.tapHint.textContent = 'Tap the jar to add one offense';
  } else {
    elements.offenses.textContent = `${state.todayCount} offense${state.todayCount === 1 ? '' : 's'}`;
    elements.tapHint.textContent = 'Tap again to add another offense';
  }

  elements.addButton.textContent = `Add offense — ${currency(state.fineAmount)}`;
}

function updatePenalty() {
  const activeCount = state.todayCount;
  elements.mouth.setAttribute('d', getMouthPath(activeCount));

  const pupils = getPupilOffset(activeCount);
  elements.pupilL.setAttribute('cx', String(pupils.lx));
  elements.pupilL.setAttribute('cy', String(pupils.ly));
  elements.pupilR.setAttribute('cx', String(pupils.rx));
  elements.pupilR.setAttribute('cy', String(pupils.ry));

  updateJarFill(activeCount);
  renderCoinsInJar();
}

function renderHistory() {
  elements.historyList.innerHTML = '';

  if (state.recentEvents.length === 0) {
    elements.historyArea.classList.remove('show');
    return;
  }

  elements.historyArea.classList.add('show');
  state.recentEvents.slice(0, 8).forEach((eventIso) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const time = new Date(eventIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const amount = currency(state.fineAmount);

    item.innerHTML = `<span>${time}</span><span>+${amount}</span>`;
    elements.historyList.appendChild(item);
  });
}

function showReaction() {
  const reactionIndex = Math.max(0, Math.min(state.todayCount - 1, reactions.length - 1));
  elements.bubble.textContent = reactions[reactionIndex];
  elements.bubble.classList.add('show');

  window.setTimeout(() => {
    elements.bubble.classList.remove('show');
  }, 1800);
}

function animateJarTap() {
  elements.jarArea.classList.add('wobble');
  elements.total.classList.add('bump');

  elements.coinEl.classList.remove('drop');
  void elements.coinEl.offsetWidth;
  elements.coinEl.classList.add('drop');

  window.setTimeout(() => {
    elements.jarArea.classList.remove('wobble');
    elements.total.classList.remove('bump');
  }, 420);
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildLastSevenDaysTrend(calendarDays) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(Date.now() - (6 - index) * 86400000);
    const dayKey = formatDateKey(day);
    return { day: dayKey, count: Number(calendarDays[dayKey] || 0) };
  });
}

function calculateWeekCountFromTrend() {
  return state.trend.reduce((sum, point) => sum + point.count, 0);
}

function updateRecord() {
  const nextRecord = Math.max(state.recordCount, state.todayCount);
  if (nextRecord !== state.recordCount) {
    state.recordCount = nextRecord;
    saveLocalRecord(nextRecord);
  }
}

async function fetchTodayStats() {
  try {
    const response = await fetch(`/api/todayStats?userId=${encodeURIComponent(state.userId)}`);
    if (!response.ok) {
      throw new Error(`todayStats request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(payload.error?.message || 'Could not load stats.');
    }

    state.todayCount = Number(payload.data.todayCount || 0);
    state.recentEvents = payload.data.recentEvents || [];
    state.trend = payload.data.trend || [];
    state.weekCount = calculateWeekCountFromTrend();
    updateRecord();
    return;
  } catch (_todayStatsError) {
    const response = await fetch(`/api/summary?userId=${encodeURIComponent(state.userId)}&lookbackDays=7`);
    if (!response.ok) {
      throw new Error(`summary request failed: ${response.status}`);
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(payload.error?.message || 'Could not load stats.');
    }

    const calendarDays = payload.data.calendarDays || {};
    state.todayCount = Number(payload.data.todayCount || 0);
    state.recentEvents = [];
    state.trend = buildLastSevenDaysTrend(calendarDays);
    state.weekCount = calculateWeekCountFromTrend();
    updateRecord();
  }
}

async function logSwear() {
  const response = await fetch('/api/logSwear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: state.userId })
  });

  if (!response.ok) {
    throw new Error(`logSwear request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error?.message || 'Could not log swear.');
  }

  return payload.data;
}

function renderAll() {
  updateCounters();
  updatePenalty();
  renderHistory();
}

async function addOffense() {
  if (state.adding) {
    return;
  }

  state.adding = true;
  elements.addButton.disabled = true;
  setStatus('Logging...');

  try {
    await logSwear();
    await fetchTodayStats();
    updateCounters();
    showReaction();
    animateJarTap();
    updatePenalty();
    renderHistory();
    setStatus('Swear logged. Stay accountable.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.adding = false;
    elements.addButton.disabled = false;
  }
}

function resetJarView() {
  state.todayCount = 0;
  state.weekCount = 0;
  state.recentEvents = [];
  state.trend = [];
  renderAll();
  setStatus('Jar visuals reset locally. Server data is unchanged.');
}

function handleFineAmountChange() {
  const raw = window.prompt('Set offense amount in dollars', state.fineAmount.toFixed(2));
  if (raw === null) {
    return;
  }

  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {
    setStatus('Fine amount must be greater than $0.00.', true);
    return;
  }

  state.fineAmount = value;
  localStorage.setItem(STORAGE_KEYS.fineAmount, String(value));
  updateCounters();
  renderHistory();
  setStatus(`Fine amount updated to ${currency(value)}.`);
}

async function init() {
  state.userId = getOrCreateUserId();
  state.fineAmount = loadFineAmount();
  state.recordCount = loadLocalRecord();

  elements.addButton.addEventListener('click', addOffense);
  elements.jarArea.addEventListener('click', addOffense);
  elements.resetButton.addEventListener('click', resetJarView);
  elements.total.addEventListener('click', handleFineAmountChange);

  try {
    await fetchTodayStats();
    renderAll();
    setStatus('Loaded your stats.');
  } catch (_error) {
    state.todayCount = 0;
    state.weekCount = 0;
    state.recentEvents = [];
    state.trend = [];
    renderAll();
    setStatus('Could not load stats. API may be unavailable locally.', true);
  }
}

init();
