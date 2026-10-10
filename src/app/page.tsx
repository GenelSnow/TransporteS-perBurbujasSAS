import { Suspense } from "react"
import { ConductoresGrid } from "@/components/conductores-grid"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero - estático, no da problemas */}
      <section className="border-b">
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
            Facturas TBS Burbujas
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto font-light">
            Conoce a nuestro equipo de conductores profesionales
          </p>
        </div>
      </section>

      {/* Lista de conductores - dentro de Suspense */}
      <section className="container mx-auto px-4 py-16">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card rounded-2xl overflow-hidden border animate-pulse"
                >
                  <div className="aspect-[4/5] bg-muted" />
                  <div className="p-5 space-y-2">
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <ConductoresGrid />
        </Suspense>
      </section>
    </div>
  )
}