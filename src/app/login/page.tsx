"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, KeyRound, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { loginAction } from "@/actions/auth-actions"

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setLoading(true)
    setError(null)

    try {
      const res = await loginAction(password)
      if (res.success) {
        router.push("/")
        router.refresh()
      } else {
        setError(res.error || "Senha incorreta")
      }
    } catch (err: any) {
      setError("Erro ao autenticar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Top Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-md bg-white text-black flex items-center justify-center font-black text-base tracking-tighter shadow-md">
            ZB
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white uppercase">
            Cofre ZEBRA
          </h1>
          <p className="text-xs text-zinc-400">
            Acesso restrito ao painel de finanças e orçamentos
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-[#121215] border border-zinc-800 shadow-2xl rounded-xl overflow-hidden">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Autenticação de Acesso</span>
            </CardTitle>
            <CardDescription className="text-[11px] text-zinc-400">
              Digite a sua senha mestra para desbloquear a visualização
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-1">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                  Senha Mestra
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="Digite sua senha..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 text-xs bg-zinc-900 border-zinc-700 text-white pr-10 focus-visible:ring-1 focus-visible:ring-zinc-400 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#ef4444] text-xs font-medium">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-white text-black hover:bg-zinc-200 text-xs font-semibold h-10 rounded-md transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span>Desbloqueando...</span>
                  </>
                ) : (
                  <span>Desbloquear Cofre</span>
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Sessão segura (60 dias)
              </span>
              <span>v1.0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
