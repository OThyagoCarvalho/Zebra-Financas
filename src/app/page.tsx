import { getFinancialData } from "@/lib/budget-engine"
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

  // Re-use active cycle transactions already fetched and cached by getFinancialData, sorted ascending for charts
  const allTransactions = (summary.allCycleTransactions || [])
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return (
    <DashboardView
      initialData={summary}
      allTransactions={allTransactions}
    />
  )
}
