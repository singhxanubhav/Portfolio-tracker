// src/lib/prices.ts
export async function getYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) throw new Error("Yahoo fetch failed");

    const data = await res.json();
    return data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch (err) {
    console.error("Yahoo price error:", err);
    return null;
  }
}

export async function getAlphaVantagePrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHAVANTAGE_API_KEY}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) throw new Error("AlphaVantage fetch failed");

    const data = await res.json();
    return parseFloat(data["Global Quote"]?.["05. price"]) || null;
  } catch (err) {
    console.error("AlphaVantage price error:", err);
    return null;
  }
}

// Master function
export async function getCurrentPrice(symbol: string): Promise<number | null> {
  let price = await getYahooPrice(symbol);
  if (price) return price;

  console.log("Fallback → AlphaVantage");
  return await getAlphaVantagePrice(symbol);
}
