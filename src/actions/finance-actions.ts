"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { parseFinancialMessage } from "@/lib/nlp-parser"
import { getFinancialData } from "@/lib/budget-engine"

export async function setCycleStartDayAction(day: number) {
  const cookieStore = await cookies()
  const validDay = Math.min(28, Math.max(1, Math.round(day || 1)))
  cookieStore.set("zebra_cycle_start_day", String(validDay), {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
  revalidatePath("/")
  revalidatePath("/budgets")
  revalidatePath("/transactions")
  return { success: true, cycleStartDay: validDay }
}

export async function getCycleStartDayAction(): Promise<number> {
  const cookieStore = await cookies()
  const val = cookieStore.get("zebra_cycle_start_day")?.value
  return val ? parseInt(val, 10) : 1
}

export async function getFinancialOverviewAction(year: number, month: number, cutoffDay?: number) {
  const cycleStartDay = await getCycleStartDayAction()
  return await getFinancialData(year, month, cutoffDay, cycleStartDay)
}

export async function getCategoriesAction() {
  return await db.category.findMany({
    orderBy: { name: "asc" },
  })
}

export async function createTransactionAction(formData: {
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
  isRecurring: boolean
  recurrenceRule?: string
  categoryId: string
  dueDate: string // YYYY-MM-DD
  paymentMethod?: string
  status?: string
}) {
  const transaction = await db.transaction.create({
    data: {
      description: formData.description,
      amount: Number(formData.amount),
      type: formData.type,
      isRecurring: formData.isRecurring,
      recurrenceRule: formData.isRecurring ? formData.recurrenceRule || "MONTHLY" : null,
      categoryId: formData.categoryId,
      dueDate: new Date(formData.dueDate),
      paidAt: formData.status === "COMPLETED" ? new Date(formData.dueDate) : null,
      status: formData.status || "COMPLETED",
      paymentMethod: formData.paymentMethod || "PIX",
      source: "MANUAL",
    },
  })

  revalidatePath("/")
  revalidatePath("/transactions")
  revalidatePath("/budgets")
  return { success: true, transaction }
}

export async function updateTransactionAction(
  id: string,
  formData: {
    description: string
    amount: number
    type: "INCOME" | "EXPENSE"
    isRecurring: boolean
    recurrenceRule?: string
    categoryId: string
    dueDate: string // YYYY-MM-DD
    paymentMethod?: string
    status?: string
  }
) {
  const transaction = await db.transaction.update({
    where: { id },
    data: {
      description: formData.description.trim(),
      amount: Number(formData.amount),
      type: formData.type,
      isRecurring: formData.isRecurring,
      recurrenceRule: formData.isRecurring ? formData.recurrenceRule || "MONTHLY" : null,
      categoryId: formData.categoryId,
      dueDate: new Date(formData.dueDate),
      paidAt: formData.status === "COMPLETED" ? new Date(formData.dueDate) : null,
      status: formData.status || "COMPLETED",
      paymentMethod: formData.paymentMethod || "PIX",
    },
    include: {
      category: true,
    },
  })

  revalidatePath("/")
  revalidatePath("/transactions")
  revalidatePath("/budgets")
  return { success: true, transaction }
}

export async function deleteTransactionAction(id: string) {
  await db.transaction.delete({
    where: { id },
  })

  revalidatePath("/")
  revalidatePath("/transactions")
  revalidatePath("/budgets")
  return { success: true }
}

export async function toggleTransactionStatusAction(id: string) {
  const current = await db.transaction.findUnique({
    where: { id },
  })

  if (!current) return { success: false, error: "Not found" }

  const newStatus = current.status === "COMPLETED" ? "PENDING" : "COMPLETED"
  const updated = await db.transaction.update({
    where: { id },
    data: {
      status: newStatus,
      paidAt: newStatus === "COMPLETED" ? new Date() : null,
    },
  })

  revalidatePath("/")
  revalidatePath("/transactions")
  return { success: true, transaction: updated }
}

export async function upsertBudgetPlanAction(
  categoryId: string,
  month: number,
  year: number,
  targetAmount: number
) {
  const plan = await db.budgetPlan.upsert({
    where: {
      categoryId_month_year: {
        categoryId,
        month,
        year,
      },
    },
    update: {
      targetAmount: Number(targetAmount),
    },
    create: {
      categoryId,
      month,
      year,
      targetAmount: Number(targetAmount),
    },
  })

  revalidatePath("/")
  revalidatePath("/budgets")
  return { success: true, plan }
}

export async function createCategoryAction(data: {
  name: string
  type: "EXPENSE" | "INCOME"
  color?: string
  icon?: string
  initialBudget?: number
  month?: number
  year?: number
}) {
  const category = await db.category.create({
    data: {
      name: data.name.trim(),
      type: data.type,
      color: data.color || (data.type === "INCOME" ? "green" : "blue"),
      icon: data.icon || (data.type === "INCOME" ? "TrendingUp" : "Tag"),
    },
  })

  if (data.type === "EXPENSE" && data.initialBudget && data.initialBudget > 0) {
    const now = new Date()
    const month = data.month || now.getMonth() + 1
    const year = data.year || now.getFullYear()

    await db.budgetPlan.create({
      data: {
        categoryId: category.id,
        targetAmount: Number(data.initialBudget),
        month,
        year,
        alertThreshold: 0.8,
      },
    })
  }

  revalidatePath("/")
  revalidatePath("/budgets")
  revalidatePath("/transactions")
  return { success: true, category }
}

export async function copyBudgetPlansFromPreviousMonthAction(
  targetMonth: number,
  targetYear: number
) {
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear

  const prevPlans = await db.budgetPlan.findMany({
    where: {
      month: prevMonth,
      year: prevYear,
    },
  })

  if (prevPlans.length === 0) {
    return {
      success: false,
      message: `Nenhum orçamento encontrado em ${String(prevMonth).padStart(2, "0")}/${prevYear} para copiar.`,
    }
  }

  let copiedCount = 0
  for (const plan of prevPlans) {
    await db.budgetPlan.upsert({
      where: {
        categoryId_month_year: {
          categoryId: plan.categoryId,
          month: targetMonth,
          year: targetYear,
        },
      },
      update: {
        targetAmount: plan.targetAmount,
        alertThreshold: plan.alertThreshold,
      },
      create: {
        categoryId: plan.categoryId,
        month: targetMonth,
        year: targetYear,
        targetAmount: plan.targetAmount,
        alertThreshold: plan.alertThreshold,
      },
    })
    copiedCount++
  }

  revalidatePath("/")
  revalidatePath("/budgets")
  return { success: true, count: copiedCount }
}

export async function deleteCategoryAction(categoryId: string) {
  await db.category.delete({
    where: { id: categoryId },
  })

  revalidatePath("/")
  revalidatePath("/budgets")
  revalidatePath("/transactions")
  return { success: true }
}

export async function processWhatsAppMessageAction(senderPhone: string, messageText: string) {
  const config = await db.whatsAppConfig.findFirst()
  
  // Security check: phone number check if configured
  const expectedPhone = (process.env.AUTHORIZED_PHONE || config?.authorizedPhone || "5511932199076").replace(/\D/g, "")
  const cleanSender = senderPhone.replace(/\D/g, "")
  if (expectedPhone && cleanSender && !cleanSender.includes(expectedPhone) && !expectedPhone.includes(cleanSender)) {
    return {
      success: false,
      error: "Unauthorized phone number",
      replyMessage: "🚫 Número não autorizado para realizar lançamentos neste cofre financeiro.",
    }
  }

  const parsed = await parseFinancialMessage(messageText)

  if (!parsed.success || !parsed.categoryId) {
    await db.whatsAppMessageLog.create({
      data: {
        rawMessage: messageText,
        senderPhone,
        status: "ERROR",
        replyText: parsed.replyMessage,
        errorMessage: "Could not parse amount or category",
      },
    })
    return {
      success: false,
      replyMessage: parsed.replyMessage,
    }
  }

  // Create transaction from WhatsApp message
  const now = new Date()
  const transaction = await db.transaction.create({
    data: {
      description: parsed.description,
      amount: parsed.amount,
      type: parsed.type,
      isRecurring: parsed.isRecurring,
      recurrenceRule: parsed.recurrenceRule || null,
      categoryId: parsed.categoryId,
      dueDate: now,
      paidAt: now,
      status: "COMPLETED",
      paymentMethod: parsed.paymentMethod,
      source: "WHATSAPP",
    },
  })

  // Append current budget status to reply if expense
  let budgetReply = parsed.replyMessage
  if (parsed.type === "EXPENSE") {
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    const plan = await db.budgetPlan.findUnique({
      where: {
        categoryId_month_year: {
          categoryId: parsed.categoryId,
          month: currentMonth,
          year: currentYear,
        },
      },
      include: {
        category: true,
      },
    })

    if (plan && plan.targetAmount > 0) {
      const monthStart = new Date(currentYear, currentMonth - 1, 1)
      const monthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59)
      const expenses = await db.transaction.aggregate({
        where: {
          categoryId: parsed.categoryId,
          type: "EXPENSE",
          dueDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      })

      const totalSpent = expenses._sum.amount || 0
      const remaining = plan.targetAmount - totalSpent
      const pct = Math.round((totalSpent / plan.targetAmount) * 100)
      const daysLeft = monthEnd.getDate() - now.getDate()

      const warningIcon = pct > 100 ? "🚨 *ESTOURADO!*" : pct > 80 ? "⚠️ *Atenção!*" : "📊"

      budgetReply += `\n\n${warningIcon} *Orçamento (${plan.category.name}):*\n` +
        `Gasto: R$ ${totalSpent.toFixed(2)} de R$ ${plan.targetAmount.toFixed(2)} (${pct}%)\n` +
        `Restante: R$ ${remaining.toFixed(2)} para ${daysLeft} dias.`
    }
  }

  await db.whatsAppMessageLog.create({
    data: {
      rawMessage: messageText,
      senderPhone,
      parsedData: JSON.stringify(parsed),
      status: "SUCCESS",
      replyText: budgetReply,
    },
  })

  revalidatePath("/")
  revalidatePath("/transactions")
  revalidatePath("/budgets")
  revalidatePath("/whatsapp")

  return {
    success: true,
    transaction,
    replyMessage: budgetReply,
  }
}

export async function getWhatsAppLogsAction() {
  return await db.whatsAppMessageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
  })
}

export async function getWhatsAppConfigAction() {
  let config = await db.whatsAppConfig.findFirst()
  if (!config) {
    config = await db.whatsAppConfig.create({
      data: {
        id: "default",
        authorizedPhone: "5511999999999",
        provider: "SIMULATOR",
        isActive: true,
      },
    })
  }
  return config
}

export async function updateWhatsAppConfigAction(data: {
  authorizedPhone: string
  provider: string
  isActive: boolean
}) {
  const updated = await db.whatsAppConfig.upsert({
    where: { id: "default" },
    update: {
      authorizedPhone: data.authorizedPhone,
      provider: data.provider,
      isActive: data.isActive,
    },
    create: {
      id: "default",
      authorizedPhone: data.authorizedPhone,
      provider: data.provider,
      isActive: data.isActive,
    },
  })

  revalidatePath("/whatsapp")
  return { success: true, config: updated }
}
