import { connection } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Phone, User, FileText } from "lucide-react"
import { ResenaForm } from "@/components/resena-form"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConductorPage({ params }: Props) {
  await connection()
  const { id } = await params
  const supabase = await createClient()

  const { data: conductor } = await supabase
    .from("conductores")
    .select("*")
    .eq("id", id)
    .single()

  if (!conductor) notFound()

  const { data: resenas } = await supabase
    .from("resenas")
    .select("*")
    .eq("conductor_id", id)
    .order("created_at", { ascending: false })

  const promedio =
    resenas && resenas.length > 0
      ? (
          resenas.reduce((acc, r) => acc + r.calificacion, 0) / resenas.length
        ).toFixed(1)
      : null

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            ← Volver a conductores
          </Button>
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Columna izquierda - Perfil */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="relative w-40 h-40 rounded-full overflow-hidden bg-muted mb-4">
                {conductor.foto_url ? (
                  <Image
                    src={conductor.foto_url}
                    alt={`${conductor.nombres} ${conductor.apellidos}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-bold">
                {conductor.nombres} {conductor.apellidos}
              </h1>

              <Badge className="mt-2" variant="secondary">
                {conductor.estado === "activo" ? "Activo" : "Inactivo"}
              </Badge>

              {promedio && (
                <div className="flex items-center gap-2 mt-4">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold text-lg">{promedio}</span>
                  <span className="text-sm text-muted-foreground">
                    ({resenas?.length} reseñas)
                  </span>
                </div>
              )}

              <div className="w-full mt-6 space-y-3 text-sm text-left">
                {conductor.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {conductor.telefono}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Licencia: {conductor.licencia || "No registrada"}
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {conductor.tipo_documento} {conductor.numero_documento}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha - Descripción + Reseñas */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sobre mí</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {conductor.descripcion ||
                  "Este conductor aún no ha agregado una descripción."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dejar una reseña</CardTitle>
            </CardHeader>
            <CardContent>
              <ResenaForm conductorId={conductor.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Reseñas ({resenas?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resenas && resenas.length > 0 ? (
                resenas.map((resena) => (
                  <div
                    key={resena.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{resena.nombre_cliente}</span>
                      <div className="flex">
                        {Array.from({ length: resena.calificacion }).map(
                          (_, i) => (
                            <Star
                              key={i}
                              className="h-4 w-4 fill-yellow-400 text-yellow-400"
                            />
                          )
                        )}
                      </div>
                    </div>
                    {resena.comentario && (
                      <p className="text-sm text-muted-foreground">
                        {resena.comentario}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">
                  Aún no hay reseñas para este conductor.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}