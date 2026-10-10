"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Moon, Sun, Monitor, User } from "lucide-react"

export default function PerfilPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  useEffect(() => {
    setMounted(true)
    loadProfile()
  }, [])

  const loadProfile = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/login")
      return
    }

    setEmail(user.email || "")

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name || "")
    }

    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      toast.error("Error al guardar", { description: error.message })
    } else {
      toast.success("Perfil actualizado")
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1 font-light">
          Administra tu cuenta y preferencias
        </p>
      </div>

      <div className="space-y-6">
        {/* Datos personales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos personales</CardTitle>
            <CardDescription>
              Información básica de tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre"
                  disabled={saving}
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Apariencia</CardTitle>
            <CardDescription>
              Elige el tema de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-sm font-medium">Claro</span>
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-sm font-medium">Oscuro</span>
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <Monitor className="h-5 w-5" />
                  <span className="text-sm font-medium">Sistema</span>
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}