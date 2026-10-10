"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { User } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function Header() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          Facturas TBS Burbujas
        </Link>

        <nav className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost">Conductores</Button>
          </Link>

          {loading ? null : user ? (
            <>
              <Link href="/perfil">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  Mi Perfil
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Iniciar sesión</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}