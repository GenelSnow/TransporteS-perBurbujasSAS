"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileText, User, LogOut, Home, ChevronDown } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { CampanaNotificaciones } from "@/components/notificaciones-campana"

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)
  const [esOwner, setEsOwner] = useState(false)
  

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      const { data } = await supabase.auth.getUser()
      setUser(data.user)

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .single()

        setDisplayName(
          profile?.full_name ||
            data.user.email?.split("@")[0] ||
            "Mi cuenta"
        )
      }
      setLoading(false)
    }

    load()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setDisplayName("")
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = "/"
  }

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* Logo simple */}
        <Link
          href="/"
          className="text-base sm:text-lg font-semibold tracking-tight shrink-0"
        >
          TBS Burbujas
        </Link>

        <nav className="flex items-center gap-2">
          {loading ? null : user ? (
            <>
              {/* Botón principal: Facturas */}
              <button
                type="button"
                onClick={() => router.push("/facturas")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground h-11 px-3 sm:px-4 text-sm font-semibold shadow-sm active:scale-[0.98] transition"
              >
                <FileText className="h-5 w-5 shrink-0" />
                <span>Facturas</span>
              </button>

              {user && <CampanaNotificaciones />}

              {/* Menú cuenta: pocas opciones, letras grandes */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-xl border h-11 px-3 text-sm font-semibold bg-background hover:bg-muted transition outline-none">
                  <User className="h-5 w-5 shrink-0" />
                  <span className="hidden xs:inline max-w-[100px] truncate sm:inline">
                    Cuenta
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tu cuenta
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-base py-3 px-3 rounded-lg"
                    onClick={() => router.push("/")}
                  >
                    <Home className="mr-3 h-5 w-5" />
                    Inicio
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-base py-3 px-3 rounded-lg"
                    onClick={() => router.push("/perfil")}
                  >
                    <User className="mr-3 h-5 w-5" />
                    Mi perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-base py-3 px-3 rounded-lg"
                    onClick={() => router.push("/facturas")}
                  >
                    <FileText className="mr-3 h-5 w-5" />
                    Mis facturas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-base py-3 px-3 rounded-lg text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-3 h-5 w-5" />
                    Salir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground h-11 px-5 text-sm font-semibold shadow-sm"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}