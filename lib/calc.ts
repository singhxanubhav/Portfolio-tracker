import { Holding, PricedHolding } from "@/types/portfolio";

export function priceMapFromApi(apiData: any): Record<string, number> {
  // expects { prices: [{ symbol, price, ...}, ...] }
  const map: Record<string, number> = {};
  if (apiData && Array.isArray(apiData.prices)) {
    for (const r of apiData.prices) {
      if (r && typeof r.symbol === "string" && typeof r.price === "number") {
        map[r.symbol] = r.price;
      }
    }
  }
  return map;
}

export function enrichHoldings(
  holdings: Holding[],
  prices: Record<string, number>
): PricedHolding[] {
  return holdings.map((h) => {
    const price = prices[h.symbol] ?? null;
    const currentValue = price ? price * h.shares : 0;
    const costBasis = h.avgBuyPrice * h.shares;
    const gainAbs = currentValue - costBasis;
    const gainPct = costBasis > 0 ? (gainAbs / costBasis) * 100 : 0;

    return {
      ...h,
      currentPrice: price,
      currentValue,
      costBasis,
      gainAbs,
      gainPct,
    };
  });
}

export function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + f(x), 0);
}

export function overallPerformance(rows: PricedHolding[]) {
  const totalValue = sum(rows, (r) => r.currentValue);
  const totalCost = sum(rows, (r) => r.costBasis);
  const totalGainAbs = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGainAbs / totalCost) * 100 : 0;
  return { totalValue, totalCost, totalGainAbs, totalGainPct };
}

export function buyMore(old: Holding, buyQty: number, buyPrice: number): Holding {
  const newQty = old.shares + buyQty;
  if (newQty <= 0) {
    return { ...old, shares: 0 }; // defensive; no negative qty
  }
  const newAvg =
    (old.avgBuyPrice * old.shares + buyPrice * buyQty) / newQty;
  return { ...old, shares: newQty, avgBuyPrice: Number(newAvg.toFixed(4)) };
}
