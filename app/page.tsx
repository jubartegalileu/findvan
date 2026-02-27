import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary p-4 md:p-24">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-4xl">Bem-vindo ao FindVan</CardTitle>
            <CardDescription>
              Sua plataforma para encontrar a van perfeita
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              ShadCN/UI está instalado e funcionando! 🎉
            </p>
            <div className="flex gap-4">
              <Button>Explorar Vans</Button>
              <Button variant="outline">Saiba Mais</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Componentes Instalados</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>✅ Button</li>
                <li>✅ Card</li>
                <li>✅ Input</li>
                <li>✅ Select</li>
                <li>✅ Dialog</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Próximos Passos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li>1. Customize as cores em tailwind.config.js</li>
                <li>2. Instale novos componentes com npx shadcn@latest add</li>
                <li>3. Leia SHADCN_SETUP.md para mais informações</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
