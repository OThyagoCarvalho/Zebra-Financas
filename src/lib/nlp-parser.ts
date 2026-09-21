import { db } from "./db"

export interface ParsedTransactionResult {
  success: boolean
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
  isRecurring: boolean
  recurrenceRule?: "MONTHLY" | "WEEKLY" | "YEARLY"
  categoryName: string
  categoryId?: string
  paymentMethod?: "PIX" | "CREDIT_CARD" | "DEBIT" | "CASH"
  confidence: number
  rawText: string
  replyMessage: string
}

// Income keywords
const INCOME_KEYWORDS = [
  "recebi",
  "recebido",
  "salario",
  "salário",
  "freela",
  "freelance",
  "pro-labore",
  "prolabore",
  "dividendo",
  "rendimento",
  "vendi",
  "venda",
  "entrada",
  "restituicao",
  "restituição",
  "bonificação",
  "bonus",
  "bônus",
]

// Recurring keywords
const RECURRING_KEYWORDS = [
  "recorrente",
  "mensal",
  "todo mes",
  "todo mês",
  "assinatura",
  "plano",
  "fixo",
  "fixa",
]

// Category mapping patterns
const CATEGORY_MAP: Record<string, string[]> = {
  Alimentação: [
    "almoço",
    "almoco",
    "jantar",
    "lanche",
    "mercado",
    "supermercado",
    "ifood",
    "restaurante",
    "padaria",
    "feira",
    "hortifruti",
    "mcdonalds",
    "burger",
    "pizza",
    "comida",
    "café",
    "cafe",
  ],
  Moradia: [
    "aluguel",
    "condomínio",
    "condominio",
    "luz",
    "energia",
    "água",
    "agua",
    "gás",
    "gas",
    "iptu",
    "eletropaulo",
    "enel",
    "sabesp",
  ],
  Transporte: [
    "uber",
    "99",
    "gasolina",
    "combustível",
    "combustivel",
    "etanol",
    "estacionamento",
    "pedágio",
    "pedagio",
    "ônibus",
    "onibus",
    "metrô",
    "metro",
    "ipva",
    "oficina",
  ],
  "Saúde & Farmácia": [
    "farmácia",
    "farmacia",
    "remédio",
    "remedio",
    "médico",
    "medico",
    "consulta",
    "dentista",
    "exame",
    "drogaria",
    "hospital",
  ],
  "Lazer & Entretenimento": [
    "cinema",
    "show",
    "viagem",
    "hotel",
    "festa",
    "jogo",
    "steam",
    "bar",
    "balada",
    "praia",
  ],
  "Assinaturas & Serviços": [
    "netflix",
    "spotify",
    "internet",
    "celular",
    "vivo",
    "claro",
    "tim",
    "amazon",
    "prime",
    "disney",
    "youtube",
    "icloud",
    "chatgpt",
  ],
  "Salário Mensal": ["salário", "salario", "holerite", "pagamento"],
  "Projetos & Freelance": ["freela", "freelance", "projeto", "consultoria", "bico"],
  "Investimentos & Dividendos": ["dividendo", "fii", "rendimento", "cdi", "tesouro"],
}

export async function parseFinancialMessage(rawMessage: string): Promise<ParsedTransactionResult> {
  const text = rawMessage.trim()
  const lower = text.toLowerCase()

  // 1. Detect Amount (e.g. 42,90 or 42.90 or 1500 or R$ 250,00)
  const amountRegex = /(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i
  const amountMatch = text.match(amountRegex)

  let amount = 0
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(",", ".")
    amount = parseFloat(rawNum)
  }

  // 2. Detect Type (Income vs Expense)
  const isIncome = INCOME_KEYWORDS.some((kw) => lower.includes(kw))
  const type: "INCOME" | "EXPENSE" = isIncome ? "INCOME" : "EXPENSE"

  // 3. Detect Recurrence
  const isRecurring = RECURRING_KEYWORDS.some((kw) => lower.includes(kw))
  const recurrenceRule = isRecurring ? "MONTHLY" : undefined

  // 4. Detect Payment Method
  let paymentMethod: "PIX" | "CREDIT_CARD" | "DEBIT" | "CASH" = "PIX"
  if (lower.includes("crédito") || lower.includes("credito") || lower.includes("cartão") || lower.includes("cartao")) {
    paymentMethod = "CREDIT_CARD"
  } else if (lower.includes("débito") || lower.includes("debito")) {
    paymentMethod = "DEBIT"
  } else if (lower.includes("dinheiro") || lower.includes("especie") || lower.includes("espécie")) {
    paymentMethod = "CASH"
  } else if (lower.includes("pix")) {
    paymentMethod = "PIX"
  }

  // 5. Match or determine Category
  let detectedCategoryName = isIncome ? "Receitas Extras" : "Outros Gastos"
  let maxScore = 0

  for (const [catName, keywords] of Object.entries(CATEGORY_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (kw.length > maxScore) {
          maxScore = kw.length
          detectedCategoryName = catName
        }
      }
    }
  }

  // 6. Clean Description
  // Remove matched amount and generic keywords from text to form description
  let description = text
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/gi, "")
    .replace(/\b(hoje|ontem|no|na|de|do|da|com|gastei|paguei|recebi|no crédito|no débito|no pix|no dinheiro|débito|debito|crédito|credito|pix|recorrente|mensal)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()

  if (!description || description.length < 2) {
    description = detectedCategoryName
  } else {
    // Capitalize first letter
    description = description.charAt(0).toUpperCase() + description.slice(1)
  }

  // Find category in DB or fallback
  const dbCategory = await db.category.findFirst({
    where: {
      name: {
        contains: detectedCategoryName,
      },
    },
  })

  let finalCategoryId = dbCategory?.id
  if (!finalCategoryId) {
    // Pick first available category of matching type
    const fallbackCat = await db.category.findFirst({
      where: { type },
    })
    finalCategoryId = fallbackCat?.id
  }

  const success = amount > 0

  // 7. Compose formatted WhatsApp reply
  const formattedAmount = amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })

  let replyMessage = ""
  if (!success) {
    replyMessage = `⚠️ Não consegui identificar o valor na sua mensagem.\nExemplo de envio:\n"Almoço 45,90 no débito" ou "Recebi 1200 freela"`
  } else {
    const icon = type === "INCOME" ? "🟢" : "🔴"
    const typeLabel = type === "INCOME" ? "Receita lançada" : "Despesa lançada"
    const recurrenceLabel = isRecurring ? " 🔁 (Recorrente)" : ""

    replyMessage = `${icon} *${typeLabel}!*${recurrenceLabel}\n\n` +
      `📝 *Descrição:* ${description}\n` +
      `💰 *Valor:* ${formattedAmount}\n` +
      `📁 *Categoria:* ${dbCategory?.name || detectedCategoryName}\n` +
      `💳 *Forma:* ${paymentMethod}`
  }

  return {
    success,
    description,
    amount,
    type,
    isRecurring,
    recurrenceRule,
    categoryName: dbCategory?.name || detectedCategoryName,
    categoryId: finalCategoryId,
    paymentMethod,
    confidence: success ? 0.95 : 0.2,
    rawText: rawMessage,
    replyMessage,
  }
}
