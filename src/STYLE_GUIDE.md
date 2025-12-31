# Sortavo - Guía de Estilos Enterprise

## Sistema de Diseño Unificado "Negro & Esmeralda"

Este proyecto utiliza un sistema de diseño enterprise con tokens semánticos definidos en `index.css` y `tailwind.config.ts`.

---

## 🎨 Paleta de Colores

### Ultra-Dark Theme (Páginas Públicas)

Todas las páginas públicas usan el tema ultra-dark para una estética premium enterprise:

| Token | Valor | Uso | Ejemplo Tailwind |
|-------|-------|-----|------------------|
| `ultra-dark` | `#030712` | Fondo principal de páginas públicas | `bg-ultra-dark` |
| `ultra-dark-elevated` | `#0a0f1a` | Elementos elevados | `bg-ultra-dark-elevated` |
| `ultra-dark-card` | `rgba(255,255,255,0.03)` | Cards glassmorphism | `bg-ultra-dark-card` |
| `ultra-dark-border` | `rgba(255,255,255,0.08)` | Bordes sutiles | `border-ultra-dark` |

**Páginas que usan Ultra-Dark:**
- `/` (Landing)
- `/pricing`
- `/auth`
- `/r/:slug` (Rifa pública)
- `/onboarding`
- `/contact`
- `/help`

### Tokens Semánticos Base

| Token | Uso Light | Uso Dark | Ejemplo Tailwind |
|-------|-----------|----------|------------------|
| `background` | `hsl(0 0% 100%)` | `hsl(222 47% 3%)` | `bg-background` |
| `foreground` | `hsl(222 47% 11%)` | `hsl(0 0% 98%)` | `text-foreground` |
| `card` | `hsl(0 0% 100%)` | `hsl(222 47% 5%)` | `bg-card` |
| `muted` | `hsl(220 14% 96%)` | `hsl(222 47% 8%)` | `bg-muted` |
| `muted-foreground` | `hsl(220 9% 46%)` | `hsl(220 9% 60%)` | `text-muted-foreground` |

### Colores de Marca

| Token | Valor | Uso | Ejemplo Tailwind |
|-------|-------|-----|------------------|
| `primary` | Emerald-500 `#10B981` | Botones, CTAs, acentos principales | `bg-primary` |
| `accent` | Teal-500 `#14B8A6` | Acentos secundarios, gradientes | `bg-accent` |
| `secondary` | Gris sutil | Elementos secundarios | `bg-secondary` |

### Estados Semánticos

| Token | Color | Uso | Ejemplo |
|-------|-------|-----|---------|
| `success` | Emerald | Confirmaciones, aprobados | `bg-success/20 text-success` |
| `warning` | Amber | Pendientes, advertencias | `bg-warning/20 text-warning` |
| `destructive` | Red | Errores, eliminación | `bg-destructive/20 text-destructive` |
| `info` | Blue | Información neutral | `bg-info/20 text-info` |

---

## 📐 Componentes con Variantes CVA

### Button Variants

```tsx
import { Button } from "@/components/ui/button";

// Variantes disponibles:
<Button variant="default">Primary</Button>      // Emerald solid
<Button variant="gradient">Gradient</Button>   // Emerald → Teal gradient
<Button variant="inverted">Inverted</Button>   // White on dark (CTAs en dark theme)
<Button variant="ghost">Ghost</Button>         // Transparente con hover
<Button variant="outline">Outline</Button>     // Borde sin fill
<Button variant="destructive">Delete</Button>  // Rojo para eliminación
```

### Card Variants

```tsx
import { Card } from "@/components/ui/card";

// Variantes disponibles:
<Card variant="default">...</Card>    // Standard para dashboard
<Card variant="elevated">...</Card>   // Shadow mayor, hover lift
<Card variant="glass">...</Card>      // Glassmorphism para dark theme
<Card variant="premium">...</Card>    // Glassmorphism intenso + glow
```

**Cuándo usar cada variante:**
- `default`: Dashboard, formularios, settings
- `elevated`: Cards destacadas, pricing, features
- `glass`: Páginas públicas con tema ultra-dark
- `premium`: Hero sections, elementos premium

### Input Variants

```tsx
import { Input } from "@/components/ui/input";

// Para dark theme, usar clases adicionales:
<Input className="bg-gray-800/50 border-white/10 text-white placeholder:text-gray-500" />
```

---

## ✨ Efectos Premium

### Glassmorphism

```tsx
// Card glass básico
<div className="bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm rounded-2xl">

// Card glass premium
<div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-2xl rounded-2xl">
```

### Animated Orbs (Background)

```tsx
// En páginas premium (Index, Pricing, Onboarding, PublicRaffle)
<div className="fixed inset-0 pointer-events-none z-0">
  <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] bg-emerald-600/15 rounded-full blur-[100px] animate-blob" />
  <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[80px] animate-blob animation-delay-2000" />
  <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-emerald-500/10 rounded-full blur-[80px] animate-blob animation-delay-4000" />
</div>
```

### Grid Pattern

```tsx
// Overlay de grid sutil
<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
```

### Gradientes de Texto

```tsx
// Título hero con gradiente emerald
<h1 className="text-5xl font-bold">
  <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">
    Título Premium
  </span>
</h1>
```

---

## 📏 Tipografía Enterprise

### Escala de Tamaños

| Tipo | Clases | Uso |
|------|--------|-----|
| Display | `text-6xl lg:text-7xl font-black tracking-[-0.04em]` | Hero titles |
| Heading 1 | `text-4xl lg:text-5xl font-bold tracking-tight` | Page titles |
| Heading 2 | `text-2xl lg:text-3xl font-semibold` | Section headers |
| Heading 3 | `text-xl font-semibold` | Card titles |
| Body | `text-base` | Párrafos |
| Caption | `text-sm text-muted-foreground` | Texto secundario |
| Small | `text-xs` | Labels, badges |

### Font Weights

- `font-black` (900): Hero headlines únicamente
- `font-bold` (700): Títulos de sección
- `font-semibold` (600): Subtítulos, card headers
- `font-medium` (500): Labels importantes
- `font-normal` (400): Body text

---

## 📐 Sistema de Espaciado

### Section Padding

```tsx
// Secciones de contenido
<section className="py-20 lg:py-28">...</section>

// Hero sections
<section className="py-24 lg:py-32">...</section>
```

### Container Widths

```tsx
// Contenedor estándar
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Contenedor angosto (formularios)
<div className="max-w-3xl mx-auto px-4">

// Contenedor muy angosto (modals)
<div className="max-w-md mx-auto px-4">
```

### Card Padding

```tsx
// Card content
<CardContent className="p-6 lg:p-8">

// Compact card
<CardContent className="p-4">
```

---

## 🎭 Colores Hardcodeados Permitidos

Los siguientes colores están hardcodeados **intencionalmente** y NO deben migrarse:

### Marcas Externas
- **WhatsApp**: `bg-green-500 hover:bg-green-600`
- **Visa**: `bg-blue-500`
- **Mastercard**: `bg-red-500`

### UI Decorativa
- **Window buttons (macOS)**: `bg-red-500/60`, `bg-amber-500/60`, `bg-emerald-500/60`
- **Slot machine**: `bg-slate-950`
- **Ticket descargable**: `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`

### Estados de Marketing
- **Urgencia crítica**: `border-red-500/50 bg-red-50 dark:bg-red-950/20`
- **Urgencia moderada**: `border-amber-500/50 bg-amber-50 dark:bg-amber-950/20`

### Grid de Tickets
| Estado | Color |
|--------|-------|
| Disponible | `bg-green-50 border-green-300` |
| Seleccionado | `bg-green-500 border-green-600` |
| Reservado | `bg-amber-50 border-amber-300` |
| Vendido | `bg-muted border-muted` |

---

## 📁 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/index.css` | Tokens CSS (variables HSL), utilidades |
| `tailwind.config.ts` | Mapeo tokens → Tailwind, animaciones |
| `src/components/ui/button.tsx` | Variantes CVA de botones |
| `src/components/ui/card.tsx` | Variantes CVA de cards |
| `src/components/ui/input.tsx` | Estilos de inputs |

---

## ✅ Checklist de Implementación

### Para Nuevas Páginas Públicas:
- [ ] Usar `bg-ultra-dark` como fondo principal
- [ ] Incluir orbes animados y grid pattern
- [ ] Usar `useScopedDarkMode()` hook
- [ ] Cards con `variant="glass"` o `variant="premium"`
- [ ] Botones con `variant="gradient"` o `variant="inverted"`
- [ ] Títulos con gradiente emerald

### Para Páginas de Dashboard:
- [ ] Usar tokens semánticos (`bg-background`, `text-foreground`)
- [ ] Cards con `variant="default"` o `variant="elevated"`
- [ ] Botones con `variant="default"`
- [ ] Respetar sistema de espaciado

---

*Última actualización: Diciembre 2024*
