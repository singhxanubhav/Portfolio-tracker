import PortfolioTable from "@/components/PortfolioTable";
import Header from "./components/Header";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/"); // ✅ agar login nahi hai to home pe bhej do
  }

  return (
    <div className="p-6">
      <Header email={session.user?.name} />
      <PortfolioTable />
    </div>
  );
}
