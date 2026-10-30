"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Bell } from "lucide-react"
import { useRouter } from "next/navigation"

type Notificacion = {
  id: string
  titulo: string
  mensaje: string | null
  leida: boolean
  link: string | null
  created_at: string
}

export function CampanaNotificaciones() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<Notificacion[]>([])
  const [abierto, setAbierto] = useState(false)

  const noLeidas = items.filter((n) => !n.leida).length

  useEffect(() => {
    const supabase = createClient()

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)

      // Cargar las que ya existen
      const { data } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)

      setItems((data as Notificacion[]) || [])

      // Suscripción Realtime  ← AQUÍ va el código
      const channel = supabase
        .channel("notificaciones")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notificaciones",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const nueva = payload.new as Notificacion
            setItems((prev) => [nueva, ...prev])
            toast.info(nueva.titulo, {
              description: nueva.mensaje || undefined,
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const cleanupPromise = init()

    return () => {
      cleanupPromise.then((cleanup) => cleanup?.())
    }
  }, [])

  const marcarLeida = async (id: string) => {
    const supabase = createClient()
    await supabase
      .from("notificaciones")
      .update({ leida: true })
      .eq("id", id)

    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    )
  }

  if (!userId) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto rounded-xl border bg-background shadow-lg z-50">
          <div className="px-3 py-2 border-b font-semibold text-sm">
            Notificaciones
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No tienes notificaciones
            </p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`w-full text-left px-3 py-3 border-b text-sm hover:bg-muted/50 ${
                  !n.leida ? "bg-muted/30" : ""
                }`}
                onClick={async () => {
                  await marcarLeida(n.id)
                  setAbierto(false)
                  if (n.link) router.push(n.link)
                }}
              >
                <p className="font-medium">{n.titulo}</p>
                {n.mensaje && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {n.mensaje}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}