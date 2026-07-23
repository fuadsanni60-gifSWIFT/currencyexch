// Cloudflare Pages Function proxy for ExchangeRate-API

export async function onRequest(context) {
  // Access environment variable bound in Cloudflare Dashboard
  const apiKey = context.env.EXCHANGE_RATE_API_KEY;
  
  // Parse query parameters
  const urlParams = new URL(context.request.url).searchParams;
  const base = urlParams.get("base") || "USD";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: missing API key" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.result !== "success") {
      return new Response(
        JSON.stringify({ error: "Upstream rate provider error" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const payload = {
      rates: data.conversion_rates,
      lastUpdatedUtc: data.time_last_update_utc || new Date().toUTCString(),
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300", // Cache at Cloudflare edge for 5 mins
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch rates" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
