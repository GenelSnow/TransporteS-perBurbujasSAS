"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { formatCOP, parseCOP } from "@/lib/format"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Loader2,
  Plus,
  Trash2,
  FileText,
  Download,
  ImageIcon,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

const GASTOS_DEFAULT = ["Comida", "ACPM", "Hotel", "Lavado", "Parqueo"]

type GastoItem = {
  id: string
  concepto: string
  costo: number
  es_predefinido: boolean
}

type Registro = {
  id: string
  numero: string
  numero_bus: string | null
  fecha: string
  costo_viaje: number
  total_gastos: number
  saldo: number
  created_at: string
}

export default function FacturasPage() {
  const router = useRouter()
  const previewRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [vista, setVista] = useState<"lista" | "nueva">("lista")

  // Formulario
  const [numeroBus, setNumeroBus] = useState("")
  const [fecha, setFecha] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [costoViaje, setCostoViaje] = useState(0)
  const [costoViajeInput, setCostoViajeInput] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [items, setItems] = useState<GastoItem[]>(
    GASTOS_DEFAULT.map((c, i) => ({
      id: `def-${i}`,
      concepto: c,
      costo: 0,
      es_predefinido: true,
    }))
  )

  const totalGastos = items.reduce((acc, i) => acc + (i.costo || 0), 0)
  const saldo = costoViaje - totalGastos

  useEffect(() => {
    loadRegistros()
  }, [])

  const loadRegistros = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }

    const { data } = await supabase
      .from("gastos_viaje")
      .select("id, numero, numero_bus, fecha, costo_viaje, total_gastos, saldo, created_at")
      .order("created_at", { ascending: false })
      .limit(50)

    setRegistros(data || [])
    setLoading(false)
  }

  const updateItemCosto = (id: string, raw: string) => {
    const valor = parseCOP(raw)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, costo: valor } : i))
    )
  }

  const addGastoExtra = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}`,
        concepto: "",
        costo: 0,
        es_predefinido: false,
      },
    ])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateConcepto = (id: string, concepto: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, concepto } : i))
    )
  }

  const generarNumero = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, "0")
    const d = String(now.getDate()).padStart(2, "0")
    const r = String(Math.floor(Math.random() * 9000) + 1000)
    return `GV-${y}${m}${d}-${r}`
  }

  const handleGuardar = async () => {
    if (!numeroBus.trim()) {
      toast.error("Ingresa el número de bus")
      return
    }

    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const numero = generarNumero()
    const itemsValidos = items.filter(
      (i) => i.concepto.trim() && i.costo >= 0
    )

    const { data: gasto, error } = await supabase
      .from("gastos_viaje")
      .insert({
        numero,
        numero_bus: numeroBus.trim(),
        fecha,
        costo_viaje: costoViaje,
        total_gastos: totalGastos,
        saldo,
        observaciones: observaciones || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (error || !gasto) {
      toast.error("Error al guardar", { description: error?.message })
      setSaving(false)
      return
    }

    if (itemsValidos.length > 0) {
      await supabase.from("gastos_viaje_items").insert(
        itemsValidos.map((i) => ({
          gasto_viaje_id: gasto.id,
          concepto: i.concepto.trim(),
          costo: i.costo,
          es_predefinido: i.es_predefinido,
        }))
      )
    }

    toast.success("Factura guardada", { description: numero })
    setSaving(false)
    resetForm()
    setVista("lista")
    loadRegistros()
  }

  const resetForm = () => {
    setNumeroBus("")
    setFecha(new Date().toISOString().split("T")[0])
    setCostoViaje(0)
    setCostoViajeInput("")
    setObservaciones("")
    setItems(
      GASTOS_DEFAULT.map((c, i) => ({
        id: `def-${i}`,
        concepto: c,
        costo: 0,
        es_predefinido: true,
      }))
    )
  }

  const exportPDF = async () => {
    if (!previewRef.current) return
    try {
      const html2canvas = (await import("html2canvas")).default
      const { jsPDF } = await import("jspdf")

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      })
      const img = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(img, "PNG", 0, 0, w, h)
      pdf.save(`factura-${numeroBus || "viaje"}.pdf`)
      toast.success("PDF descargado")
    } catch {
      toast.error("Error al generar PDF. Instala: npm i html2canvas jspdf")
    }
  }

  const exportImagen = async () => {
    if (!previewRef.current) return
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      })
      const link = document.createElement("a")
      link.download = `factura-${numeroBus || "viaje"}.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      toast.success("Imagen descargada")
    } catch {
      toast.error("Error al generar imagen. Instala: npm i html2canvas jspdf")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // —— LISTA DE REGISTROS ——
  if (vista === "lista") {
    return (
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Facturas / Gastos de viaje
            </h1>
            <p className="text-muted-foreground mt-1 font-light">
              Control de costos y gastos por viaje
            </p>
          </div>
          <Button onClick={() => setVista("nueva")}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva factura
          </Button>
        </div>

        {registros.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                Aún no hay facturas registradas
              </p>
              <Button className="mt-4" onClick={() => setVista("nueva")}>
                Crear la primera
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {registros.map((r) => (
              <Card key={r.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{r.numero}</p>
                    <p className="text-sm text-muted-foreground">
                      Bus {r.numero_bus} · {r.fecha}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>
                      Viaje:{" "}
                      <span className="font-medium">
                        {formatCOP(Number(r.costo_viaje))}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Gastos: {formatCOP(Number(r.total_gastos))}
                    </p>
                    <p
                      className={
                        Number(r.saldo) >= 0
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      Saldo: {formatCOP(Number(r.saldo))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // —— FORMULARIO + PREVIEW ——
  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="sm" onClick={() => setVista("lista")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Nueva factura de viaje
          </h1>
          <p className="text-sm text-muted-foreground">
            Completa los datos y exporta en PDF o imagen
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Formulario */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datos del viaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Número de bus *</Label>
                <Input
                  value={numeroBus}
                  onChange={(e) => setNumeroBus(e.target.value)}
                  placeholder="Ej: BUS-01 o placa"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Costo del viaje</Label>
                <Input
                  value={costoViajeInput}
                  onChange={(e) => {
                    setCostoViajeInput(e.target.value)
                    setCostoViaje(parseCOP(e.target.value))
                  }}
                  onBlur={() =>
                    setCostoViajeInput(
                      costoViaje ? formatCOP(costoViaje) : ""
                    )
                  }
                  onFocus={() =>
                    setCostoViajeInput(
                      costoViaje ? String(costoViaje) : ""
                    )
                  }
                  placeholder="$0"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Detalle de gastos</CardTitle>
                <CardDescription>
                  Predefinidos + gastos adicionales
                </CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addGastoExtra}>
                <Plus className="h-4 w-4 mr-1" />
                Gasto extra
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  {item.es_predefinido ? (
                    <span className="w-28 text-sm font-medium shrink-0">
                      {item.concepto}
                    </span>
                  ) : (
                    <Input
                      className="w-28 shrink-0"
                      placeholder="Concepto"
                      value={item.concepto}
                      onChange={(e) =>
                        updateConcepto(item.id, e.target.value)
                      }
                    />
                  )}
                  <Input
                    className="flex-1"
                    placeholder="$0"
                    defaultValue={item.costo ? formatCOP(item.costo) : ""}
                    onBlur={(e) => {
                      updateItemCosto(item.id, e.target.value)
                      e.target.value = parseCOP(e.target.value)
                        ? formatCOP(parseCOP(e.target.value))
                        : ""
                    }}
                  />
                  {!item.es_predefinido && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="pt-3 border-t space-y-1 text-sm">
                <div className="flex justify-between font-medium">
                  <span>Sumatoria de gastos</span>
                  <span>{formatCOP(totalGastos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Saldo del viaje</span>
                  <span
                    className={
                      saldo >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                    }
                  >
                    {formatCOP(saldo)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                placeholder="Notas del viaje..."
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGuardar} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar factura
            </Button>
            <Button type="button" variant="outline" onClick={exportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button type="button" variant="outline" onClick={exportImagen}>
              <ImageIcon className="mr-2 h-4 w-4" />
              Exportar imagen
            </Button>
          </div>
        </div>

        {/* Preview tipo factura */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Vista previa</p>
          <div
            ref={previewRef}
            className="bg-white text-black rounded-lg border shadow-sm p-6 space-y-4"
          >
            <div className="bg-[#1e3a5f] text-white text-center py-3 rounded">
              <h2 className="font-bold text-sm tracking-wide">
                FACTURA / CONTROL DE GASTOS DE VIAJE
              </h2>
              <p className="text-xs opacity-80 mt-0.5">
                Facturas TBS Burbujas
              </p>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between border-b border-dashed py-1">
                <span className="text-gray-600">Número de bus:</span>
                <span className="font-medium">{numeroBus || "—"}</span>
              </div>
              <div className="flex justify-between border-b border-dashed py-1">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-medium">{fecha}</span>
              </div>
              <div className="flex justify-between border-b border-dashed py-1">
                <span className="text-gray-600">Costo del viaje:</span>
                <span className="font-medium">{formatCOP(costoViaje)}</span>
              </div>
            </div>

            <div>
              <div className="bg-[#1e3a5f] text-white text-center text-xs font-semibold py-1.5 rounded-t">
                DETALLE DE GASTOS
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-sky-100">
                    <th className="text-left py-1.5 px-2 font-medium">
                      Concepto
                    </th>
                    <th className="text-right py-1.5 px-2 font-medium">
                      Costo ($)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) => i.concepto.trim())
                    .map((item) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-1.5 px-2">{item.concepto}</td>
                        <td className="py-1.5 px-2 text-right">
                          {formatCOP(item.costo)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="bg-green-100 flex justify-between py-2 px-2 text-sm font-semibold">
                <span>SUMATORIA DE GASTOS</span>
                <span>{formatCOP(totalGastos)}</span>
              </div>
            </div>

            <div className="bg-sky-50 flex justify-between py-2 px-2 text-sm font-medium rounded">
              <span>Saldo del viaje (costo − gastos)</span>
              <span>{formatCOP(saldo)}</span>
            </div>

            {observaciones && (
              <div className="text-sm">
                <p className="text-gray-600 mb-1">Observaciones:</p>
                <p className="bg-sky-50 rounded p-2">{observaciones}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}