import { db } from "./db"
import { getPaymentMethodLabel } from "./payment-methods"
import { isHelpCommand, generateWhatsAppHelpText } from "./help-content"

export interface ParsedTransactionResult {
  success: boolean
  isHelp?: boolean
  description: string
  amount: number
  type: "INCOME" | "EXPENSE"
  isRecurring: boolean
  recurrenceRule?: "MONTHLY" | "WEEKLY" | "YEARLY"
  categoryName: string
  categoryId?: string
  paymentMethod?: string
  installments?: number
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

  // 0. Detect Help / Guidance Commands
  if (isHelpCommand(text)) {
    const helpText = await generateWhatsAppHelpText()
    return {
      success: true,
      isHelp: true,
      description: "Guia de Comandos & Ajuda",
      amount: 0,
      type: "EXPENSE",
      isRecurring: false,
      categoryName: "Ajuda",
      confidence: 1.0,
      rawText: rawMessage,
      replyMessage: helpText,
    }
  }

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

  // 4. Detect Payment Method & Specific Credit Cards
  let paymentMethod = "PIX"
  if (lower.includes("bb") || lower.includes("banco do brasil")) {
    paymentMethod = "CREDIT_BB"
  } else if (lower.includes("caixa") || lower.includes("cef")) {
    paymentMethod = "CREDIT_CAIXA"
  } else if (lower.includes("xp")) {
    paymentMethod = "CREDIT_XP"
  } else if (lower.includes("inter") || lower.includes("banco inter")) {
    paymentMethod = "CREDIT_INTER"
  } else if (lower.includes("crédito") || lower.includes("credito") || lower.includes("cartão") || lower.includes("cartao")) {
    paymentMethod = "CREDIT_CARD"
  } else if (lower.includes("débito") || lower.includes("debito")) {
    paymentMethod = "DEBIT"
  } else if (lower.includes("dinheiro") || lower.includes("especie") || lower.includes("espécie")) {
    paymentMethod = "CASH"
  } else if (lower.includes("pix")) {
    paymentMethod = "PIX"
  }

  // 4.1 Detect Installments (ex: "3x", "10x", "em 6 vezes", "em 4 parcelas")
  let installments = 1
  const instMatch = lower.match(/(?:em\s+)?(\d+)\s*(?:x|vezes|parcelas)\b/i)
  if (instMatch && instMatch[1]) {
    const parsedInst = parseInt(instMatch[1], 10)
    if (!isNaN(parsedInst) && parsedInst >= 1 && parsedInst <= 48) {
      installments = parsedInst
      // If user specified installments and didn't specify debit/cash, treat as credit card
      if (paymentMethod === "PIX") {
        paymentMethod = "CREDIT_CARD"
      }
    }
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
  // Remove matched amount, generic keywords, banks, and installment markers from text
  let description = text
    .replace(/(?:r\$\s*)?\d+(?:[.,]\d{1,2})?/gi, "")
    .replace(/(?:em\s+)?\d+\s*(?:x|vezes|parcelas)\b/gi, "")
    .replace(/\b(hoje|ontem|no|na|de|do|da|com|gastei|paguei|recebi|no crédito|no débito|no pix|no dinheiro|débito|debito|crédito|credito|pix|recorrente|mensal|bb|caixa|xp|inter|banco do brasil|cef)\b/gi, "")
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
    replyMessage = `⚠️ Não consegui identificar os dados na sua mensagem.\n\nExemplos de envio:\n• "# Almoço 45,90 no débito"\n• "# Celular 1200 10x xp"\n• "# Salário 5000 pix"\n\n💡 Digite *# ajuda* para ver a lista de categorias e exemplos de todos os tipos de lançamento.`
  } else {
    const icon = type === "INCOME" ? "🟢" : "🔴"
    const typeLabel = type === "INCOME" ? "Receita lançada" : "Despesa lançada"
    const recurrenceLabel = isRecurring ? " 🔁 (Recorrente)" : ""
    const methodLabel = getPaymentMethodLabel(paymentMethod)
    const instText =
      installments > 1
        ? `\n💳 *Parcelamento:* ${installments}x de R$ ${(amount / installments)
            .toFixed(2)
            .replace(".", ",")}`
        : ""

    replyMessage =
      `${icon} *${typeLabel}!*${recurrenceLabel}\n\n` +
      `📝 *Descrição:* ${description}\n` +
      `💰 *Valor:* ${formattedAmount}\n` +
      `📁 *Categoria:* ${dbCategory?.name || detectedCategoryName}\n` +
      `💳 *Forma:* ${methodLabel}${instText}`
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
    installments,
    confidence: success ? 0.95 : 0.2,
    rawText: rawMessage,
    replyMessage,
  }
}
