import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import { User } from "lucide-react"

export async function ConductoresGrid() {
  const supabase = await createClient()

  const { data: conductores } = await supabase
    .from("conductores")
    .select("*")
    .eq("estado", "activo")
    .order("nombres")

  if (!conductores || conductores.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground text-lg font-light">
          No hay conductores registrados todavía.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {conductores.map((conductor) => (
        <Link
          key={conductor.id}
          href={`/conductores/${conductor.id}`}
          className="group"
        >
          <article className="bg-card rounded-2xl overflow-hidden border shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
            <div className="relative aspect-[4/5] bg-muted overflow-hidden">
              {conductor.foto_url ? (
                <Image
                  src={conductor.foto_url}
                  alt={`${conductor.nombres} ${conductor.apellidos}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <User className="h-16 w-16 text-muted-foreground/40" />
                </div>
              )}
            </div>

            <div className="p-5">
              <h2 className="text-lg font-medium text-foreground tracking-tight">
                {conductor.nombres} {conductor.apellidos}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground font-light">
                {conductor.licencia
                  ? `Licencia ${conductor.licencia}`
                  : "Conductor profesional"}
              </p>
            </div>
          </article>
        </Link>
      ))}
    </div>
  )
}