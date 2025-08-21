import { NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols")?.split(",");

  if (!symbols || symbols.length === 0) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  try {
    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const quote = await yahooFinance.quote(symbol);
          return {
            symbol,
            price: quote.regularMarketPrice,
            prevClose: quote.regularMarketPreviousClose,
            changePercent: quote.regularMarketChangePercent?.toFixed(2),
          };
        } catch (err) {
          console.error("Error fetching quote for", symbol, err);
          return { symbol, error: true };
        }
      })
    );

    return NextResponse.json({ prices });
  } catch (err) {
    console.error("Yahoo API error", err);
    return NextResponse.json({ error: "Yahoo API error" }, { status: 500 });
  }
}
