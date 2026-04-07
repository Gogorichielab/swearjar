const state = {
  dailyCount: 0,
  totalCount: 0,
  penaltyPerSwear: 0.5,
  penaltyLimit: 10,
  calendar: [],
};

const elements = {
  logButton: document.getElementById('log-button'),
  dailyCount: document.getElementById('daily-count'),
  totalCount: document.getElementById('total-count'),
  penaltyText: document.getElementById('penalty-text'),
  penaltyBar: document.getElementById('penalty-bar'),
  calendarContainer: document.getElementById('calendar-container'),
};

function updateCounters() {
  elements.dailyCount.textContent = String(state.dailyCount);
  elements.totalCount.textContent = String(state.totalCount);
}

function updatePenalty() {
  const amount = state.totalCount * state.penaltyPerSwear;
  const ratio = Math.min(amount / state.penaltyLimit, 1);
  elements.penaltyText.textContent = `$${amount.toFixed(2)} of $${state.penaltyLimit.toFixed(2)}`;
  elements.penaltyBar.style.width = `${ratio * 100}%`;
}

function renderCalendar() {
  elements.calendarContainer.innerHTML = '';
  state.calendar.forEach((entry) => {
    const cell = document.createElement('div');
    cell.className = `calendar-day ${entry.clean ? 'clean' : 'not-clean'}`;
    cell.textContent = entry.day;
    cell.setAttribute('title', entry.clean ? 'Clean day' : 'Not clean');
    elements.calendarContainer.appendChild(cell);
  });
}

function seedCalendar() {
  const dayCount = 14;
  state.calendar = Array.from({ length: dayCount }, (_, idx) => ({
    day: idx + 1,
    clean: idx % 3 !== 0,
  }));
}

async function postLogSwear() {
  try {
    const response = await fetch('/api/swears/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    state.dailyCount = Number(data.dailyCount ?? state.dailyCount + 1);
    state.totalCount = Number(data.totalCount ?? state.totalCount + 1);
  } catch (error) {
    // Fallback optimistic update for local-only/static deployments.
    state.dailyCount += 1;
    state.totalCount += 1;
  }
}

async function handleLogClick() {
  elements.logButton.disabled = true;
  await postLogSwear();
  updateCounters();
  updatePenalty();
  elements.logButton.disabled = false;
}

function init() {
  seedCalendar();
  updateCounters();
  updatePenalty();
  renderCalendar();
  elements.logButton.addEventListener('click', handleLogClick);
}

init();
