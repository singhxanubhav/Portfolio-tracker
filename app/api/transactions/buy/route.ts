// src/app/api/transactions/buy/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { symbol, quantity, price } = body;

  if (!symbol || !quantity || !price) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const portfolio = await prisma.portfolio.findFirst({
    where: { userId: session.user.id },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  }

  let holding = await prisma.holding.findFirst({
    where: { portfolioId: portfolio.id, symbol },
  });

  if (holding) {
    // Update average buy price & quantity
    const totalCost = holding.avgBuyPrice * holding.quantity + price * quantity;
    const newQty = holding.quantity + quantity;
    const newAvg = totalCost / newQty;

    holding = await prisma.holding.update({
      where: { id: holding.id },
      data: { quantity: newQty, avgBuyPrice: newAvg },
    });
  } else {
    holding = await prisma.holding.create({
      data: {
        symbol,
        quantity,
        avgBuyPrice: price,
        portfolioId: portfolio.id,
      },
    });
  }

  await prisma.transaction.create({
    data: {
      type: "BUY",
      symbol,
      quantity,
      price,
      holdingId: holding.id,
    },
  });

  return NextResponse.json({ success: true, holding });
}
