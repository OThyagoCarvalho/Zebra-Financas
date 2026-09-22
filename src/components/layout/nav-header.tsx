"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, Wallet, PieChart, ArrowLeftRight, LogOut, CreditCard, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { QuickAddDialog } from "@/components/transactions/quick-add-dialog"
import { HelpDialog } from "@/components/help/help-dialog"
import { logoutAction } from "@/actions/auth-actions"

export function NavHeader() {
  const pathname = usePathname()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  // Hide nav items on login page
  if (pathname === "/login") {
    return null
  }

  const navItems = [
    { label: "Visão Geral", href: "/", icon: Wallet },
    { label: "Transações", href: "/transactions", icon: ArrowLeftRight },
    { label: "Orçamentos", href: "/budgets", icon: PieChart },
    { label: "Cartões", href: "/cards", icon: CreditCard },
  ]

  const handleLogout = async () => {
    if (confirm("Deseja bloquear o acesso e sair do painel?")) {
      setLoggingOut(true)
      await logoutAction()
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-2 sm:space-x-5 lg:space-x-8 shrink-0">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 rounded-sm bg-white text-black flex items-center justify-center font-black text-sm tracking-tighter shadow-sm transition-transform group-hover:scale-105">
                ZB
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-100">
                  ZEBRA
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-tight -mt-1">
                  FINANCIAL
                </span>
              </div>
            </Link>

            {/* Nav Items - Icons ALWAYS show on mobile and tablet screens first */}
            <nav className="flex items-center space-x-1 sm:space-x-1.5">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-zinc-800 text-white border border-zinc-700 shadow-xs"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-zinc-400"}`} />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action: Quick Add Button, Help & Logout */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <Button
              onClick={() => setHelpOpen(true)}
              size="sm"
              variant="outline"
              title="Central de Ajuda e Exemplos"
              className="border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs h-8 px-2 sm:px-3 gap-1.5 rounded-md"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Ajuda</span>
            </Button>

            <Button
              onClick={() => setQuickAddOpen(true)}
              size="sm"
              title="Novo Lançamento"
              className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-8 px-2.5 sm:px-3.5 gap-1.5 rounded-md border-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span className="hidden sm:inline">Lançamento</span>
            </Button>

            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="ghost"
              size="icon-xs"
              title="Bloquear / Sair"
              className="text-zinc-500 hover:text-white hover:bg-zinc-800 h-8 w-8 rounded-md"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Global Quick Add Dialog */}
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />

      {/* Global Help Dialog */}
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  )
}
