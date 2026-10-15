"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { createClient } from "@/lib/supabase/client"
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
  Moon,
  Sun,
  Monitor,
  User,
  Camera,
  Bus,
  Plus,
  Trash2,
  ImagePlus,
} from "lucide-react"
import Image from "next/image"

type Conductor = {
  id: string
  nombres: string
  apellidos: string
  telefono: string | null
  descripcion: string | null
  foto_url: string | null
  licencia: string | null
  tipo_documento: string
  numero_documento: string
}

type BusFoto = {
  id: string
  url: string
  orden: number
}

type BusType = {
  id: string
  placa: string
  marca: string | null
  modelo: string | null
  año: number | null
  capacidad_pasajeros: number | null
  tipo: string
  estado: string
  bus_fotos: BusFoto[]
}

export default function PerfilPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingFoto, setUploadingFoto] = useState(false)

  const [conductor, setConductor] = useState<Conductor | null>(null)
  const [buses, setBuses] = useState<BusType[]>([])
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")

  // Form conductor
  const [nombres, setNombres] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [telefono, setTelefono] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [licencia, setLicencia] = useState("")

  // Form nuevo bus
  const [showBusForm, setShowBusForm] = useState(false)
  const [busPlaca, setBusPlaca] = useState("")
  const [busMarca, setBusMarca] = useState("")
  const [busModelo, setBusModelo] = useState("")
  const [busAño, setBusAño] = useState("")
  const [savingBus, setSavingBus] = useState(false)

  const fotoInputRef = useRef<HTMLInputElement>(null)
  const busFotoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [])

  const loadData = async () => {
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

    if (profile) setFullName(profile.full_name || "")

    const { data: cond } = await supabase
      .from("conductores")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (cond) {
      setConductor(cond)
      setNombres(cond.nombres || "")
      setApellidos(cond.apellidos || "")
      setTelefono(cond.telefono || "")
      setDescripcion(cond.descripcion || "")
      setLicencia(cond.licencia || "")

      const { data: busesData } = await supabase
        .from("buses")
        .select("*, bus_fotos(*)")
        .eq("conductor_id", cond.id)
        .order("created_at", { ascending: false })

      setBuses(
        (busesData || []).map((b) => ({
          ...b,
          bus_fotos: (b.bus_fotos || []).sort(
            (a: BusFoto, b: BusFoto) => a.orden - b.orden
          ),
        }))
      )
    }

    setLoading(false)
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    })

    if (conductor) {
      const { error } = await supabase
        .from("conductores")
        .update({
          nombres,
          apellidos,
          telefono: telefono || null,
          descripcion: descripcion || null,
          licencia: licencia || null,
        })
        .eq("id", conductor.id)

      if (error) {
        toast.error("Error al guardar conductor", { description: error.message })
        setSaving(false)
        return
      }
    }

    toast.success("Perfil actualizado")
    setSaving(false)
    loadData()
  }

  const handleUploadFotoPerfil = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !conductor) return

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 5MB")
      return
    }

    setUploadingFoto(true)
    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${conductor.id}/perfil-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("conductores")
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error("Error al subir foto", { description: uploadError.message })
      setUploadingFoto(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("conductores").getPublicUrl(path)

    const { error } = await supabase
      .from("conductores")
      .update({ foto_url: publicUrl })
      .eq("id", conductor.id)

    if (error) {
      toast.error("Error al guardar foto")
    } else {
      toast.success("Foto de perfil actualizada")
      loadData()
    }
    setUploadingFoto(false)
  }

  const handleAddBus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conductor || !busPlaca.trim()) return

    setSavingBus(true)
    const supabase = createClient()

    const { error } = await supabase.from("buses").insert({
      placa: busPlaca.trim().toUpperCase(),
      marca: busMarca || null,
      modelo: busModelo || null,
      año: busAño ? parseInt(busAño) : null,
      conductor_id: conductor.id,
      estado: "activo",
      tipo: "bus",
    })

    if (error) {
      toast.error("Error al agregar bus", { description: error.message })
    } else {
      toast.success("Bus agregado")
      setBusPlaca("")
      setBusMarca("")
      setBusModelo("")
      setBusAño("")
      setShowBusForm(false)
      loadData()
    }
    setSavingBus(false)
  }

  const handleDeleteBus = async (busId: string) => {
    if (!confirm("¿Eliminar este bus y sus fotos?")) return
    const supabase = createClient()
    const { error } = await supabase.from("buses").delete().eq("id", busId)
    if (error) {
      toast.error("Error al eliminar bus")
    } else {
      toast.success("Bus eliminado")
      loadData()
    }
  }

  const handleUploadBusFoto = async (
    busId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const bus = buses.find((b) => b.id === busId)
    if (!bus) return

    if (bus.bus_fotos.length >= 4) {
      toast.error("Máximo 4 fotos por bus")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes")
      return
    }

    const supabase = createClient()
    const ext = file.name.split(".").pop()
    const path = `${busId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("buses")
      .upload(path, file)

    if (uploadError) {
      toast.error("Error al subir foto", { description: uploadError.message })
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("buses").getPublicUrl(path)

    const { error } = await supabase.from("bus_fotos").insert({
      bus_id: busId,
      url: publicUrl,
      orden: bus.bus_fotos.length,
    })

    if (error) {
      toast.error("Error al guardar foto")
    } else {
      toast.success("Foto del bus agregada")
      loadData()
    }
  }

  const handleDeleteBusFoto = async (fotoId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("bus_fotos").delete().eq("id", fotoId)
    if (error) {
      toast.error("Error al borrar foto")
    } else {
      toast.success("Foto eliminada")
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground mt-1 font-light">
          Administra tu cuenta, datos y buses
        </p>
      </div>

      <div className="space-y-6">
        {/* Foto de perfil */}
        {conductor && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Foto de perfil</CardTitle>
              <CardDescription>
                Esta foto se muestra en tu página pública
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted shrink-0">
                {conductor.foto_url ? (
                  <Image
                    src={conductor.foto_url}
                    alt="Foto de perfil"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadFotoPerfil}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingFoto}
                  onClick={() => fotoInputRef.current?.click()}
                >
                  {uploadingFoto ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {conductor.foto_url ? "Cambiar foto" : "Subir foto"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG o PNG, máximo 5MB
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Datos personales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Datos personales</CardTitle>
            <CardDescription>Información de tu cuenta y perfil público</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre en la cuenta</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={saving}
                />
              </div>

              {conductor && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombres">Nombres</Label>
                      <Input
                        id="nombres"
                        value={nombres}
                        onChange={(e) => setNombres(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellidos">Apellidos</Label>
                      <Input
                        id="apellidos"
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="licencia">Licencia</Label>
                    <Input
                      id="licencia"
                      value={licencia}
                      onChange={(e) => setLicencia(e.target.value)}
                      disabled={saving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción / Sobre mí</Label>
                    <Textarea
                      id="descripcion"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      rows={4}
                      placeholder="Cuéntanos sobre ti como conductor..."
                      disabled={saving}
                    />
                  </div>
                </>
              )}

              {!conductor && (
                <p className="text-sm text-muted-foreground">
                  Tu cuenta aún no está vinculada a un conductor. Pide a un admin
                  que asigne tu usuario a un registro de conductor.
                </p>
              )}

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Buses */}
        {conductor && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bus className="h-5 w-5" />
                  Mis buses
                </CardTitle>
                <CardDescription>
                  Agrega buses y hasta 4 fotos de cada uno
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBusForm(!showBusForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar bus
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {showBusForm && (
                <form
                  onSubmit={handleAddBus}
                  className="border rounded-xl p-4 space-y-3 bg-muted/30"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Placa *</Label>
                      <Input
                        value={busPlaca}
                        onChange={(e) => setBusPlaca(e.target.value)}
                        placeholder="ABC123"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Marca</Label>
                      <Input
                        value={busMarca}
                        onChange={(e) => setBusMarca(e.target.value)}
                        placeholder="Mercedes"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Modelo</Label>
                      <Input
                        value={busModelo}
                        onChange={(e) => setBusModelo(e.target.value)}
                        placeholder="OF 1721"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Año</Label>
                      <Input
                        type="number"
                        value={busAño}
                        onChange={(e) => setBusAño(e.target.value)}
                        placeholder="2020"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={savingBus}>
                      {savingBus && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Guardar bus
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowBusForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              )}

              {buses.length === 0 && !showBusForm && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aún no tienes buses registrados.
                </p>
              )}

              {buses.map((bus) => (
                <div
                  key={bus.id}
                  className="border rounded-xl p-4 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-lg">{bus.placa}</p>
                      <p className="text-sm text-muted-foreground">
                        {[bus.marca, bus.modelo, bus.año]
                          .filter(Boolean)
                          .join(" · ") || "Sin detalles"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDeleteBus(bus.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Fotos del bus */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Fotos ({bus.bus_fotos.length}/4)
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {bus.bus_fotos.map((foto) => (
                        <div
                          key={foto.id}
                          className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                        >
                          <Image
                            src={foto.url}
                            alt="Foto del bus"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteBusFoto(foto.id)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 className="h-5 w-5 text-white" />
                          </button>
                        </div>
                      ))}

                      {bus.bus_fotos.length < 4 && (
                        <>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={(el) => {
                              busFotoInputRefs.current[bus.id] = el
                            }}
                            onChange={(e) => handleUploadBusFoto(bus.id, e)}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              busFotoInputRefs.current[bus.id]?.click()
                            }
                            className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:bg-muted transition-colors"
                          >
                            <ImagePlus className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Subir
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Apariencia</CardTitle>
            <CardDescription>Elige el tema de la aplicación</CardDescription>
          </CardHeader>
          <CardContent>
            {mounted && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: "light", label: "Claro", icon: Sun },
                  { value: "dark", label: "Oscuro", icon: Moon },
                  { value: "system", label: "Sistema", icon: Monitor },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      theme === value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}