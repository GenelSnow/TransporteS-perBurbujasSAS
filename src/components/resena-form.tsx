"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Star, Loader2 } from "lucide-react"

interface ResenaFormProps {
  conductorId: string
}

export function ResenaForm({ conductorId }: ResenaFormProps) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [comentario, setComentario] = useState("")
  const [calificacion, setCalificacion] = useState(0)
  const [hover, setHover] = useState(0)
  const [loading, setLoading] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (calificacion === 0) {
      toast.error("Selecciona una calificación")
      return
    }

    if (!nombre.trim()) {
      toast.error("Escribe tu nombre")
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from("resenas").insert({
      conductor_id: conductorId,
      nombre_cliente: nombre.trim(),
      calificacion,
      comentario: comentario.trim() || null,
    })

    if (error) {
      toast.error("Error al guardar la reseña", {
        description: error.message,
      })
      setLoading(false)
      return
    }

    toast.success("¡Gracias por tu reseña!")
    setNombre("")
    setComentario("")
    setCalificacion(0)
    setAbierto(false)
    setLoading(false)
    router.refresh()
  }

  if (!abierto) {
    return (
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setAbierto(true)}
      >
        Dejar una reseña
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Tu calificación</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setCalificacion(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="focus:outline-none"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  star <= (hover || calificacion)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nombre">Tu nombre</Label>
        <Input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Juan Pérez"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="comentario">Comentario (opcional)</Label>
        <Textarea
          id="comentario"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Cuéntanos tu experiencia..."
          rows={3}
          disabled={loading}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar reseña
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setAbierto(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}