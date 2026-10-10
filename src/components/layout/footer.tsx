export function Footer() {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Facturas TBS Burbujas</p>
            <p className="text-sm text-muted-foreground">
              Sistema de administración y conductores
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 Facturas TBS Burbujas. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}