# Sortavo - Guía de Estilos

## Sistema de Colores "Negro & Esmeralda"

Este proyecto utiliza un sistema de diseño basado en tokens semánticos definidos en `index.css` y `tailwind.config.ts`.

---

## Tokens Semánticos (USO OBLIGATORIO)

### Colores Base
| Token | Uso | Ejemplo Tailwind |
|-------|-----|------------------|
| `background` | Fondo principal de la app | `bg-background` |
| `foreground` | Texto principal | `text-foreground` |
| `card` | Fondo de tarjetas | `bg-card` |
| `card-foreground` | Texto en tarjetas | `text-card-foreground` |
| `muted` | Fondos secundarios/deshabilitados | `bg-muted` |
| `muted-foreground` | Texto secundario | `text-muted-foreground` |

### Colores de Marca
| Token | Uso | Ejemplo Tailwind |
|-------|-----|------------------|
| `primary` | Color principal (esmeralda) | `bg-primary`, `text-primary` |
| `primary-foreground` | Texto sobre primary | `text-primary-foreground` |
| `accent` | Acentos dorados/secundarios | `bg-accent`, `text-accent` |
| `accent-foreground` | Texto sobre accent | `text-accent-foreground` |
| `secondary` | Elementos secundarios | `bg-secondary` |

### Estados Semánticos
| Token | Uso | Ejemplo Tailwind |
|-------|-----|------------------|
| `success` | Estados exitosos, confirmados | `bg-success`, `text-success` |
| `warning` | Advertencias, pendientes | `bg-warning`, `text-warning` |
| `destructive` | Errores, eliminación | `bg-destructive`, `text-destructive` |
| `info` | Información neutral | `bg-info`, `text-info` |

### Bordes y Anillos
| Token | Uso | Ejemplo Tailwind |
|-------|-----|------------------|
| `border` | Bordes generales | `border-border` |
| `ring` | Anillos de focus | `ring-ring` |

---

## Colores Hardcodeados Intencionales

Los siguientes colores están hardcodeados **intencionalmente** y NO deben migrarse a tokens:

### 1. Colores de Marca Externa

#### WhatsApp (`green-500`, `green-600`)
```tsx
// ✅ CORRECTO - Color oficial de WhatsApp
className="bg-green-500 hover:bg-green-600"
```
**Archivos:** `OrganizationHome.tsx`, `FloatingWhatsAppButton.tsx`

#### Visa/Mastercard (`blue-500`, `red-500`)
```tsx
// ✅ CORRECTO - Colores oficiales de tarjetas
<div className="bg-blue-500">V</div>  // Visa
<div className="bg-red-500">M</div>   // Mastercard
```
**Archivos:** `CheckoutModal.tsx`

---

### 2. Decorativos de UI Específica

#### Botones de Ventana (macOS style)
```tsx
// ✅ CORRECTO - Simula botones de ventana macOS
<div className="w-3 h-3 rounded-full bg-red-500/60" />
<div className="w-3 h-3 rounded-full bg-amber-500/60" />
<div className="w-3 h-3 rounded-full bg-emerald-500/60" />
```
**Archivos:** `Index.tsx`, `OrganizationPreview.tsx`

#### Slot Machine Animation
```tsx
// ✅ CORRECTO - Estilo casino/arcade
className="bg-slate-950 border-slate-600"
```
**Archivos:** `SlotMachineAnimation.tsx`

#### Ticket Descargable (Visual especial)
```tsx
// ✅ CORRECTO - Diseño de ticket premium con gradiente oscuro
className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
```
**Archivos:** `DownloadableTicket.tsx`

---

### 3. Estados de Urgencia/Marketing

#### Urgencia Crítica (`red-*`)
```tsx
// ✅ CORRECTO - Urgencia máxima (últimos minutos)
className="border-red-500/50 bg-red-50 dark:bg-red-950/20"
```
**Archivos:** `UrgencyBadge.tsx`

#### Urgencia Moderada (`amber-*`, `orange-*`)
```tsx
// ✅ CORRECTO - Urgencia moderada (horas restantes)
className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20"
```
**Archivos:** `UrgencyBadge.tsx`

---

### 4. Simulación de Admin

#### Modo Solo Lectura (`amber-*`)
```tsx
// ✅ CORRECTO - Indica modo observación
className="bg-amber-50 border-amber-200"
```

#### Modo Escritura (`red-*`)
```tsx
// ✅ CORRECTO - Indica modo con permisos de escritura (peligroso)
className="bg-red-50 border-red-200"
```
**Archivos:** `SimulationBanner.tsx`

---

### 5. Grid de Tickets (Estados Visuales)

Los estados de tickets en la grilla usan colores específicos para máxima claridad visual:

| Estado | Color | Clase |
|--------|-------|-------|
| Disponible | Verde | `bg-green-50 border-green-300` |
| Seleccionado | Verde intenso | `bg-green-500 border-green-600` |
| Reservado | Ámbar | `bg-amber-50 border-amber-300` |
| Vendido | Gris | `bg-muted border-muted` |
| Cancelado | Rojo | `bg-red-50 border-red-200` |

**Archivos:** `TicketButton.tsx`, `VirtualizedTicketGrid.tsx`, `TicketSelector.tsx`

---

### 6. Landing Page Decorativo

Los blobs y efectos decorativos del landing usan colores específicos del tema:

```tsx
// ✅ CORRECTO - Blobs decorativos con colores de marca
<div className="bg-emerald-600/15 rounded-full blur-3xl animate-blob" />
<div className="bg-amber-500/10 rounded-full blur-3xl animate-blob" />
```
**Archivos:** `Index.tsx`

---

## Reglas de Migración

### ✅ USAR Tokens Semánticos Para:
- Fondos de componentes (`bg-background`, `bg-card`, `bg-muted`)
- Texto general (`text-foreground`, `text-muted-foreground`)
- Bordes (`border-border`)
- Estados de negocio (`bg-success/20`, `text-warning`, `bg-destructive/10`)
- Botones y CTAs (`bg-primary`, `hover:bg-primary/90`)

### ❌ NO Migrar a Tokens:
- Colores de marcas externas (WhatsApp, Visa, etc.)
- Decorativos de UI específica (window buttons, slots, etc.)
- Estados de urgencia de marketing (rojo crítico, ámbar moderado)
- Simulación de admin (indicadores de modo)
- Grid de tickets (estados visuales heredados)

---

## Ejemplos de Uso Correcto

### Botón Primario
```tsx
// ✅ CORRECTO
<Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
  Comprar
</Button>
```

### Badge de Estado
```tsx
// ✅ CORRECTO
<Badge className="bg-success/20 text-success border-success/50">
  Confirmado
</Badge>

// ✅ CORRECTO
<Badge className="bg-warning/20 text-warning border-warning/50">
  Pendiente
</Badge>
```

### Alerta de Error
```tsx
// ✅ CORRECTO
<Alert className="bg-destructive/10 border-destructive/50">
  <AlertDescription className="text-destructive">
    Error al procesar
  </AlertDescription>
</Alert>
```

### Fondo con Gradiente de Marca
```tsx
// ✅ CORRECTO
<div className="bg-gradient-to-r from-primary via-primary/80 to-accent">
  Contenido
</div>
```

---

## Archivos Clave del Sistema

| Archivo | Propósito |
|---------|-----------|
| `src/index.css` | Definición de tokens CSS (variables HSL) |
| `tailwind.config.ts` | Mapeo de tokens a clases Tailwind |
| `src/components/ui/button.tsx` | Variantes de botones |
| `src/components/ui/badge.tsx` | Variantes de badges |

---

## Notas Adicionales

1. **Siempre usar HSL**: Todos los colores en `index.css` deben estar en formato HSL.
2. **Dark mode**: Los tokens cambian automáticamente entre light/dark mode.
3. **Opacidades**: Usar `/XX` para opacidades (ej: `bg-primary/20`).
4. **Gradientes**: Preferir gradientes con tokens (`from-primary to-accent`).

---

*Última actualización: Diciembre 2024*
