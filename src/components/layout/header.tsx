"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  User,
  FileText,
  LogOut,
  ChevronDown,
  Users,
  LayoutDashboard,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Header() {
  const router = useRouter()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)

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
            "Usuario"
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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 min-w-0">
        {/* Logo: corto en móvil, completo en desktop */}
        <Link
          href="/"
          className="font-semibold text-base sm:text-lg tracking-tight shrink-0 min-w-0 truncate max-w-[45%] sm:max-w-none"
        >
          <span className="sm:hidden">TBS Burbujas</span>
          <span className="hidden sm:inline">Facturas TBS Burbujas</span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Conductores: solo icono en móvil */}
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3"
            >
              <Users className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Conductores</span>
            </Button>
          </Link>

          {loading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center justify-center gap-1.5 rounded-md border bg-background px-2 sm:px-3 h-8 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring max-w-[140px] sm:max-w-[180px]">
                <User className="h-4 w-4 shrink-0" />
                {/* Nombre solo desde sm; en móvil solo icono */}
                <span className="hidden sm:inline truncate">
                  {displayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {/* Nombre completo dentro del menú en móvil */}
                <div className="px-2 py-1.5 sm:hidden">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">Tu cuenta</p>
                </div>
                <DropdownMenuSeparator className="sm:hidden" />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/dashboard")}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/perfil")}
                >
                  <User className="mr-2 h-4 w-4" />
                  Mi perfil
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => router.push("/facturas")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generar factura
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button size="sm" className="h-8 text-xs sm:text-sm px-2.5 sm:px-3">
                Entrar
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}