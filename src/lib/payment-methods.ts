export interface PaymentMethodOption {
  id: string
  label: string
  isCredit: boolean
  bankName?: string
  color?: string
  bg?: string
  border?: string
  brandInitials?: string
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: "PIX",
    label: "PIX",
    isCredit: false,
  },
  {
    id: "CREDIT_BB",
    label: "Crédito BB",
    isCredit: true,
    bankName: "Banco do Brasil",
    color: "#eab308", // Yellow / Gold
    bg: "rgba(234, 179, 8, 0.12)",
    border: "rgba(234, 179, 8, 0.35)",
    brandInitials: "BB",
  },
  {
    id: "CREDIT_CAIXA",
    label: "Crédito Caixa",
    isCredit: true,
    bankName: "Caixa Econômica",
    color: "#38bdf8", // Blue / Sky
    bg: "rgba(56, 189, 248, 0.12)",
    border: "rgba(56, 189, 248, 0.35)",
    brandInitials: "CEF",
  },
  {
    id: "CREDIT_XP",
    label: "Crédito XP",
    isCredit: true,
    bankName: "XP Investimentos",
    color: "#f97316", // XP Orange
    bg: "rgba(249, 115, 22, 0.12)",
    border: "rgba(249, 115, 22, 0.35)",
    brandInitials: "XP",
  },
  {
    id: "CREDIT_INTER",
    label: "Crédito Inter",
    isCredit: true,
    bankName: "Banco Inter",
    color: "#ff7a00", // Inter Orange
    bg: "rgba(255, 122, 0, 0.12)",
    border: "rgba(255, 122, 0, 0.35)",
    brandInitials: "IN",
  },
  {
    id: "CREDIT_CARD",
    label: "Outro Cartão de Crédito",
    isCredit: true,
    bankName: "Cartão de Crédito",
    color: "#a1a1aa", // Zinc / Slate
    bg: "rgba(161, 161, 170, 0.12)",
    border: "rgba(161, 161, 170, 0.35)",
    brandInitials: "CC",
  },
  {
    id: "DEBIT",
    label: "Cartão de Débito",
    isCredit: false,
  },
  {
    id: "CASH",
    label: "Dinheiro em Espécie",
    isCredit: false,
  },
]

export const CREDIT_CARDS = PAYMENT_METHODS.filter((m) => m.isCredit)

export function isCreditCard(method?: string | null): boolean {
  if (!method) return false
  return method.startsWith("CREDIT_") || method === "CREDIT_CARD"
}

export function getPaymentMethodConfig(method?: string | null): PaymentMethodOption {
  if (!method) return PAYMENT_METHODS[0]
  const found = PAYMENT_METHODS.find((m) => m.id === method)
  if (found) return found

  // Fallback for custom or legacy methods
  if (method.includes("CREDIT") || method.includes("CARTAO")) {
    return {
      id: method,
      label: method,
      isCredit: true,
      bankName: "Cartão de Crédito",
      color: "#a1a1aa",
      bg: "rgba(161, 161, 170, 0.12)",
      border: "rgba(161, 161, 170, 0.35)",
      brandInitials: "CC",
    }
  }

  return {
    id: method,
    label: method,
    isCredit: false,
  }
}

export function getPaymentMethodLabel(method?: string | null): string {
  return getPaymentMethodConfig(method).label
}
