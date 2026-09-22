import { getFinancialData, getCycleRange } from "@/lib/budget-engine"
import { db } from "@/lib/db"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const cookieStore = await cookies()
  const cycleStartDay = parseInt(cookieStore.get("zebra_cycle_start_day")?.value || "1", 10)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()

  const summary = await getFinancialData(currentYear, currentMonth, currentDay, cycleStartDay)

  // Fetch transactions for the active financial cycle
  const { startDate, endDate } = getCycleRange(currentYear, currentMonth, cycleStartDay)

  const allTransactions = await db.transaction.findMany({
    where: {
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      category: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  })

  return (
    <DashboardView
      initialData={summary}
      allTransactions={allTransactions}
    />
  )
}
