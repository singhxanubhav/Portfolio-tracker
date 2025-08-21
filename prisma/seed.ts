import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo User",
    },
  });

  // Demo portfolio
  const portfolio = await prisma.portfolio.upsert({
    where: { id: "demo-portfolio" }, // force id for repeatable seeding
    update: {},
    create: {
      id: "demo-portfolio",
      name: "My Demo Portfolio",
      userId: user.id,
    },
  });

  // Add holdings
  await prisma.holding.deleteMany({ where: { portfolioId: portfolio.id } });

  const holdings = await prisma.holding.createMany({
    data: [
      {
        symbol: "TCS.NS",
        quantity: 10,
        avgBuyPrice: 3300,
        portfolioId: portfolio.id,
      },
      {
        symbol: "RELIANCE.NS",
        quantity: 5,
        avgBuyPrice: 2450,
        portfolioId: portfolio.id,
      },
      {
        symbol: "INFY.NS",
        quantity: 8,
        avgBuyPrice: 1450,
        portfolioId: portfolio.id,
      },
    ],
  });

  console.log("✅ Seeded:", { user, portfolio, holdings });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
