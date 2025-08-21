"use client";

import React, { useEffect, useMemo, useState } from "react";

interface Holding {
  symbol: string;        // e.g. TCS.NS
  shares: number;        // quantity
  avgBuyPrice: number;   // weighted average buy price (₹)
}

interface PricedHolding extends Holding {
  currentPrice: number | null;
  currentValue: number | null;
  costBasis: number;
  gainAbs: number | null;
  gainPct: number | null;
}

type SortKey = "symbol" | "currentValue" | "gainAbs" | "gainPct";
type SortDir = "asc" | "desc";

export default function PortfolioTable() {
  // ---- State ----
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("gainPct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Add form
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newAvg, setNewAvg] = useState("");

  // ---- Load from DB (fallback to localStorage if 401/failed) ----
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/holdings", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const rows: { stock: string; quantity: number; avgPrice: number }[] = await res.json();
        const mapped: Holding[] = rows.map(r => ({
          symbol: r.stock,
          shares: r.quantity,
          avgBuyPrice: r.avgPrice,
        }));
        setHoldings(mapped);
        localStorage.setItem("mvp_holdings", JSON.stringify(mapped)); // keep local in sync
      } catch {
        // not signed-in or API error → use localStorage fallback
        const saved = localStorage.getItem("mvp_holdings");
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Holding[];
            if (Array.isArray(parsed)) setHoldings(parsed);
          } catch {}
        }
      }
    })();
  }, []);

  // keep localStorage updated (useful offline / fallback)
  useEffect(() => {
    localStorage.setItem("mvp_holdings", JSON.stringify(holdings));
  }, [holdings]);

  // ---- Fetch live prices from our API ----
  async function fetchPrices() {
    const symbols = holdings.map(h => h.symbol).join(",");
    if (!symbols) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/prices?symbols=${encodeURIComponent(symbols)}`);
      const json = (await res.json()) as {
        prices: { symbol: string; price?: number; error?: boolean }[];
      };

      const map: Record<string, number | null> = {};
      for (const item of json.prices) {
        map[item.symbol] = typeof item.price === "number" && !item.error ? item.price : null;
      }
      setPriceMap(map);
    } catch (e) {
      console.error("Price fetch failed:", e);
      const map: Record<string, number | null> = {};
      for (const h of holdings) map[h.symbol] = null;
      setPriceMap(map);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.map(h => h.symbol).join(",")]);

  // ---- Derive priced rows ----
  const rows: PricedHolding[] = useMemo(() => {
    return holdings.map(h => {
      const price = priceMap[h.symbol] ?? null;
      const costBasis = h.shares * h.avgBuyPrice;

      if (price === null) {
        return { ...h, currentPrice: null, currentValue: null, costBasis, gainAbs: null, gainPct: null };
      }

      const currentValue = price * h.shares;
      const gainAbs = currentValue - costBasis;
      const gainPct = costBasis > 0 ? (gainAbs / costBasis) * 100 : null;

      return { ...h, currentPrice: price, currentValue, costBasis, gainAbs, gainPct };
    });
  }, [holdings, priceMap]);

  // ---- Sorting ----
  const sorted: PricedHolding[] = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: number | string | null;
      let bv: number | string | null;

      switch (sortBy) {
        case "symbol": av = a.symbol.toUpperCase(); bv = b.symbol.toUpperCase(); break;
        case "currentValue": av = a.currentValue ?? -Infinity; bv = b.currentValue ?? -Infinity; break;
        case "gainAbs": av = a.gainAbs ?? -Infinity; bv = b.gainAbs ?? -Infinity; break;
        default: av = a.gainPct ?? -Infinity; bv = b.gainPct ?? -Infinity; break;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  // ---- Totals ----
  const totals = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    for (const r of rows) {
      totalCost += r.costBasis;
      if (typeof r.currentValue === "number") totalValue += r.currentValue;
    }
    const totalGainAbs = totalValue - totalCost;
    const totalGainPct = totalCost > 0 ? (totalGainAbs / totalCost) * 100 : 0;
    return { totalValue, totalCost, totalGainAbs, totalGainPct };
  }, [rows]);

  // ---- Actions ----
  async function addHolding() {
    const raw = newSymbol.trim().toUpperCase();
    if (!raw) return;

    const sym = raw.endsWith(".NS") ? raw : `${raw}.NS`;
    const qty = parseFloat(newShares);
    const avg = parseFloat(newAvg);

    if (!isFinite(qty) || qty <= 0 || !isFinite(avg) || avg <= 0) {
      alert("Enter valid Shares and Avg Buy Price");
      return;
    }
    if (holdings.some(h => h.symbol === sym)) {
      alert("This symbol already exists in your portfolio.");
      return;
    }

    // 1) Optimistically update UI
    const optimistic: Holding = { symbol: sym, shares: qty, avgBuyPrice: avg };
    setHoldings(hs => [...hs, optimistic]);

    // 2) Save to DB (your API expects purchasePrice)
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: sym,
          shares: qty,
          purchasePrice: avg,
        }),
      });

      if (!res.ok) {
        // rollback if you want (optional)
        console.error("DB save failed:", await res.text());
      } else {
        // optional: align with DB canonical row (in case backend modifies/normalizes)
        const saved = await res.json(); // { id, stock, quantity, avgPrice, userId }
        setHoldings(hs =>
          hs.map(h =>
            h.symbol === sym ? { symbol: saved.stock, shares: saved.quantity, avgBuyPrice: saved.avgPrice } : h
          )
        );
      }
    } catch (e) {
      console.error("Failed to save holding in DB:", e);
    }

    setNewSymbol(""); setNewShares(""); setNewAvg("");
  }

  function removeHolding(symbol: string) {
    setHoldings(hs => hs.filter(h => h.symbol !== symbol));
    // (optional) TODO: add DELETE /api/holdings?symbol=... on backend & call here
  }

  function buyMore(symbol: string, qty: number = 1) {
    const live = priceMap[symbol];
    if (typeof live !== "number") {
      alert("Live price unavailable for this symbol.");
      return;
    }
    setHoldings(hs =>
      hs.map(h => {
        if (h.symbol !== symbol) return h;
        const newShares = h.shares + qty;
        const newAvg = (h.avgBuyPrice * h.shares + live * qty) / newShares;
        return { ...h, shares: newShares, avgBuyPrice: newAvg };
      })
    );
    // (optional) POST a "BUY" transaction route and recompute avg on server
  }

  // ---- UI ----
  return (
    <div className="p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Total Value</p>
          <p className="text-lg font-bold">₹{totals.totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-gray-500">Invested</p>
          <p className="text-lg font-bold">₹{totals.totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Overall P/L</p>
              <p className={`text-lg font-bold ${totals.totalGainAbs >= 0 ? "text-green-600" : "text-red-600"}`}>
                ₹{totals.totalGainAbs.toFixed(2)} ({totals.totalGainPct.toFixed(2)}%)
              </p>
            </div>
            <span className="text-xs text-gray-500">{loading ? "Refreshing…" : "Live"}</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Sort by</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} className="border rounded px-2 py-1 text-sm">
            <option value="gainPct">Gain (%)</option>
            <option value="gainAbs">Gain (₹)</option>
            <option value="currentValue">Current Value</option>
            <option value="symbol">Symbol</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Direction</label>
          <select value={sortDir} onChange={e => setSortDir(e.target.value as SortDir)} className="border rounded px-2 py-1 text-sm">
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
          </select>
        </div>

        <div className="ml-auto flex gap-2 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Symbol</label>
            <input
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value.toUpperCase())}
              className="border rounded px-2 py-1 text-sm w-40"
              placeholder="e.g. HDFCBANK"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Shares</label>
            <input type="number" value={newShares} onChange={e => setNewShares(e.target.value)} className="border rounded px-2 py-1 text-sm w-28" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Avg Buy ₹</label>
            <input type="number" value={newAvg} onChange={e => setNewAvg(e.target.value)} className="border rounded px-2 py-1 text-sm w-32" />
          </div>
          <button onClick={addHolding} className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
            Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left">Symbol</th>
              <th className="p-3 text-right">Shares</th>
              <th className="p-3 text-right">Avg Buy (₹)</th>
              <th className="p-3 text-right">Price (₹)</th>
              <th className="p-3 text-right">Value (₹)</th>
              <th className="p-3 text-right">Cost (₹)</th>
              <th className="p-3 text-right">P/L (₹)</th>
              <th className="p-3 text-right">P/L (%)</th>
              <th className="p-3 text-center">Buy More</th>
              <th className="p-3 text-center">Remove</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((r, i) => {
              const plClass = (r.gainAbs ?? 0) >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
              return (
                <tr key={r.symbol} className={i % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}>
                  <td className="p-3 font-medium">{r.symbol}</td>
                  <td className="p-3 text-right">{r.shares}</td>
                  <td className="p-3 text-right">₹{r.avgBuyPrice.toFixed(2)}</td>
                  <td className="p-3 text-right">{typeof r.currentPrice === "number" ? `₹${r.currentPrice.toFixed(2)}` : "—"}</td>
                  <td className="p-3 text-right">{typeof r.currentValue === "number" ? `₹${r.currentValue.toFixed(2)}` : "—"}</td>
                  <td className="p-3 text-right">₹{r.costBasis.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    {typeof r.gainAbs === "number" ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${plClass}`}>₹{r.gainAbs.toFixed(2)}</span>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-right">
                    {typeof r.gainPct === "number" ? (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${plClass}`}>{r.gainPct.toFixed(2)}%</span>
                    ) : "—"}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => buyMore(r.symbol, 1)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 disabled:opacity-50"
                      disabled={typeof r.currentPrice !== "number"}
                      title={typeof r.currentPrice !== "number" ? "Live price unavailable" : "Buy +1 @ market"}
                    >
                      +1
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => removeHolding(r.symbol)} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">
                      X
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={10}>
                  No holdings yet. Add from the top-right.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="p-3 font-semibold" colSpan={4}>Totals</td>
              <td className="p-3 font-semibold text-right">₹{totals.totalValue.toFixed(2)}</td>
              <td className="p-3 font-semibold text-right">₹{totals.totalCost.toFixed(2)}</td>
              <td className="p-3 font-semibold text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${totals.totalGainAbs >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  ₹{totals.totalGainAbs.toFixed(2)}
                </span>
              </td>
              <td className="p-3 font-semibold text-right">
                <span className={`px-2 py-1 rounded text-xs font-medium ${totals.totalGainAbs >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {totals.totalGainPct.toFixed(2)}%
                </span>
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
