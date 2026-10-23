"use client"

import Image from "next/image"
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    ChevronDown,
    FileDown,
    ImageIcon,
    Share2,
    ArrowLeft,
} from "lucide-react"
import Link from "next/link"

const GASTOS_DEFAULT = ["Comida", "Hotel", "ACPM", "Parqueo", "Lavado"]

type GastoItem = {
    id: string
    concepto: string
    costo: number
    es_predefinido: boolean
}

type ItemGuardado = {
    concepto: string
    costo: number
}

type Registro = {
    id: string
    numero: string
    numero_bus: string | null
    fecha: string
    origen: string | null
    destino: string | null
    costo_viaje: number
    total_gastos: number
    saldo: number
    observaciones: string | null
    responsable_nombre: string | null
    pago_responsable: number
    segundo_chofer_nombre: string | null
    pago_segundo_chofer: number
    pago_ayudante: number
    items: ItemGuardado[]
    created_at: string

}



export default function FacturasPage() {
    const router = useRouter()
    const previewRef = useRef<HTMLDivElement>(null)

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [registros, setRegistros] = useState<Registro[]>([])
    const [vista, setVista] = useState<"lista" | "nueva" | "ver">("lista")
    const [facturaActual, setFacturaActual] = useState<Registro | null>(null)

    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [nombreUsuario, setNombreUsuario] = useState("")

    // Formulario
    const [numeroBus, setNumeroBus] = useState("")
    const [fecha, setFecha] = useState("")
    const [origen, setOrigen] = useState("")
    const [destino, setDestino] = useState("")
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

    // Pago del responsable
    const [pagoResponsable, setPagoResponsable] = useState(0)
    const [pagoResponsableInput, setPagoResponsableInput] = useState("")

    // Segundo chofer (nombre libre)
    const [tieneSegundoChofer, setTieneSegundoChofer] = useState(false)
    const [nombreSegundoChofer, setNombreSegundoChofer] = useState("")
    const [pagoSegundoChofer, setPagoSegundoChofer] = useState(0)
    const [pagoSegundoChoferInput, setPagoSegundoChoferInput] = useState("")

    // Ayudante (opcional, sin nombre)
    const [incluyeAyudante, setIncluyeAyudante] = useState(false)
    const [pagoAyudante, setPagoAyudante] = useState(0)
    const [pagoAyudanteInput, setPagoAyudanteInput] = useState("")

    const [conductores, setConductores] = useState<
        { id: string; nombres: string; apellidos: string }[]
    >([])

    const totalGastosItems = items.reduce((acc, i) => acc + (i.costo || 0), 0)
    const totalPagos =
        (pagoResponsable || 0) +
        (tieneSegundoChofer ? pagoSegundoChofer || 0 : 0) +
        (incluyeAyudante ? pagoAyudante || 0 : 0)
    const totalGastos = totalGastosItems + totalPagos
    const saldo = costoViaje - totalGastos

    const lineasGastos = [
        ...(pagoResponsable > 0
            ? [
                {
                    concepto: `Porcentaje Conductor 1: ${nombreUsuario || "Usuario"}`,
                    costo: pagoResponsable,
                },
            ]
            : []),
        ...(tieneSegundoChofer && pagoSegundoChofer > 0
            ? [
                {
                    concepto: `Porcentaje Conductor 2: ${nombreSegundoChofer.trim() || "—"}`,
                    costo: pagoSegundoChofer,
                },
            ]
            : []),
        ...(incluyeAyudante && pagoAyudante > 0
            ? [{ concepto: "Porcentaje a Auxiliar", costo: pagoAyudante }]
            : []),
        ...items.filter((i) => i.concepto.trim()),
    ]

    // Exportar
    const [exportando, setExportando] = useState(false)
    const [mostrarCompartir, setMostrarCompartir] = useState(false)
    const [ultimoArchivo, setUltimoArchivo] = useState<{
        tipo: "pdf" | "png"
        nombre: string
    } | null>(null)

    useEffect(() => {
        setFecha(new Date().toISOString().split("T")[0])
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


        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single()

        setNombreUsuario(profile?.full_name || user.email?.split("@")[0] || "")

        const { data: listaConductores } = await supabase
            .from("conductores")
            .select("id, nombres, apellidos")
            .eq("estado", "activo")
            .order("nombres")

        setConductores(listaConductores || [])

        const { data: conductor } = await supabase
            .from("conductores")
            .select("foto_url, nombres, apellidos")
            .eq("user_id", user.id)
            .single()

        if (conductor?.foto_url) {
            setAvatarUrl(conductor.foto_url)
        }
        if (conductor?.nombres) {
            setNombreUsuario(`${conductor.nombres} ${conductor.apellidos}`)
        }

        const { data, error } = await supabase
            .from("facturas_viaje")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(50)

        if (error) {
            console.error("Error cargando facturas:", error)
            toast.error("No se pudieron cargar las facturas", {
                description: error.message,
            })
            setRegistros([])
        } else {
            setRegistros((data || []) as Registro[])
        }

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

    const handleGuardarYExportar = async (formato: "pdf" | "png") => {
        if (!numeroBus.trim()) {
            toast.error("Ingresa el número de bus")
            return
        }

        setExportando(true)
        const supabase = createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            setExportando(false)
            return
        }

        const numero = generarNumero()

        const itemsParaGuardar: ItemGuardado[] = [
            ...items
                .filter((i) => i.concepto.trim())
                .map((i) => ({ concepto: i.concepto.trim(), costo: i.costo })),
        ]

        if (pagoResponsable > 0) {
            itemsParaGuardar.unshift({
                concepto: `Pago responsable: ${nombreUsuario || "Usuario"}`,
                costo: pagoResponsable,
            })
        }
        if (tieneSegundoChofer && pagoSegundoChofer > 0) {
            itemsParaGuardar.push({
                concepto: `Pago segundo chofer: ${nombreSegundoChofer.trim() || "—"}`,
                costo: pagoSegundoChofer,
            })
        }
        if (incluyeAyudante && pagoAyudante > 0) {
            itemsParaGuardar.push({
                concepto: "Pago a Auxiliar",
                costo: pagoAyudante,
            })
        }

        const { data: factura, error } = await supabase
            .from("facturas_viaje")
            .insert({
                numero,
                numero_bus: numeroBus.trim(),
                fecha,
                origen: origen.trim() || null,
                destino: destino.trim() || null,
                costo_viaje: costoViaje,
                total_gastos: totalGastos,
                saldo,
                observaciones: observaciones || null,
                responsable_nombre: nombreUsuario || null,
                pago_responsable: pagoResponsable || 0,
                segundo_chofer_nombre: tieneSegundoChofer
                    ? nombreSegundoChofer.trim() || null
                    : null,
                pago_segundo_chofer: tieneSegundoChofer ? pagoSegundoChofer || 0 : 0,
                pago_ayudante: incluyeAyudante ? pagoAyudante || 0 : 0,
                items: itemsParaGuardar,
                created_by: user.id,
            })
            .select()
            .single()

        if (error || !factura) {
            toast.error("Error al guardar", { description: error?.message })
            setExportando(false)
            return
        }

        toast.success("Factura guardada", { description: numero })

        // Exportar
        try {
            if (formato === "pdf") {
                await exportPDF()
            } else {
                await exportImagen()
            }
            setUltimoArchivo({
                tipo: formato,
                nombre: `factura-${numeroBus || "viaje"}-${fecha || "sin-fecha"}`,
            })
            setMostrarCompartir(true)
        } catch (e) {
            console.error(e)
            toast.error("Se guardó, pero falló la exportación")
        }

        setExportando(false)
        setMostrarCompartir(false)
        resetForm()
        setVista("lista")
        loadRegistros()
    }

    const resetForm = () => {
        setNumeroBus("")
        setFecha(new Date().toISOString().split("T")[0])
        setOrigen("")
        setDestino("")
        setCostoViaje(0)
        setCostoViajeInput("")
        setObservaciones("")
        setPagoResponsable(0)
        setPagoResponsableInput("")
        setTieneSegundoChofer(false)
        setNombreSegundoChofer("")
        setPagoSegundoChofer(0)
        setPagoSegundoChoferInput("")
        setIncluyeAyudante(false)
        setPagoAyudante(0)
        setPagoAyudanteInput("")
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
        try {
            const { jsPDF } = await import("jspdf")
            const doc = new jsPDF("p", "mm", "a4")

            const margin = 18
            const pageWidth = doc.internal.pageSize.getWidth()
            const contentWidth = pageWidth - margin * 2
            let y = 18

            // ——— LOGO (futuro) ———
            // Cuando tengas el logo en public/ o una URL:
            // const logoUrl = "/logo-tbs.png"
            // const logoBase64 = await fetch(logoUrl).then(r => r.blob()).then(...)
            // doc.addImage(logoBase64, "PNG", margin, 12, 22, 22)
            // y = 38

            // Avatar responsable (derecha)
            if (avatarUrl) {
                try {
                    const res = await fetch(avatarUrl)
                    const blob = await res.blob()
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(reader.result as string)
                        reader.onerror = reject
                        reader.readAsDataURL(blob)
                    })
                    doc.addImage(base64, "JPEG", pageWidth - margin - 18, 12, 18, 18)
                } catch {
                    // sin avatar
                }
            }

            // Encabezado
            doc.setFont("helvetica", "bold")
            doc.setFontSize(16)
            doc.setTextColor(20)
            doc.text("Facturas TBS Burbujas", margin, y)
            y += 7

            doc.setFont("helvetica", "normal")
            doc.setFontSize(10)
            doc.setTextColor(120)
            doc.text("Control de gastos de viaje", margin, y)
            y += 6

            if (nombreUsuario) {
                doc.setFontSize(9)
                doc.text(`Responsable: ${nombreUsuario}`, margin, y)
                y += 5
            }

            y += 3
            doc.setDrawColor(210)
            doc.setLineWidth(0.3)
            doc.line(margin, y, pageWidth - margin, y)
            y += 9

            // Datos del viaje
            doc.setTextColor(30)
            doc.setFontSize(11)
            const datos = [
                ["Bus", numeroBus || "—"],
                ["Fecha", fecha || "—"],
                ["Ruta", origen || destino ? `${origen || "—"} - ${destino || "—"}` : "—"],
                ["Costo del viaje", formatCOP(costoViaje)],
            ]
            datos.forEach(([label, value]) => {
                doc.setFont("helvetica", "normal")
                doc.setTextColor(110)
                doc.text(`${label}:`, margin, y)
                doc.setFont("helvetica", "bold")
                doc.setTextColor(30)
                doc.text(String(value), margin + 42, y)
                y += 7
            })

            y += 4
            doc.setFont("helvetica", "bold")
            doc.setFontSize(12)
            doc.setTextColor(20)
            doc.text("Detalle de gastos", margin, y)
            y += 8

            doc.setFont("helvetica", "normal")
            doc.setFontSize(11)

            if (lineasGastos.length === 0) {
                doc.setTextColor(150)
                doc.text("Sin gastos registrados", margin, y)
                y += 8
            } else {
                lineasGastos.forEach((item) => {
                    if (y > 265) {
                        doc.addPage()
                        y = 20
                    }
                    doc.setTextColor(50)
                    doc.setFont("helvetica", "normal")
                    const concepto = doc.splitTextToSize(item.concepto, contentWidth - 40)
                    doc.text(concepto, margin, y)
                    doc.setFont("helvetica", "bold")
                    doc.text(formatCOP(item.costo), pageWidth - margin, y, {
                        align: "right",
                    })
                    y += Math.max(7, concepto.length * 5.5)
                })
            }

            y += 3
            doc.setDrawColor(210)
            doc.line(margin, y, pageWidth - margin, y)
            y += 8

            doc.setFont("helvetica", "bold")
            doc.setFontSize(11)
            doc.setTextColor(40)
            doc.text("Sumatoria de gastos", margin, y)
            doc.text(formatCOP(totalGastos), pageWidth - margin, y, { align: "right" })
            y += 8

            doc.setFontSize(12)
            doc.text("Saldo del viaje", margin, y)
            if (saldo >= 0) doc.setTextColor(5, 150, 105)
            else doc.setTextColor(220, 38, 38)
            doc.text(formatCOP(saldo), pageWidth - margin, y, { align: "right" })
            y += 12

            doc.setTextColor(30)
            if (observaciones.trim()) {
                doc.setFont("helvetica", "bold")
                doc.setFontSize(11)
                doc.text("Observaciones", margin, y)
                y += 6
                doc.setFont("helvetica", "normal")
                doc.setFontSize(10)
                doc.setTextColor(70)
                const lines = doc.splitTextToSize(observaciones, contentWidth)
                doc.text(lines, margin, y)
                y += lines.length * 5 + 8
            }

            // Pie
            y = Math.max(y + 6, 280)
            doc.setDrawColor(230)
            doc.line(margin, y, pageWidth - margin, y)
            y += 5
            doc.setFontSize(8)
            doc.setTextColor(150)
            doc.setFont("helvetica", "normal")
            doc.text(
                "Facturas TBS Burbujas · Documento de control interno",
                pageWidth / 2,
                y,
                { align: "center" }
            )

            doc.save(`factura-${numeroBus || "viaje"}-${fecha || "sin-fecha"}.pdf`)
            toast.success("PDF descargado")
        } catch (err) {
            console.error("PDF error:", err)
            toast.error("Error al generar PDF", {
                description: err instanceof Error ? err.message : "Error desconocido",
            })
        }
    }

    const exportImagen = async () => {
        try {
            const scale = 2
            const width = 900
            const padding = 48
            const contentW = width - padding * 2

            // Altura dinámica según contenido
            const lineHeight = 28
            const extraObs = observaciones.trim()
                ? Math.ceil(observaciones.length / 55) * 22 + 40
                : 0
            const height = Math.max(
                720,
                280 + lineasGastos.length * lineHeight + extraObs + 120
            )

            const canvas = document.createElement("canvas")
            canvas.width = width * scale
            canvas.height = height * scale
            const ctx = canvas.getContext("2d")
            if (!ctx) throw new Error("No se pudo crear el canvas")

            ctx.scale(scale, scale)

            // Fondo
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, width, height)

            let y = padding

            // ——— LOGO (futuro) ———
            // const logo = new Image()
            // logo.crossOrigin = "anonymous"
            // logo.src = "/logo-tbs.png"
            // await new Promise(...)
            // ctx.drawImage(logo, padding, y, 48, 48)
            // luego desplaza el texto a la derecha

            // Avatar
            if (avatarUrl) {
                try {
                    const img = new window.Image()
                    img.crossOrigin = "anonymous"
                    await new Promise<void>((resolve, reject) => {
                        img.onload = () => resolve()
                        img.onerror = reject
                        img.src = avatarUrl!
                    })
                    const ax = width - padding - 52
                    const ay = padding
                    ctx.save()
                    ctx.beginPath()
                    ctx.arc(ax + 26, ay + 26, 26, 0, Math.PI * 2)
                    ctx.closePath()
                    ctx.clip()
                    ctx.drawImage(img, ax, ay, 52, 52)
                    ctx.restore()
                    // borde sutil
                    ctx.beginPath()
                    ctx.arc(ax + 26, ay + 26, 26, 0, Math.PI * 2)
                    ctx.strokeStyle = "#e5e5e5"
                    ctx.lineWidth = 1.5
                    ctx.stroke()
                } catch {
                    // sin avatar
                }
            }

            // Título
            ctx.fillStyle = "#111111"
            ctx.font = "600 26px system-ui, -apple-system, sans-serif"
            ctx.fillText("Facturas TBS Burbujas", padding, y + 22)
            y += 42

            ctx.fillStyle = "#9ca3af"
            ctx.font = "400 14px system-ui, sans-serif"
            ctx.fillText("Control de gastos de viaje", padding, y)
            y += 22

            if (nombreUsuario) {
                ctx.fillStyle = "#6b7280"
                ctx.font = "400 13px system-ui, sans-serif"
                ctx.fillText(`Responsable: ${nombreUsuario}`, padding, y)
                y += 20
            }

            // Línea
            y += 8
            ctx.strokeStyle = "#e5e5e5"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(width - padding, y)
            ctx.stroke()
            y += 28

            // Datos
            const datos: [string, string][] = [
                ["Bus", numeroBus || "—"],
                ["Fecha", fecha || "—"],
                ["Ruta", origen || destino ? `${origen || "—"} - ${destino || "—"}` : "—"],
                ["Costo del viaje", formatCOP(costoViaje)],
            ]
            datos.forEach(([label, value]) => {
                ctx.font = "400 15px system-ui, sans-serif"
                ctx.fillStyle = "#9ca3af"
                ctx.fillText(`${label}`, padding, y)
                ctx.font = "600 15px system-ui, sans-serif"
                ctx.fillStyle = "#171717"
                ctx.fillText(value, padding + 140, y)
                y += 26
            })

            y += 16
            ctx.fillStyle = "#111111"
            ctx.font = "600 17px system-ui, sans-serif"
            ctx.fillText("Detalle de gastos", padding, y)
            y += 28

            if (lineasGastos.length === 0) {
                ctx.fillStyle = "#d1d5db"
                ctx.font = "400 15px system-ui, sans-serif"
                ctx.fillText("Sin gastos registrados", padding, y)
                y += 24
            } else {
                lineasGastos.forEach((item) => {
                    ctx.font = "400 15px system-ui, sans-serif"
                    ctx.fillStyle = "#404040"
                    ctx.fillText(item.concepto, padding, y)

                    const valor = formatCOP(item.costo)
                    ctx.font = "600 15px system-ui, sans-serif"
                    ctx.fillStyle = "#171717"
                    const tw = ctx.measureText(valor).width
                    ctx.fillText(valor, width - padding - tw, y)
                    y += lineHeight
                })
            }

            y += 8
            ctx.strokeStyle = "#e5e5e5"
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(width - padding, y)
            ctx.stroke()
            y += 28

            // Totales
            ctx.font = "600 15px system-ui, sans-serif"
            ctx.fillStyle = "#404040"
            ctx.fillText("Sumatoria de gastos", padding, y)
            let v = formatCOP(totalGastos)
            ctx.fillStyle = "#171717"
            ctx.fillText(v, width - padding - ctx.measureText(v).width, y)
            y += 32

            // Caja saldo
            const boxH = 44
            ctx.fillStyle = "#fafafa"
            ctx.strokeStyle = "#eeeeee"
            ctx.lineWidth = 1
            roundRect(ctx, padding, y - 8, contentW, boxH, 10)
            ctx.fill()
            ctx.stroke()

            ctx.font = "600 16px system-ui, sans-serif"
            ctx.fillStyle = "#171717"
            ctx.fillText("Saldo del viaje", padding + 16, y + 20)
            v = formatCOP(saldo)
            ctx.fillStyle = saldo >= 0 ? "#059669" : "#dc2626"
            ctx.fillText(v, width - padding - 16 - ctx.measureText(v).width, y + 20)
            y += boxH + 20

            if (observaciones.trim()) {
                ctx.fillStyle = "#9ca3af"
                ctx.font = "500 12px system-ui, sans-serif"
                ctx.fillText("OBSERVACIONES", padding, y)
                y += 20
                ctx.fillStyle = "#525252"
                ctx.font = "400 14px system-ui, sans-serif"
                const words = observaciones.split(" ")
                let line = ""
                for (const w of words) {
                    const test = line ? `${line} ${w}` : w
                    if (ctx.measureText(test).width > contentW) {
                        ctx.fillText(line, padding, y)
                        y += 20
                        line = w
                    } else {
                        line = test
                    }
                }
                if (line) {
                    ctx.fillText(line, padding, y)
                    y += 24
                }
            }

            // Pie
            y = Math.max(y + 16, height - 40)
            ctx.strokeStyle = "#f0f0f0"
            ctx.beginPath()
            ctx.moveTo(padding, y)
            ctx.lineTo(width - padding, y)
            ctx.stroke()
            y += 18
            ctx.fillStyle = "#c4c4c4"
            ctx.font = "400 11px system-ui, sans-serif"
            const footer = "Facturas TBS Burbujas · Documento de control interno"
            ctx.fillText(
                footer,
                (width - ctx.measureText(footer).width) / 2,
                y
            )

            const link = document.createElement("a")
            link.download = `factura-${numeroBus || "viaje"}-${fecha || "sin-fecha"}.png`
            link.href = canvas.toDataURL("image/png")
            link.click()
            toast.success("Imagen descargada")
        } catch (err) {
            console.error("Imagen error:", err)
            toast.error("Error al generar imagen", {
                description: err instanceof Error ? err.message : "Error desconocido",
            })
        }
    }

    /** Helper para rectángulos redondeados en canvas */
    function roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ) {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + w, y, x + w, y + h, r)
        ctx.arcTo(x + w, y + h, x, y + h, r)
        ctx.arcTo(x, y + h, x, y, r)
        ctx.arcTo(x, y, x + w, y, r)
        ctx.closePath()
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // —— VISUALIZADOR DE FACTURA GUARDADA ——
    if (vista === "ver" && facturaActual) {
        const itemsVer: ItemGuardado[] = Array.isArray(facturaActual.items)
            ? facturaActual.items
            : []

        return (
            <div className="container mx-auto px-4 py-10 max-w-2xl">
                <div className="flex items-center justify-between gap-3 mb-8">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setMostrarCompartir(false)
                                resetForm()
                                setFacturaActual(null)
                                setVista("lista")
                                loadRegistros()
                            }}
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Volver
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {facturaActual.numero}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Factura guardada · solo lectura
                            </p>
                        </div>
                    </div>
                </div>

                {/* Mismo diseño minimalista de la preview */}
                <div className="bg-white text-neutral-900 rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 font-medium">
                            Control de gastos de viaje
                        </p>
                        <h2 className="text-lg font-semibold tracking-tight mt-1">
                            Facturas TBS Burbujas
                        </h2>
                        {facturaActual.responsable_nombre && (
                            <p className="text-sm text-neutral-500 mt-2">
                                Responsable: {facturaActual.responsable_nombre}
                            </p>
                        )}
                    </div>

                    <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-[11px] text-neutral-400 mb-0.5">Bus</p>
                            <p className="font-medium">{facturaActual.numero_bus || "—"}</p>
                        </div>
                        <div>
                            <p className="text-[11px] text-neutral-400 mb-0.5">Fecha</p>
                            <p className="font-medium">{facturaActual.fecha}</p>
                        </div>
                        <div>
                            <div>
                                <p className="text-[11px] text-neutral-400 mb-0.5">Ruta</p>
                                <p className="font-medium">
                                    {facturaActual.origen || facturaActual.destino
                                        ? `${facturaActual.origen || "—"} - ${facturaActual.destino || "—"}`
                                        : "—"}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] text-neutral-400 mb-0.5">Costo del viaje</p>
                            <p className="font-semibold">
                                {formatCOP(Number(facturaActual.costo_viaje))}
                            </p>
                        </div>
                    </div>

                    <div className="px-6 pb-4">
                        <div className="rounded-lg border border-neutral-100 overflow-hidden">
                            <div className="bg-neutral-50 px-3 py-2 flex justify-between text-[11px] uppercase tracking-wide text-neutral-400 font-medium">
                                <span>Concepto</span>
                                <span>Valor</span>
                            </div>
                            <div className="divide-y divide-neutral-50">
                                {itemsVer.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-sm text-neutral-300">
                                        Sin gastos registrados
                                    </div>
                                ) : (
                                    itemsVer.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="px-3 py-2.5 flex justify-between text-sm"
                                        >
                                            <span className="text-neutral-600">{item.concepto}</span>
                                            <span className="font-medium tabular-nums">
                                                {formatCOP(Number(item.costo))}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="px-6 pb-5 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-neutral-500">Sumatoria de gastos</span>
                            <span className="font-medium tabular-nums">
                                {formatCOP(Number(facturaActual.total_gastos))}
                            </span>
                        </div>
                        <div className="flex justify-between items-center rounded-lg bg-neutral-50 px-3 py-2.5">
                            <span className="text-sm font-medium">Saldo del viaje</span>
                            <span
                                className={`text-sm font-semibold tabular-nums ${Number(facturaActual.saldo) >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                    }`}
                            >
                                {formatCOP(Number(facturaActual.saldo))}
                            </span>
                        </div>
                    </div>

                    {facturaActual.observaciones && (
                        <div className="px-6 pb-5">
                            <p className="text-[11px] text-neutral-400 mb-1">Observaciones</p>
                            <p className="text-sm text-neutral-600 leading-relaxed">
                                {facturaActual.observaciones}
                            </p>
                        </div>
                    )}

                    <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/80">
                        <p className="text-[10px] text-neutral-400 text-center">
                            Facturas TBS Burbujas · Documento de control interno
                        </p>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                    Para exportar PDF/imagen, usa el formulario al crear la factura.
                    (Luego podemos reutilizar las mismas funciones aquí.)
                </p>
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

                {registros.map((r) => (
                    <Card
                        key={r.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                            setFacturaActual(r)
                            setVista("ver")
                        }}
                    >
                        <CardContent className="py-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="font-medium">{r.numero}</p>
                                <p className="text-sm text-muted-foreground">
                                    Bus {r.numero_bus} · {r.fecha}
                                    {(r.origen || r.destino) && (
                                        <> · {r.origen || "—"} - {r.destino || "—"}</>
                                    )}
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Origen</Label>
                                    <Input
                                        value={origen}
                                        onChange={(e) => setOrigen(e.target.value)}
                                        placeholder="Ej: Barranquilla"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Destino</Label>
                                    <Input
                                        value={destino}
                                        onChange={(e) => setDestino(e.target.value)}
                                        placeholder="Ej: Bogotá"
                                    />
                                </div>
                                {/* Vista rápida de la ruta */}
                                {(origen || destino) && (
                                    <p className="text-sm text-muted-foreground">
                                        Ruta:{" "}
                                        <span className="font-medium text-foreground">
                                            {origen || "—"} - {destino || "—"}
                                        </span>
                                    </p>
                                )}
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

                    {/* Pago de chofer / ayudante */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Pagos de choferes</CardTitle>
                            <CardDescription>
                                Responsable, segundo chofer y ayudante (opcional)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {/* Responsable */}
                            <div className="space-y-2">
                                <Label>Responsable (quien crea la factura)</Label>
                                <Input
                                    value={nombreUsuario || "Usuario"}
                                    disabled
                                    className="bg-muted"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Paga del responsable</Label>
                                <Input
                                    value={pagoResponsableInput}
                                    onChange={(e) => {
                                        setPagoResponsableInput(e.target.value)
                                        setPagoResponsable(parseCOP(e.target.value))
                                    }}
                                    onBlur={() =>
                                        setPagoResponsableInput(
                                            pagoResponsable ? formatCOP(pagoResponsable) : ""
                                        )
                                    }
                                    onFocus={() =>
                                        setPagoResponsableInput(
                                            pagoResponsable ? String(pagoResponsable) : ""
                                        )
                                    }
                                    placeholder="$0"
                                />
                            </div>

                            {/* Segundo chofer */}
                            <div className="border-t pt-4 space-y-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={tieneSegundoChofer}
                                        onChange={(e) => {
                                            setTieneSegundoChofer(e.target.checked)
                                            if (!e.target.checked) {
                                                setNombreSegundoChofer("")
                                                setPagoSegundoChofer(0)
                                                setPagoSegundoChoferInput("")
                                            }
                                        }}
                                        className="size-4 rounded border-input accent-primary"
                                    />
                                    Este viaje lleva segundo chofer
                                </label>

                                {tieneSegundoChofer && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Nombre completo del segundo chofer</Label>
                                            <Input
                                                value={nombreSegundoChofer}
                                                onChange={(e) => setNombreSegundoChofer(e.target.value)}
                                                placeholder="Ej: Juan Pérez Gómez"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Paga del segundo chofer</Label>
                                            <Input
                                                value={pagoSegundoChoferInput}
                                                onChange={(e) => {
                                                    setPagoSegundoChoferInput(e.target.value)
                                                    setPagoSegundoChofer(parseCOP(e.target.value))
                                                }}
                                                onBlur={() =>
                                                    setPagoSegundoChoferInput(
                                                        pagoSegundoChofer ? formatCOP(pagoSegundoChofer) : ""
                                                    )
                                                }
                                                onFocus={() =>
                                                    setPagoSegundoChoferInput(
                                                        pagoSegundoChofer ? String(pagoSegundoChofer) : ""
                                                    )
                                                }
                                                placeholder="$0"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Ayudante */}
                            <div className="border-t pt-4 space-y-3">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={incluyeAyudante}
                                        onChange={(e) => {
                                            setIncluyeAyudante(e.target.checked)
                                            if (!e.target.checked) {
                                                setPagoAyudante(0)
                                                setPagoAyudanteInput("")
                                            }
                                        }}
                                        className="size-4 rounded border-input accent-primary"
                                    />
                                    Incluir pago de ayudante
                                </label>

                                {incluyeAyudante && (
                                    <div className="space-y-2">
                                        <Label>Paga del ayudante</Label>
                                        <Input
                                            value={pagoAyudanteInput}
                                            onChange={(e) => {
                                                setPagoAyudanteInput(e.target.value)
                                                setPagoAyudante(parseCOP(e.target.value))
                                            }}
                                            onBlur={() =>
                                                setPagoAyudanteInput(
                                                    pagoAyudante ? formatCOP(pagoAyudante) : ""
                                                )
                                            }
                                            onFocus={() =>
                                                setPagoAyudanteInput(
                                                    pagoAyudante ? String(pagoAyudante) : ""
                                                )
                                            }
                                            placeholder="$0"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            No requiere nombre
                                        </p>
                                    </div>
                                )}
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
                        <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium shadow-xs hover:opacity-90 disabled:opacity-50">
                                {exportando ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <FileDown className="h-4 w-4" />
                                )}
                                Guardar y exportar
                                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={exportando}
                                    onClick={() => handleGuardarYExportar("pdf")}
                                >
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Guardar + PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    disabled={exportando}
                                    onClick={() => handleGuardarYExportar("png")}
                                >
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Guardar + PNG
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Preview minimalista */}
                <div>
                    <p className="text-sm text-muted-foreground mb-3">Vista previa</p>
                    <div
                        ref={previewRef}
                        className="bg-white text-neutral-900 rounded-xl border border-neutral-200 shadow-sm overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400 font-medium">
                                        Control de gastos de viaje
                                    </p>
                                    <h2 className="text-lg font-semibold tracking-tight mt-1">
                                        Facturas TBS Burbujas
                                    </h2>
                                </div>

                                {/* Avatar */}
                                <div className="flex items-center gap-2.5">
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                                        {avatarUrl ? (
                                            <Image
                                                src={avatarUrl}
                                                alt={nombreUsuario}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm font-medium">
                                                {nombreUsuario?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs font-medium text-neutral-800 leading-tight">
                                            {nombreUsuario || "Usuario"}
                                        </p>
                                        <p className="text-[10px] text-neutral-400">Responsable</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Datos del viaje */}
                        <div className="px-6 py-4 grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-[11px] text-neutral-400 mb-0.5">Bus</p>
                                <p className="font-medium">{numeroBus || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-neutral-400 mb-0.5">Fecha</p>
                                <p className="font-medium">{fecha || "—"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-neutral-400 mb-0.5">Ruta</p>
                                <p className="font-medium">
                                    {origen || destino
                                        ? `${origen || "—"} - ${destino || "—"}`
                                        : "—"}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] text-neutral-400 mb-0.5">Costo del viaje</p>
                                <p className="font-semibold">{formatCOP(costoViaje)}</p>
                            </div>
                        </div>

                        {/* Tabla de gastos */}
                        <div className="px-6 pb-4">
                            <div className="rounded-lg border border-neutral-100 overflow-hidden">
                                <div className="bg-neutral-50 px-3 py-2 flex justify-between text-[11px] uppercase tracking-wide text-neutral-400 font-medium">
                                    <span>Concepto</span>
                                    <span>Valor</span>
                                </div>
                                <div className="divide-y divide-neutral-50">
                                    {lineasGastos.map((item, idx) => (
                                        <div key={idx} className="px-3 py-2.5 flex justify-between text-sm">
                                            <span className="text-neutral-600">{item.concepto}</span>
                                            <span className="font-medium tabular-nums">
                                                {formatCOP(item.costo)}
                                            </span>
                                        </div>
                                    ))}
                                    {lineasGastos.length === 0 && (
                                        <div className="px-3 py-6 text-center text-sm text-neutral-300">
                                            Sin gastos registrados
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Totales */}
                        <div className="px-6 pb-5 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-500">Sumatoria de gastos</span>
                                <span className="font-medium tabular-nums">
                                    {formatCOP(totalGastos)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center rounded-lg bg-neutral-50 px-3 py-2.5">
                                <span className="text-sm font-medium">Saldo del viaje</span>
                                <span
                                    className={`text-sm font-semibold tabular-nums ${saldo >= 0 ? "text-emerald-600" : "text-red-600"
                                        }`}
                                >
                                    {formatCOP(saldo)}
                                </span>
                            </div>
                        </div>

                        {/* Observaciones */}
                        {observaciones && (
                            <div className="px-6 pb-5">
                                <p className="text-[11px] text-neutral-400 mb-1">Observaciones</p>
                                <p className="text-sm text-neutral-600 leading-relaxed">
                                    {observaciones}
                                </p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="px-6 py-3 border-t border-neutral-100 bg-neutral-50/80">
                            <p className="text-[10px] text-neutral-400 text-center">
                                Facturas TBS Burbujas · Documento de control interno
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {mostrarCompartir && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-background border rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="rounded-full bg-emerald-500/10 p-2.5">
                                <Share2 className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Documento listo</h3>
                                <p className="text-sm text-muted-foreground">
                                    {ultimoArchivo?.tipo === "pdf" ? "PDF" : "Imagen"} descargado
                                    {ultimoArchivo ? `: ${ultimoArchivo.nombre}` : ""}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            ¿Quieres compartirlo? En el móvil puedes adjuntar el archivo desde
                            WhatsApp. En el PC se abrirá el chat para enviar el mensaje.
                        </p>

                        <div className="flex flex-col gap-2">
                            <Button
                                className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white"
                                onClick={() => {
                                    const texto = encodeURIComponent(
                                        `Factura de viaje — Bus ${numeroBus || "—"} — Fecha ${fecha || "—"}\nSaldo: ${formatCOP(saldo)}\nFacturas TBS Burbujas`
                                    )
                                    // Abre WhatsApp (app o web)
                                    window.open(`https://wa.me/?text=${texto}`, "_blank")
                                }}
                            >
                                Compartir por WhatsApp
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setMostrarCompartir(false)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}