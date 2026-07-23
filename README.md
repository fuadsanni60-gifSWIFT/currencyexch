# TodayExchangeRate.com 🌍💵

A fast, lightweight currency exchange rate platform and travel insight hub built with standard Web APIs and deployed on **Cloudflare Pages**.

Managed by **Jose J Mils** (USA).

---

## 🚀 Features

* **Live Mid-Market Rates:** Fetches real-time exchange rates for over 160+ currencies every 15 minutes via ExchangeRate-API.
* **Currency Converter & Watchlist:** Interactive converter with interactive historical chart trends (Chart.js) and local storage watchlist.
* **Vacation Expo:** Curated video content from global travel creators with travel financial tips.
* **Insights & Real-Time News:** FX market updates and global travel economics formatted cleanly without personal attribution.
* **Single-Page Navigation:** Fast, seamless tab switching between Home, Expo, Insights, About, and Contact pages without full page reloads.

---

## 📁 Project Structure

```text
todayexchangerate/
├── functions/
│   └── api/
│       └── rates.js      # Cloudflare Pages Function (Backend Proxy)
├── index.html            # Main HTML structure with SPA routing
├── styles.css            # Responsive dark-theme design
├── script.js             # Client-side routing, Chart.js logic, and API calls
├── wrangler.toml         # Cloudflare Pages configuration
└── README.md             # Project documentation