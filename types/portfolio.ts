export type Holding = {
    symbol: string;        // e.g. "TCS.NS"
    shares: number;        // quantity owned
    avgBuyPrice: number;   // average purchase price
  };
  
  export type PricedHolding = Holding & {
    currentPrice: number | null; // from API
    currentValue: number;
    costBasis: number;
    gainAbs: number;             // ₹ gain/loss
    gainPct: number;             // % gain/loss
  };
  
  export type Portfolio = {
    name: string;
    holdings: Holding[];
  };
  
  export type SortKey = "gainPct" | "gainAbs" | "currentValue" | "symbol";
  export type SortDir = "asc" | "desc";
  