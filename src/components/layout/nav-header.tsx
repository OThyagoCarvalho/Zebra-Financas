"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, Wallet, PieChart, ArrowLeftRight, LogOut, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { QuickAddDialog } from "@/components/transactions/quick-add-dialog"
import { logoutAction } from "@/actions/auth-actions"

export function NavHeader() {
  const pathname = usePathname()
  const [quickAddOpen, setQuickAddOpen] = useState(false)
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-sm bg-white text-black flex items-center justify-center font-black text-sm tracking-tighter shadow-sm transition-transform group-hover:scale-105">
                ZB
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-wider uppercase text-zinc-100">
                  ZEBRA
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-tight -mt-1">
                  FINANCIAL
                </span>
              </div>
            </Link>

            {/* Nav Items */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? "bg-zinc-800 text-white border border-zinc-700"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-zinc-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action: Quick Add Button & Logout */}
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setQuickAddOpen(true)}
              size="sm"
              className="bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-8 px-3.5 gap-1.5 rounded-md border-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Lançamento</span>
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

        {/* Mobile Nav Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-zinc-800/80 px-2 py-2 bg-zinc-950/90">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-1 px-3 rounded text-[11px] font-medium ${
                  isActive ? "text-white font-semibold" : "text-zinc-500"
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </header>

      {/* Global Quick Add Dialog */}
      <QuickAddDialog open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  )
}
