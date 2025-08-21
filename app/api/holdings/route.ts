import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get all holdings of logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const holdings = await prisma.holding.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(holdings);
}

// Add a new holding
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log("📥 Incoming body =>", body);

    const { symbol, shares, purchasePrice } = body;

    if (!symbol || !shares || !purchasePrice) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const newHolding = await prisma.holding.create({
      data: {
        stock: symbol,
        quantity: shares,
        avgPrice: purchasePrice,
        userId: session.user.id, // ✅ link to logged-in user
      },
    });

    console.log("✅ Inserted Holding =>", newHolding);

    return NextResponse.json(newHolding);
  } catch (err: any) {
    console.error("❌ Error inserting holding:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
