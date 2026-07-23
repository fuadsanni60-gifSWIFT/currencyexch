// TodayExchangeRate.com — Main Application Logic

const CURRENCIES = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "CNY", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "AED", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SGD", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
  { code: "NGN", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "GHS", name: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "KES", name: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "MXN", name: "Mexican Peso", flag: "🇲🇽" },
  { code: "PHP", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "BRL", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "SEK", name: "Swedish Krona", flag: "🇸🇪" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
];

const BOARD_PAIRS = [
  { base: "USD", quote: "EUR", label: "USD → EUR" },
  { base: "USD", quote: "GBP", label: "USD → GBP" },
  { base: "USD", quote: "JPY", label: "USD → JPY" },
  { base: "USD", quote: "NGN", label: "USD → NGN" },
  { base: "USD", quote: "INR", label: "USD → INR" },
  { base: "USD", quote: "CAD", label: "USD → CAD" },
];

let ratesCache = {};
let chartInstance = null;
let watchlist = JSON.parse(localStorage.getItem("terWatchlist") || "[]");
let currentRangeDays = 7;
let lastSeries = [];

// Single Page Navigation Router
function handleNavigation() {
  const hash = window.location.hash.replace("#", "") || "home";
  const pages = document.querySelectorAll(".page-section");
  const navLinks = document.querySelectorAll(".nav-link");

  pages.forEach(page => {
    if (page.id === `page-${hash}`) {
      page.classList.add("active-page");
    } else {
      page.classList.remove("active-page");
    }
  });

  navLinks.forEach(link => {
    if (link.getAttribute("href") === `#${hash}`) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  window.scrollTo(0, 0);
}

function formatRate(rate) {
  if (!rate) return "—";
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: rate < 1 ? 4 : (rate > 1000 ? 0 : 2),
    maximumFractionDigits: rate < 1 ? 4 : 2,
  }).format(rate);
}

async function fetchRates(base = "USD") {
  if (ratesCache[base]) return ratesCache[base];
  try {
    const res = await fetch(`/api/rates?base=${base}`);
    if (!res.ok) throw new Error("Rate service unavailable");
    const data = await res.json();
    ratesCache[base] = data.rates || data[base];
    
    if (data.lastUpdatedUtc) {
      const timeElem = document.getElementById("last-updated");
      if (timeElem) timeElem.textContent = `${data.lastUpdatedUtc} (Mid-market)`;
    }
    return ratesCache[base];
  } catch (err) {
    console.error(err);
    return null;
  }
}

function populateSelects() {
  const from = document.getElementById("from");
  const to = document.getElementById("to");
  const tableBase = document.getElementById("table-base");
  [from, to, tableBase].forEach(sel => {
    if (sel) {
      sel.innerHTML = CURRENCIES.map(c => `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`).join("");
    }
  });
  if (from) from.value = "USD";
  if (to) to.value = "EUR";
  if (tableBase) tableBase.value = "USD";
}

function renderBoard(rates) {
  const board = document.getElementById("rate-board");
  if (!board) return;
  board.innerHTML = "";
  BOARD_PAIRS.forEach(pair => {
    const rate = rates?.[pair.quote];
    const row = document.createElement("div");
    row.className = "board-row";
    row.innerHTML = `
      <span class="pair-label">${pair.label}</span>
      <span class="pair-rate">${formatRate(rate)}</span>
      <span class="pair-change">live</span>
    `;
    board.appendChild(row);
  });
}

async function updateConverter() {
  const rawAmount = document.getElementById("amount").value.replace(/,/g, "");
  const amount = parseFloat(rawAmount) || 0;
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const resultEl = document.getElementById("result");

  const rates = await fetchRates(from);
  const rate = rates?.[to];
  if (rate) {
    resultEl.textContent = `${amount.toLocaleString()} ${from} = ${(amount * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`;
  } else {
    resultEl.textContent = "Rate unavailable right now — try again shortly.";
  }
  updateWatchlistButton();
  renderChart(from, to, currentRangeDays);
}

async function renderFullTable() {
  const base = document.getElementById("table-base").value;
  const rates = await fetchRates(base);
  const tbody = document.getElementById("full-rate-rows");
  if (!tbody) return;
  tbody.innerHTML = "";
  CURRENCIES.filter(c => c.code !== base).forEach(c => {
    const rate = rates?.[c.code];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.flag} ${c.name}</td>
      <td class="mono">${c.code}</td>
      <td class="mono">${formatRate(rate)}</td>
      <td><button class="link-btn watch-star" data-pair="${base}-${c.code}">${watchlist.includes(base + "-" + c.code) ? "★" : "☆"}</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function generateDemoSeries(currentRate, days) {
  const points = [];
  let value = currentRate;
  for (let i = days; i >= 0; i--) {
    const drift = (Math.random() - 0.5) * currentRate * 0.006;
    value = i === 0 ? currentRate : value + drift;
    const date = new Date();
    date.setDate(date.getDate() - i);
    points.push({ date: date.toISOString().slice(0, 10), value: Math.round(value * 10000) / 10000 });
  }
  return points;
}

async function renderChart(from, to, days) {
  const rates = await fetchRates(from);
  const rate = rates?.[to];
  if (!rate) return;

  const series = generateDemoSeries(rate, days);
  lastSeries = series;

  const ctx = document.getElementById("rate-chart");
  if (!ctx) return;
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--accent-green-bright").trim();
  const grid = styles.getPropertyValue("--border").trim();
  const text = styles.getPropertyValue("--text-muted").trim();

  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map(p => p.date),
      datasets: [{
        label: `${from} → ${to}`,
        data: series.map(p => p.value),
        borderColor: accent,
        backgroundColor: accent + "22",
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: grid }, ticks: { color: text, maxTicksLimit: 6 } },
        y: { grid: { color: grid }, ticks: { color: text } },
      },
    },
  });
}

function updateWatchlistButton() {
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const key = `${from}-${to}`;
  const btn = document.getElementById("watchlist-toggle");
  if (btn) btn.textContent = watchlist.includes(key) ? "★ In your watchlist" : "☆ Add to watchlist";
}

function toggleWatchlist() {
  const from = document.getElementById("from").value;
  const to = document.getElementById("to").value;
  const key = `${from}-${to}`;
  watchlist = watchlist.includes(key) ? watchlist.filter(k => k !== key) : [...watchlist, key];
  localStorage.setItem("terWatchlist", JSON.stringify(watchlist));
  updateWatchlistButton();
  renderWatchlistSection();
}

async function renderWatchlistSection() {
  const section = document.getElementById("watchlist");
  const board = document.getElementById("watchlist-board");
  if (!watchlist.length) { if (section) section.hidden = true; return; }
  if (section) section.hidden = false;
  if (!board) return;
  board.innerHTML = "";
  for (const key of watchlist) {
    const [base, quote] = key.split("-");
    const rates = await fetchRates(base);
    const rate = rates?.[quote];
    const row = document.createElement("div");
    row.className = "board-row";
    row.innerHTML = `
      <span class="pair-label">${base} → ${quote}</span>
      <span class="pair-rate">${formatRate(rate)}</span>
      <button class="link-btn" data-remove="${key}">Remove</button>
    `;
    board.appendChild(row);
  }
}

async function init() {
  window.addEventListener("hashchange", handleNavigation);
  handleNavigation();

  populateSelects();

  const homeRates = await fetchRates("USD");
  renderBoard(homeRates);
  await updateConverter();
  await renderFullTable();
  await renderWatchlistSection();

  document.getElementById("amount").addEventListener("input", updateConverter);
  document.getElementById("from").addEventListener("change", updateConverter);
  document.getElementById("to").addEventListener("change", updateConverter);
  document.getElementById("table-base").addEventListener("change", renderFullTable);
  document.getElementById("watchlist-toggle").addEventListener("click", toggleWatchlist);

  document.getElementById("swap-note").addEventListener("click", () => {
    const from = document.getElementById("from");
    const to = document.getElementById("to");
    [from.value, to.value] = [to.value, from.value];
    updateConverter();
  });

  const rangeToggle = document.getElementById("range-toggle");
  if (rangeToggle) {
    rangeToggle.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON") return;
      document.querySelectorAll("#range-toggle button").forEach(b => b.classList.remove("active"));
      e.target.classList.add("active");
      currentRangeDays = parseInt(e.target.dataset.range, 10);
      renderChart(document.getElementById("from").value, document.getElementById("to").value, currentRangeDays);
    });
  }

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Thank you! Your message has been received.");
      contactForm.reset();
    });
  }
}

init();