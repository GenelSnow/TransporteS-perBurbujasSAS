"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  FileText,
  User,
  Bus,
  ArrowRight,
  Home,
  Loader2,
} from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [stats, setStats] = useState({
    conductores: 0,
    facturas: 0,
    buses: 0,
  })

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()

      setName(profile?.full_name || user.email?.split("@")[0] || "Usuario")

      const [c, f, b] = await Promise.all([
        supabase
          .from("conductores")
          .select("*", { count: "exact", head: true })
          .eq("estado", "activo"),
        supabase
          .from("facturas_viaje")
          .select("*", { count: "exact", head: true }),
        supabase.from("buses").select("*", { count: "exact", head: true }),
      ])

      setStats({
        conductores: c.count || 0,
        facturas: f.count || 0,
        buses: b.count || 0,
      })
      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const modules = [
    {
      title: "Página pública",
      description: "Ver conductores como los ve el público",
      href: "/",
      icon: Home,
      color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    },
    {
      title: "Facturas de viaje",
      description: "Crear y revisar control de gastos",
      href: "/facturas",
      icon: FileText,
      color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    },
    {
      title: "Mi perfil",
      description: "Foto, datos y buses",
      href: "/perfil",
      icon: User,
      color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Conductores",
      description: "Listado público del equipo",
      href: "/",
      icon: Users,
      color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    },
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Hero */}
        <div className="mb-10">
          <p className="text-sm text-muted-foreground font-medium mb-1">
            Panel de control
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Hola, {name}
          </h1>
          <p className="mt-2 text-muted-foreground font-light max-w-lg">
            Gestiona facturas, tu perfil y revisa cómo se ve la página principal
            de Facturas TBS Burbujas.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-xl bg-sky-500/10 p-3">
                <Users className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.conductores}
                </p>
                <p className="text-sm text-muted-foreground">Conductores</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-xl bg-violet-500/10 p-3">
                <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.facturas}
                </p>
                <p className="text-sm text-muted-foreground">Facturas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="rounded-xl bg-emerald-500/10 p-3">
                <Bus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stats.buses}
                </p>
                <p className="text-sm text-muted-foreground">Buses</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Módulos */}
        <h2 className="text-lg font-medium mb-4">Accesos rápidos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <Link key={mod.title + mod.href} href={mod.href}>
              <Card className="h-full border-border/60 transition-all hover:shadow-md hover:border-border group cursor-pointer">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div className={`rounded-xl p-3 shrink-0 ${mod.color}`}>
                    <mod.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      {mod.title}
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {mod.description}
                    </CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* CTA principal */}
        <div className="mt-10 rounded-2xl border bg-card p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg">Ir a la página principal</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Así ven el sitio tus clientes y el público general.
            </p>
          </div>
          <Link href="/">
            <Button size="lg" className="shrink-0">
              Ver página pública
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}