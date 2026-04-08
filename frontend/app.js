// Swearjar frontend: vanilla JS state + API integration for Azure Static Web Apps.
const STORAGE_KEYS = {
  userId: 'swearjar:userId',
  fineAmount: 'swearjar:fineAmount'
};

const state = {
  userId: '',
  fineAmount: 1,
  todayCount: 0,
  todayAmount: 0,
  recentEvents: [],
  trend: []
};

const elements = {
  todayCount: document.getElementById('today-count'),
  todayAmount: document.getElementById('today-amount'),
  logButton: document.getElementById('log-button'),
  statusMessage: document.getElementById('status-message'),
  fineAmount: document.getElementById('fine-amount'),
  recentActivity: document.getElementById('recent-activity'),
  trendBars: document.getElementById('trend-bars')
};

function getOrCreateUserId() {
  const existing = localStorage.getItem(STORAGE_KEYS.userId);
  if (existing) {
    return existing;
  }

  // Persist a stable anonymous id for this browser/device.
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

function currency(value) {
  return `$${value.toFixed(2)}`;
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? 'var(--danger)' : 'var(--muted)';
}

function updateStatsUI() {
  state.todayAmount = state.todayCount * state.fineAmount;
  elements.todayCount.textContent = String(state.todayCount);
  elements.todayAmount.textContent = currency(state.todayAmount);
}

function renderRecentActivity() {
  elements.recentActivity.innerHTML = '';

  if (state.recentEvents.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No swears logged today.';
    elements.recentActivity.appendChild(empty);
    return;
  }

  state.recentEvents.forEach((eventIso) => {
    const li = document.createElement('li');
    const time = new Date(eventIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    li.textContent = `Logged at ${time}`;
    elements.recentActivity.appendChild(li);
  });
}

function formatShortDayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString([], { weekday: 'short' });
}

function renderTrend() {
  elements.trendBars.innerHTML = '';
  const maxCount = Math.max(1, ...state.trend.map((point) => point.count));

  state.trend.forEach((point) => {
    const bar = document.createElement('div');
    bar.className = 'trend-bar';
    bar.style.height = `${Math.max(8, (point.count / maxCount) * 100)}px`;
    bar.setAttribute('title', `${point.day}: ${point.count}`);

    const label = document.createElement('span');
    label.textContent = formatShortDayLabel(point.day);
    bar.appendChild(label);
    elements.trendBars.appendChild(bar);
  });
}

async function fetchTodayStats() {
  const response = await fetch(`/api/todayStats?userId=${encodeURIComponent(state.userId)}`);
  if (!response.ok) {
    throw new Error(`todayStats request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(payload.error?.message || 'Could not load stats.');
  }

  state.todayCount = payload.data.todayCount;
  state.recentEvents = payload.data.recentEvents;
  state.trend = payload.data.trend;

  updateStatsUI();
  renderRecentActivity();
  renderTrend();
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

async function handleLogSwear() {
  elements.logButton.disabled = true;
  setStatus('Logging...');

  try {
    await logSwear();
    await fetchTodayStats();
    setStatus('Swear logged. Stay accountable.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    elements.logButton.disabled = false;
  }
}

function handleFineAmountChange() {
  const value = Number.parseFloat(elements.fineAmount.value);
  if (!Number.isFinite(value) || value <= 0) {
    elements.fineAmount.value = state.fineAmount.toFixed(2);
    return;
  }

  state.fineAmount = value;
  localStorage.setItem(STORAGE_KEYS.fineAmount, String(value));
  updateStatsUI();
}

async function init() {
  state.userId = getOrCreateUserId();
  state.fineAmount = loadFineAmount();
  elements.fineAmount.value = state.fineAmount.toFixed(2);

  elements.logButton.addEventListener('click', handleLogSwear);
  elements.fineAmount.addEventListener('change', handleFineAmountChange);

  try {
    await fetchTodayStats();
    setStatus('Loaded your stats.');
  } catch (_error) {
    setStatus('Could not load stats. API may be unavailable locally.', true);
    updateStatsUI();
    renderRecentActivity();
    state.trend = Array.from({ length: 7 }, (_, index) => ({
      day: new Date(Date.now() - (6 - index) * 86400000).toISOString().slice(0, 10),
      count: 0
    }));
    renderTrend();
  }
}

init();
