import { getFinancialData } from "@/lib/budget-engine"
import { db } from "@/lib/db"
import { DashboardView } from "@/components/dashboard/dashboard-view"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const currentDay = now.getDate()

  const summary = await getFinancialData(currentYear, currentMonth, currentDay)

  // Fetch all transactions for the month for charting
  const startOfMonth = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0)
  const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59)

  const allTransactions = await db.transaction.findMany({
    where: {
      dueDate: {
        gte: startOfMonth,
        lte: endOfMonth,
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
