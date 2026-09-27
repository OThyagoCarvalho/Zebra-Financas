import { getRecurringAccountsAction, GetRecurringAccountsParams } from "@/actions/finance-actions"
import { RecurringManager } from "@/components/recurring/recurring-manager"

export const dynamic = "force-dynamic"

interface RecurringPageProps {
  searchParams: Promise<{
    month?: string
    year?: string
    page?: string
    payment?: "NO_CARD" | "CARD_ONLY" | "ALL"
    status?: "PENDING" | "COMPLETED" | "ALL"
    type?: "EXPENSE" | "INCOME" | "ALL"
  }>
}

export default async function RecurringPage({ searchParams }: RecurringPageProps) {
  const resolvedParams = await searchParams

  const now = new Date()
  const month = resolvedParams.month ? parseInt(resolvedParams.month, 10) : now.getMonth() + 1
  const year = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear()
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1
  const paymentFilter = resolvedParams.payment || "NO_CARD"
  const statusFilter = resolvedParams.status || "PENDING"
  const typeFilter = resolvedParams.type || "EXPENSE"

  const data = await getRecurringAccountsAction({
    month,
    year,
    page,
    pageSize: 15,
    paymentFilter,
    statusFilter,
    typeFilter,
  })

  return <RecurringManager initialData={data} />
}
