import { getCardInvoicesAction } from "@/actions/finance-actions"
import { CardsView } from "@/components/cards/cards-view"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

interface CardsPageProps {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const resolvedParams = await searchParams
  const now = new Date()
  const currentActualYear = now.getFullYear()
  const currentActualMonth = now.getMonth() + 1

  const month = resolvedParams.month
    ? Math.min(12, Math.max(1, parseInt(resolvedParams.month, 10)))
    : currentActualMonth
  const year = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : currentActualYear

  const data = await getCardInvoicesAction(year, month)

  return (
    <CardsView
      year={data.year}
      month={data.month}
      cycleLabel={data.cycleLabel}
      totalDaysInCycle={data.totalDaysInCycle}
      cycleStartDay={data.cycleStartDay}
      grandTotal={data.grandTotal}
      grandPaid={data.grandPaid}
      grandPending={data.grandPending}
      cards={data.cards}
      projections={data.projections}
    />
  )
}
