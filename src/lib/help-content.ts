import { db } from "./db"

export interface HelpExample {
  title: string
  command: string
  explanation: string
  category: string
  paymentMethod: string
}

export interface HelpGroup {
  id: string
  title: string
  icon: string
  badge: string
  badgeColor: string
  description: string
  examples: HelpExample[]
}

const HELP_KEYWORDS = [
  "ajuda",
  "help",
  "comandos",
  "comando",
  "guia",
  "como usar",
  "exemplos",
  "exemplo",
  "tutorial",
  "instrucoes",
  "instruções",
  "?",
]

/**
 * Checks if a message text corresponds to a help request
 */
export function isHelpCommand(rawMessage: string): boolean {
  const text = (rawMessage || "").trim().toLowerCase()
  if (!text) return false

  // Exact match on keywords
  if (HELP_KEYWORDS.includes(text)) {
    return true
  }

  // With symbol triggers: "# ajuda", "! help", "$ comandos", etc.
  const symbolMatch = text.match(/^([#$!])\s*([\s\S]*)$/)
  if (symbolMatch) {
    const cleanWord = symbolMatch[2].trim()
    if (HELP_KEYWORDS.includes(cleanWord)) {
      return true
    }
  }

  // With word triggers: "z ajuda", "zebra help", etc.
  const wordMatch = text.match(/^(zebra|z)[:\s]\s*([\s\S]*)$/i)
  if (wordMatch) {
    const cleanWord = wordMatch[2].trim()
    if (HELP_KEYWORDS.includes(cleanWord)) {
      return true
    }
  }

  return false
}

/**
 * Generates the full WhatsApp-formatted help guide with dynamic categories from the database
 */
export async function generateWhatsAppHelpText(
  preloadedCategories?: { name: string; type: string }[]
): Promise<string> {
  let expenseCats: string[] = []
  let incomeCats: string[] = []

  try {
    const allCategories =
      preloadedCategories ??
      (await db.category.findMany({
        orderBy: { name: "asc" },
      }))

    expenseCats = allCategories
      .filter((c) => c.type === "EXPENSE")
      .map((c) => c.name)

    incomeCats = allCategories
      .filter((c) => c.type === "INCOME")
      .map((c) => c.name)
  } catch {
    expenseCats = [
      "Alimentação",
      "Moradia",
      "Transporte",
      "Saúde & Farmácia",
      "Lazer & Entretenimento",
      "Assinaturas & Serviços",
    ]
    incomeCats = [
      "Salário Mensal",
      "Projetos & Freelance",
      "Investimentos & Dividendos",
      "Receitas Extras",
    ]
  }

  const expenseListStr = expenseCats.length > 0 ? expenseCats.join(", ") : "Alimentação, Moradia, Transporte, etc."
  const incomeListStr = incomeCats.length > 0 ? incomeCats.join(", ") : "Salário Mensal, Freelance, etc."

  return `🦓 *ZEBRA FINANÇAS — GUIA RÁPIDO DE COMANDOS*

Para registrar qualquer movimentação financeira, envie mensagens iniciando com *#*, *$*, *!* ou *z* (exemplo: \`# mercado 150\`).

📂 *CATEGORIAS DISPONÍVEIS NO SEU COFRE:*
🔴 *Despesas:*
${expenseListStr}

🟢 *Receitas:*
${incomeListStr}

────────────────────
💡 *EXEMPLOS POR TIPO DE CADASTRO:*

1️⃣ *Despesa À Vista (Pix, Débito ou Dinheiro):*
• \`# almoço 45 debito\`
• \`# mercado 185 pix\`
• \`# padaria 15 dinheiro\`

2️⃣ *Cartões de Crédito Específicos:*
• \`# farmacia 85 credito bb\` (Cartão BB)
• \`# tenis 350 cartao caixa\` (Cartão Caixa)
• \`# jantar 210 credito xp\` (Cartão XP)
• \`# compras 140 credito inter\` (Cartão Inter)

3️⃣ *Compras Parceladas no Cartão (Projeção no Tempo):*
• \`# celular 1500 10x xp\`
  ↳ _Cria 10 parcelas mensais de R$ 150,00 nos meses futuros_
• \`# sofa 2400 em 6 vezes bb\`
  ↳ _Cria 6 parcelas mensais de R$ 400,00_
• \`# notebook 3600 12 parcelas inter\`

4️⃣ *Receitas e Entradas Financeiras:*
• \`# salario 6500 pix\`
• \`# recebi 1200 freela debito\`
• \`# dividendos 350 pix\`

5️⃣ *Lançamentos Recorrentes / Fixos (Todo Mês):*
• \`# aluguel 2200 mensal\`
• \`# academia 120 fixo debito\`
• \`# salario 8000 recorrente\`

6️⃣ *Lançamento com Status Pendente:*
• \`# boleto faculdade 800 pendente\`

────────────────────
⚙️ *DICAS DE USO:*
• O formato sugerido é: \`# [descrição] [valor] [parcelas] [forma]\`
• Não precisa de centavos para valores redondos (\`# uber 25\`).
• Para valores com centavos, use vírgula ou ponto (\`# cafe 6,50\`).`
}

/**
 * Returns structured help data for the UI modal
 */
export async function getHelpStructuredData() {
  const allCategories = await db.category.findMany({
    orderBy: { name: "asc" },
  })

  const rawText = await generateWhatsAppHelpText(allCategories)

  const expenseCategories = allCategories.filter((c) => c.type === "EXPENSE")
  const incomeCategories = allCategories.filter((c) => c.type === "INCOME")

  const exampleGroups: HelpGroup[] = [
    {
      id: "avista",
      title: "Despesas À Vista",
      icon: "Wallet",
      badge: "Pix / Débito / Dinheiro",
      badgeColor: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
      description: "Gastos comuns pagos na hora em dinheiro, Pix ou cartão de débito.",
      examples: [
        {
          title: "Almoço com Débito",
          command: "# almoço 45 debito",
          explanation: "Registra R$ 45,00 em Alimentação via débito.",
          category: "Alimentação",
          paymentMethod: "DEBIT",
        },
        {
          title: "Supermercado via Pix",
          command: "# mercado 185 pix",
          explanation: "Registra R$ 185,00 em Alimentação via Pix.",
          category: "Alimentação",
          paymentMethod: "PIX",
        },
        {
          title: "Padaria em Dinheiro",
          command: "# padaria 15 dinheiro",
          explanation: "Registra R$ 15,00 em dinheiro vivo.",
          category: "Alimentação",
          paymentMethod: "CASH",
        },
      ],
    },
    {
      id: "cartoes",
      title: "Cartões de Crédito Específicos",
      icon: "CreditCard",
      badge: "BB, Caixa, XP & Inter",
      badgeColor: "bg-blue-950/60 text-blue-400 border-blue-800/60",
      description: "Compras creditadas diretamente na fatura do banco correspondente.",
      examples: [
        {
          title: "Farmácia no Cartão BB",
          command: "# farmacia 85 credito bb",
          explanation: "Entra na fatura do Banco do Brasil em Saúde & Farmácia.",
          category: "Saúde & Farmácia",
          paymentMethod: "CREDIT_BB",
        },
        {
          title: "Tênis na Caixa Econômica",
          command: "# tenis 350 cartao caixa",
          explanation: "Entra na fatura da Caixa Econômica Federal.",
          category: "Outros Gastos",
          paymentMethod: "CREDIT_CAIXA",
        },
        {
          title: "Jantar no Cartão XP",
          command: "# jantar 210 credito xp",
          explanation: "Entra na fatura do cartão XP Investimentos.",
          category: "Alimentação",
          paymentMethod: "CREDIT_XP",
        },
        {
          title: "Compras no Banco Inter",
          command: "# compras 140 credito inter",
          explanation: "Entra na fatura do Banco Inter em Lazer ou Geral.",
          category: "Outros Gastos",
          paymentMethod: "CREDIT_INTER",
        },
      ],
    },
    {
      id: "parceladas",
      title: "Compras Parceladas no Cartão",
      icon: "Calendar",
      badge: "1x a 48x no tempo",
      badgeColor: "bg-amber-950/60 text-amber-400 border-amber-800/60",
      description: "O sistema divide o valor e projeta as parcelas futuras mês a mês automaticamente.",
      examples: [
        {
          title: "Celular em 10x na XP",
          command: "# celular 1500 10x xp",
          explanation: "Cria 10 parcelas de R$ 150,00 nos próximos 10 meses na fatura XP.",
          category: "Assinaturas & Serviços",
          paymentMethod: "CREDIT_XP",
        },
        {
          title: "Sofá em 6x no Banco do Brasil",
          command: "# sofa 2400 em 6 vezes bb",
          explanation: "Cria 6 parcelas de R$ 400,00 na fatura do BB.",
          category: "Moradia",
          paymentMethod: "CREDIT_BB",
        },
        {
          title: "Notebook em 12x no Inter",
          command: "# notebook 3600 12 parcelas inter",
          explanation: "Cria 12 parcelas de R$ 300,00 na fatura Inter.",
          category: "Outros Gastos",
          paymentMethod: "CREDIT_INTER",
        },
      ],
    },
    {
      id: "receitas",
      title: "Receitas & Entradas",
      icon: "ArrowUpRight",
      badge: "Salário / Freelas / Rendimentos",
      badgeColor: "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
      description: "Registros que somam ao seu saldo e total de receitas.",
      examples: [
        {
          title: "Salário Mensal",
          command: "# salario 6500 pix",
          explanation: "Lança receita de R$ 6.500,00 na categoria Salário Mensal.",
          category: "Salário Mensal",
          paymentMethod: "PIX",
        },
        {
          title: "Recebimento de Freelance",
          command: "# recebi 1200 freela debito",
          explanation: "Lança receita de R$ 1.200,00 em Projetos & Freelance.",
          category: "Projetos & Freelance",
          paymentMethod: "DEBIT",
        },
        {
          title: "Dividendos e Investimentos",
          command: "# dividendos 350 pix",
          explanation: "Lança rendimento em Investimentos & Dividendos.",
          category: "Investimentos & Dividendos",
          paymentMethod: "PIX",
        },
      ],
    },
    {
      id: "recorrentes",
      title: "Lançamentos Fixos & Recorrentes",
      icon: "Repeat",
      badge: "Todo Mês",
      badgeColor: "bg-purple-950/60 text-purple-400 border-purple-800/60",
      description: "Despesas e receitas que se repetem mensalmente.",
      examples: [
        {
          title: "Aluguel Mensal",
          command: "# aluguel 2200 mensal",
          explanation: "Marca a transação como recorrente todo mês.",
          category: "Moradia",
          paymentMethod: "PIX",
        },
        {
          title: "Academia Fixa",
          command: "# academia 120 fixo debito",
          explanation: "Marca o débito da academia como fixo mensal.",
          category: "Saúde & Farmácia",
          paymentMethod: "DEBIT",
        },
        {
          title: "Salário Recorrente",
          command: "# salario 8000 recorrente",
          explanation: "Salário com repetição mensal programada.",
          category: "Salário Mensal",
          paymentMethod: "PIX",
        },
      ],
    },
  ]

  return {
    rawText,
    expenseCategories,
    incomeCategories,
    exampleGroups,
  }
}
