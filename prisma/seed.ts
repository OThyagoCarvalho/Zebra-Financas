import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Clear existing
  await prisma.transaction.deleteMany()
  await prisma.budgetPlan.deleteMany()
  await prisma.category.deleteMany()
  await prisma.whatsAppConfig.deleteMany()

  // Default Categories
  const categories = [
    // Expenses
    { name: "Alimentação", type: "EXPENSE", icon: "Utensils", color: "red", defaultBudget: 2000.0 },
    { name: "Moradia", type: "EXPENSE", icon: "Home", color: "red", defaultBudget: 2400.0 },
    { name: "Transporte", type: "EXPENSE", icon: "Car", color: "yellow", defaultBudget: 650.0 },
    { name: "Lazer & Entretenimento", type: "EXPENSE", icon: "Film", color: "blue", defaultBudget: 600.0 },
    { name: "Saúde & Farmácia", type: "EXPENSE", icon: "HeartPulse", color: "red", defaultBudget: 450.0 },
    { name: "Assinaturas & Serviços", type: "EXPENSE", icon: "CreditCard", color: "blue", defaultBudget: 220.0 },
    // Incomes
    { name: "Salário Mensal", type: "INCOME", icon: "Briefcase", color: "green" },
    { name: "Projetos & Freelance", type: "INCOME", icon: "Laptop", color: "green" },
    { name: "Investimentos & Dividendos", type: "INCOME", icon: "TrendingUp", color: "green" },
    { name: "Receitas Extras", type: "INCOME", icon: "PlusCircle", color: "green" },
  ]

  const createdCategories: Record<string, string> = {}
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  for (const cat of categories) {
    const record = await prisma.category.create({
      data: {
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
      },
    })
    createdCategories[cat.name] = record.id

    // Create budget plan if expense category has a default budget
    if (cat.defaultBudget) {
      await prisma.budgetPlan.create({
        data: {
          categoryId: record.id,
          targetAmount: cat.defaultBudget,
          month: currentMonth,
          year: currentYear,
          alertThreshold: 0.8,
        },
      })
    }
  }

  // Sample Incomes (Recurring and One-off)
  await prisma.transaction.create({
    data: {
      description: "Salário Mensal Corporativo",
      amount: 8500.0,
      type: "INCOME",
      isRecurring: true,
      recurrenceRule: "MONTHLY",
      dueDate: new Date(currentYear, currentMonth - 1, 5),
      paidAt: new Date(currentYear, currentMonth - 1, 5),
      status: "COMPLETED",
      paymentMethod: "PIX",
      source: "MANUAL",
      categoryId: createdCategories["Salário Mensal"],
    },
  })

  await prisma.transaction.create({
    data: {
      description: "Consultoria Web Freelance",
      amount: 2200.0,
      type: "INCOME",
      isRecurring: false,
      dueDate: new Date(currentYear, currentMonth - 1, 14),
      paidAt: new Date(currentYear, currentMonth - 1, 14),
      status: "COMPLETED",
      paymentMethod: "PIX",
      source: "MANUAL",
      categoryId: createdCategories["Projetos & Freelance"],
    },
  })

  // Sample Expenses (Recurring: Rent, Internet)
  await prisma.transaction.create({
    data: {
      description: "Aluguel & Condomínio",
      amount: 2100.0,
      type: "EXPENSE",
      isRecurring: true,
      recurrenceRule: "MONTHLY",
      dueDate: new Date(currentYear, currentMonth - 1, 10),
      paidAt: new Date(currentYear, currentMonth - 1, 10),
      status: "COMPLETED",
      paymentMethod: "PIX",
      source: "MANUAL",
      categoryId: createdCategories["Moradia"],
    },
  })

  await prisma.transaction.create({
    data: {
      description: "Internet Fibra + Assinaturas",
      amount: 179.9,
      type: "EXPENSE",
      isRecurring: true,
      recurrenceRule: "MONTHLY",
      dueDate: new Date(currentYear, currentMonth - 1, 15),
      paidAt: new Date(currentYear, currentMonth - 1, 15),
      status: "COMPLETED",
      paymentMethod: "CREDIT_CARD",
      source: "MANUAL",
      categoryId: createdCategories["Assinaturas & Serviços"],
    },
  })

  // Sample One-off Expenses for Alimentação (Illustrating expenses accumulated up to current day)
  await prisma.transaction.create({
    data: {
      description: "Supermercado Semanal",
      amount: 645.3,
      type: "EXPENSE",
      isRecurring: false,
      dueDate: new Date(currentYear, currentMonth - 1, 4),
      paidAt: new Date(currentYear, currentMonth - 1, 4),
      status: "COMPLETED",
      paymentMethod: "DEBIT",
      source: "MANUAL",
      categoryId: createdCategories["Alimentação"],
    },
  })

  await prisma.transaction.create({
    data: {
      description: "Jantar Restaurante",
      amount: 185.0,
      type: "EXPENSE",
      isRecurring: false,
      dueDate: new Date(currentYear, currentMonth - 1, 12),
      paidAt: new Date(currentYear, currentMonth - 1, 12),
      status: "COMPLETED",
      paymentMethod: "CREDIT_CARD",
      source: "WHATSAPP",
      categoryId: createdCategories["Alimentação"],
    },
  })

  await prisma.transaction.create({
    data: {
      description: "Hortifruti & Padaria",
      amount: 92.5,
      type: "EXPENSE",
      isRecurring: false,
      dueDate: new Date(currentYear, currentMonth - 1, 18),
      paidAt: new Date(currentYear, currentMonth - 1, 18),
      status: "COMPLETED",
      paymentMethod: "PIX",
      source: "WHATSAPP",
      categoryId: createdCategories["Alimentação"],
    },
  })

  // Sample Transportation
  await prisma.transaction.create({
    data: {
      description: "Abastecimento Gasolina",
      amount: 280.0,
      type: "EXPENSE",
      isRecurring: false,
      dueDate: new Date(currentYear, currentMonth - 1, 8),
      paidAt: new Date(currentYear, currentMonth - 1, 8),
      status: "COMPLETED",
      paymentMethod: "DEBIT",
      source: "MANUAL",
      categoryId: createdCategories["Transporte"],
    },
  })

  // WhatsApp Default Config
  await prisma.whatsAppConfig.create({
    data: {
      id: "default",
      authorizedPhone: "5511999999999",
      provider: "SIMULATOR",
      isActive: true,
    },
  })

  console.log("Seeding finished successfully.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
