// src/app/api/portfolio/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentPrice } from "@/lib/prices";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { userId: session.user.id },
    include: { holdings: true },
  });

  if (!portfolio) {
    return NextResponse.json({ holdings: [], totalValue: 0, totalPL: 0 });
  }

  let totalValue = 0;
  let totalPL = 0;

  const holdings = await Promise.all(
    portfolio.holdings.map(async (h) => {
      const price = await getCurrentPrice(h.symbol);
      if (!price) {
        return { ...h, currentPrice: null, value: 0, pl: 0, plPercent: 0 };
      }

      const value = price * h.quantity;
      const cost = h.avgBuyPrice * h.quantity;
      const pl = value - cost;
      const plPercent = ((price - h.avgBuyPrice) / h.avgBuyPrice) * 100;

      totalValue += value;
      totalPL += pl;

      return {
        ...h,
        currentPrice: price,
        value,
        pl,
        plPercent,
      };
    })
  );

  return NextResponse.json({ holdings, totalValue, totalPL });
}
