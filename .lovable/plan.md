
# Plan: Corregir contraste del banner "Boletos seleccionados"

## Problema
El banner que muestra "100 boletos seleccionados" usa colores hardcodeados (`bg-emerald-500/10`, `border-emerald-500/20`) que son casi invisibles sobre fondos claros porque tienen muy poca opacidad.

## Solución
Reemplazar los colores hardcodeados por los tokens de tema que ya existen en el componente:
- **Tema claro**: `successBg: 'bg-emerald-50'` + `successBorder: 'border-emerald-300'`
- **Tema oscuro**: `successBg: 'bg-emerald-500/10'` + `successBorder: 'border-emerald-500/50'`

## Cambio técnico

### Archivo: `src/components/raffle/public/TicketSelector.tsx`

**Línea 1132** - Cambiar las clases del banner:

```typescript
// ANTES
className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20"

// DESPUÉS
className={cn(
  "p-4 rounded-xl border",
  colors.successBg,
  colors.successBorder
)}
```

## Resultado visual

| Tema | Antes | Después |
|------|-------|---------|
| Claro (fondo blanco) | Verde 10% opacidad (casi invisible) | `bg-emerald-50` (verde pastel visible) + `border-emerald-300` (borde verde sólido) |
| Oscuro (fondo negro) | Verde 10% opacidad (funciona bien) | `bg-emerald-500/10` + `border-emerald-500/50` (mismo estilo) |

El texto "100 boletos seleccionados" ahora será claramente visible con un fondo y borde de contraste adecuado en ambos temas.
