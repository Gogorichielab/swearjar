const CONFIG = {
  penaltyPerSwear: 1,
  monthlyTarget: 100,
  endpoints: {
    log: "/api/logSwear",
    summary: "/api/summary",
  },
};

const SELECTORS = {
  dailyCount: "#daily-count",
  totalCount: "#total-count",
  monetaryTotal: "#monetary-total",
  progressBarFill: "#progress-bar-fill",
  progressBarText: "#progress-bar-text",
  calendarContainer: "#calendar-grid",
  errorMessage: "#api-error",
  logButton: "#log-swear-btn",
};

const state = {
  dailyCount: 0,
  totalCount: 0,
  perDay: {},
};

function getEl(selector) {
  return document.querySelector(selector);
}

function showError(message) {
  const errorEl = getEl(SELECTORS.errorMessage);
  if (!errorEl) return;

  errorEl.textContent = message;
  errorEl.classList.add("is-visible");
  errorEl.setAttribute("role", "alert");
}

function clearError() {
  const errorEl = getEl(SELECTORS.errorMessage);
  if (!errorEl) return;

  errorEl.textContent = "";
  errorEl.classList.remove("is-visible");
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function updateCountsUI() {
  const dailyCountEl = getEl(SELECTORS.dailyCount);
  const totalCountEl = getEl(SELECTORS.totalCount);
  const monetaryTotalEl = getEl(SELECTORS.monetaryTotal);
  const progressBarFillEl = getEl(SELECTORS.progressBarFill);
  const progressBarTextEl = getEl(SELECTORS.progressBarText);

  if (dailyCountEl) dailyCountEl.textContent = String(state.dailyCount);
  if (totalCountEl) totalCountEl.textContent = String(state.totalCount);

  const totalPenalty = state.totalCount * CONFIG.penaltyPerSwear;
  if (monetaryTotalEl) monetaryTotalEl.textContent = formatCurrency(totalPenalty);

  const progressPercent = Math.min((totalPenalty / CONFIG.monthlyTarget) * 100, 100);
  if (progressBarFillEl) progressBarFillEl.style.width = `${progressPercent}%`;
  if (progressBarTextEl) {
    progressBarTextEl.textContent = `${formatCurrency(totalPenalty)} of ${formatCurrency(CONFIG.monthlyTarget)}`;
  }
}

function getMonthMeta(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return { year, month, daysInMonth };
}

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function renderCalendar(date = new Date()) {
  const calendarEl = getEl(SELECTORS.calendarContainer);
  if (!calendarEl) return;

  const { year, month, daysInMonth } = getMonthMeta(date);
  calendarEl.innerHTML = "";

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = toDateKey(year, month, day);
    const count = Number(state.perDay[key] || 0);

    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-day";
    cell.dataset.date = key;
    cell.dataset.count = String(count);

    if (count === 0) {
      cell.classList.add("is-clean");
    } else {
      cell.classList.add("is-not-clean");
    }

    const dateSpan = document.createElement("span");
    dateSpan.className = "calendar-day__date";
    dateSpan.textContent = String(day);

    const countSpan = document.createElement("span");
    countSpan.className = "calendar-day__count";
    countSpan.textContent = String(count);

    cell.appendChild(dateSpan);
    cell.appendChild(countSpan);

    calendarEl.appendChild(cell);
  }
}

async function logSwear() {
  clearError();

  try {
    const response = await fetch(CONFIG.endpoints.log, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        occurredAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to log swear (${response.status})`);
    }

    const today = new Date();
    const key = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

    state.dailyCount += 1;
    state.totalCount += 1;
    state.perDay[key] = Number(state.perDay[key] || 0) + 1;

    updateCountsUI();
    renderCalendar(today);
  } catch (error) {
    showError("Could not record swear. Please try again.");
    console.error(error);
  }
}

async function loadSummary() {
  clearError();

  try {
    const response = await fetch(CONFIG.endpoints.summary, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load summary (${response.status})`);
    }

    const payload = await response.json();

    state.dailyCount = Number(payload.dailyCount || 0);
    state.totalCount = Number(payload.totalCount || 0);
    state.perDay = payload.perDay && typeof payload.perDay === "object" ? payload.perDay : {};

    updateCountsUI();
    renderCalendar(new Date());
  } catch (error) {
    showError("Could not load summary. Showing cached values.");
    console.error(error);
  }
}

function init() {
  const logButton = getEl(SELECTORS.logButton);
  if (logButton) {
    logButton.addEventListener("click", logSwear);
  }

  loadSummary();
}

document.addEventListener("DOMContentLoaded", init);
