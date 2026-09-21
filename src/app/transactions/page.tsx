import { db } from "@/lib/db"
import { TransactionsManager } from "@/components/transactions/transactions-manager"

export const dynamic = "force-dynamic"

export default async function TransactionsPage() {
  const transactions = await db.transaction.findMany({
    include: {
      category: true,
    },
    orderBy: {
      dueDate: "desc",
    },
  })

  return <TransactionsManager initialTransactions={transactions} />
}
