# ShadCN/UI com RTL Configurado ✅

## Configuração Final

### ✅ RTL (Right-to-Left) Ativado
- **RTL habilitado** em `components.json`
- Suporte completo para idiomas de direita para esquerda (Árabe, Hebraico, Persa, etc.)
- Componentes automaticamente espelhados quando necessário

### Detalhes da Configuração

```json
{
  "style": "new-york",
  "baseColor": "neutral",
  "iconLibrary": "lucide",
  "rtl": true
}
```

## Como Usar RTL no Seu Projeto

### 1. Adicionar Suporte RTL ao HTML

No seu `app/layout.tsx`, adicione o atributo `dir`:

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      {/* Para RTL: lang="ar" (Árabe) ou lang="he" (Hebraico) */}
      <body>{children}</body>
    </html>
  )
}
```

### 2. Exemplo com Componentes RTL

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ArabicForm() {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>نموذج تسجيل الدخول</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <Input placeholder="البريد الإلكتروني" type="email" />
          <Input placeholder="كلمة المرور" type="password" />
          <Button className="w-full">تسجيل الدخول</Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

### 3. Controlar RTL Dinamicamente

```tsx
'use client'

import { useState } from 'react'

export default function LanguageSwitcher() {
  const [isRTL, setIsRTL] = useState(false)

  const toggleLanguage = () => {
    setIsRTL(!isRTL)
    document.documentElement.dir = isRTL ? 'ltr' : 'rtl'
    document.documentElement.lang = isRTL ? 'en' : 'ar'
  }

  return (
    <button onClick={toggleLanguage}>
      Switch to {isRTL ? 'English' : 'العربية'}
    </button>
  )
}
```

## Componentes Instalados

✅ Button
✅ Card
✅ Input
✅ Select
✅ Dialog
✅ Badge
✅ Textarea
✅ Label

## Adicionar Mais Componentes com RTL

O RTL está configurado globalmente. Todos os novos componentes que você instalar usarão automaticamente a configuração RTL:

```bash
npx shadcn@latest add [component-name] --yes
```

Exemplos:
```bash
npx shadcn@latest add accordion --yes
npx shadcn@latest add form --yes
npx shadcn@latest add table --yes
```

## CSS RTL Automático

O Tailwind CSS automaticamente espelha classes quando RTL está ativo. Exemplo:

```tsx
{/* Isso se torna mr-4 em RTL e ml-4 em LTR */}
<div className="ml-4">Conteúdo</div>
```

## Suporte de Idiomas Recomendados

| Idioma | Código |
|--------|--------|
| Árabe | `ar` |
| Hebraico | `he` |
| Persa | `fa` |
| Urdu | `ur` |
| Kurdish | `ku` |
| Pashto | `ps` |

## Testando RTL

1. Abra seu app em `http://localhost:3000`
2. Abra DevTools (F12)
3. No console, execute:
   ```javascript
   document.documentElement.dir = 'rtl'
   document.documentElement.lang = 'ar'
   ```
4. Veja a página se espelhar automaticamente

## Notas Importantes

- ⚠️ **Textos em inglês em contexto RTL** ainda flui da esquerda para direita (isso é correto)
- ⚠️ **Números** ainda aparecem esquerdados (padrão Unicode)
- ✅ **Margins/Padding** são automaticamente espelhados
- ✅ **Flex/Grid** ajustam automaticamente
- ✅ **Transforms** são respeitados

## Troubleshooting RTL

### Componentes não estão se espelhando
- Certifique-se de que `rtl: true` está em `components.json`
- Reinicie o servidor: `npm run dev`

### Textos mistos (árabe + inglês) estão bagunçados
- Isso é esperado. Use marcadores de direção Unicode para melhor controle:
  ```html
  <div dir="auto">نص عربي مع English</div>
  ```

### Necessário suporte LTR + RTL dinâmico?
- Use a solução de language switcher acima
- Considere usar CSS variables para estilos específicos de direção

---

**RTL está configurado e pronto para uso!** 🚀
