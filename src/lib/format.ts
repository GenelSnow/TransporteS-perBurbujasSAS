export function formatCOP(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0)
}

/** Convierte "$1.500.000" o "1500000" a número */
export function parseCOP(input: string): number {
  const cleaned = input.replace(/[^\d]/g, "")
  return cleaned ? Number(cleaned) : 0
}