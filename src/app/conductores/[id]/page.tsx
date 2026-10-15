import { Suspense } from "react"
import { ConductorDetail } from "@/components/conductor-detail"

interface Props {
  params: Promise<{ id: string }>
}

function ConductorSkeleton() {
  return (
    <div className="container mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 w-40 bg-muted rounded mb-8" />
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-xl p-6 flex flex-col items-center">
            <div className="w-40 h-40 rounded-full bg-muted mb-4" />
            <div className="h-6 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-20 bg-muted rounded" />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 h-32" />
          <div className="bg-card border rounded-xl p-6 h-48" />
          <div className="bg-card border rounded-xl p-6 h-40" />
        </div>
      </div>
    </div>
  )
}

export default function ConductorPage({ params }: Props) {
  return (
    <Suspense fallback={<ConductorSkeleton />}>
      <ConductorDetail params={params} />
    </Suspense>
  )
}