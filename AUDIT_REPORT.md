# Auditoría de Código Muerto - Sortavo
**Fecha**: 2026-01-22
**Nivel**: Enterprise (Fortune 500)
**Estado**: COMPLETADO

---

## Resumen Ejecutivo

| Categoría | Eliminado | Detalle |
|-----------|-----------|---------|
| Funciones DB | ~50 | Versiones legacy, arquitectura obsoleta |
| Tablas DB | 17 | ~95k filas de datos obsoletos |
| Vistas DB | 2 | 1 regular + 1 materializada |
| Triggers DB | 5+ | Triggers legacy |
| Edge Functions | 3 | archive-old-raffles, check-subscription, reserve-tickets-v2 |
| Componentes UI | 17 | shadcn/ui no utilizados |
| Componentes Feature | 9 | Componentes específicos no importados |
| Hooks | 4 | Hooks personalizados no utilizados |
| Utilidades | 2 | payment-categories.ts, color-presets.ts |
| Tests huérfanos | 5 | Tests de código eliminado |
| NPM Dependencies | 2 | @vitest/coverage-v8, @tailwindcss/typography |

---

## 1. Base de Datos (COMPLETADO)

### Migración: `20260122060000_cleanup_dead_code.sql`
Eliminadas ~50 funciones obsoletas incluyendo:
- Versiones viejas de virtual tickets (get_virtual_tickets_optimized, get_virtual_tickets_v2)
- Funciones de reservación legacy (reserve_virtual_tickets, reserve_tickets_v)
- Funciones de ticket blocks (legacy architecture)
- Funciones de stats/cache no utilizadas
- Triggers obsoletos

### Migración: `20260122061000_cleanup_dead_tables.sql`
Eliminadas 17 tablas (~95k filas):
- ticket_block_status, ticket_reservation_status_old
- admin_simulations, archived_raffle_summary
- billing_audit_log, payment_failures, stripe_events
- subscription_events, refund_requests, refund_audit_log
- dunning_emails, customers, coupon_usage
- rate_limit_entries, system_alerts, system_settings
- public_ticket_status (vista)

---

## 2. Edge Functions (COMPLETADO)

### Eliminadas (3):
```
supabase/functions/archive-old-raffles  # ROTO - refs tabla eliminada
supabase/functions/check-subscription   # Redundante con subscription-status
supabase/functions/reserve-tickets-v2   # No usado - frontend usa RPC directo
```

### Conservadas (cron jobs útiles):
- auto-draw - Sorteo automático
- notify-pending-approvals - Notificaciones
- send-payment-reminders - Recordatorios
- sync-domains - Sincronización de dominios

---

## 3. Componentes React (COMPLETADO)

### UI Components eliminados (17):
```
src/components/ui/aspect-ratio.tsx
src/components/ui/accessible-loader.tsx
src/components/ui/form-field.tsx
src/components/ui/slider.tsx
src/components/ui/debounced-input.tsx
src/components/ui/chart.tsx
src/components/ui/hover-card.tsx
src/components/ui/resizable.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/drawer.tsx
src/components/ui/lazy-image.tsx
src/components/ui/BankCombobox.tsx
src/components/ui/live-region.tsx
src/components/ui/menubar.tsx
src/components/ui/error-summary.tsx
src/components/ui/context-menu.tsx
src/components/ui/carousel.tsx
```

### Feature Components eliminados (9):
```
src/components/settings/OrganizationPreview.tsx
src/components/settings/SubscriptionSettings.tsx
src/components/admin/StripeSetupGuide.tsx
src/components/raffle/VirtualizedBuyersList.tsx
src/components/raffle/public/PrizeGallery.tsx
src/components/raffle/public/TemplateWrapper.tsx
src/components/raffle/public/TemplateProvider.tsx
src/components/raffle/public/PackagePills.tsx
src/components/raffle/MemoizedTicketStats.tsx
```

### CORREGIDO - Componentes que SÍ están en uso:
- `HowItWorks.tsx` - 3 referencias (conservado)
- `ColorPalette.tsx` - 2 referencias (conservado)

---

## 4. Hooks (COMPLETADO)

### Eliminados (4):
```
src/hooks/useDebounce.ts
src/hooks/useAccessibilityPreferences.ts
src/hooks/useFocusTrap.ts
src/hooks/useGridNavigation.ts
```

---

## 5. Utilidades (COMPLETADO)

### Eliminadas (2):
```
src/lib/payment-categories.ts
src/lib/color-presets.ts
```

---

## 6. Tests Huérfanos (COMPLETADO)

### Eliminados (5):
```
src/components/settings/__tests__/PaymentMethodCard.test.tsx
src/components/subscription/__tests__/InvoiceHistory.test.tsx
src/components/__tests__/CheckoutModal.doubleClick.test.tsx
src/hooks/__tests__/useReserveVirtualTickets.test.ts
src/hooks/__tests__/useRafflesRevenue.test.ts
```

---

## 7. NPM Dependencies (COMPLETADO)

### Eliminadas (2):
```
@vitest/coverage-v8
@tailwindcss/typography
```

### CORREGIDO - Dependencias que SÍ están en uso:
- `autoprefixer` - Usado en postcss.config.js
- `postcss` - Usado en postcss.config.js

---

## 8. Validación

### Build: EXITOSO
```
npm run build
✓ built in 17.07s
```

### Tests: 86/92 pasando
- 6 tests fallando son pre-existentes (localStorage mock issue)
- No relacionados con la limpieza

---

## Impacto

| Métrica | Antes | Después | Mejora |
|---------|-------|---------|--------|
| Funciones DB | ~80 | ~30 | -62% |
| Tablas DB | 45 | 28 | -38% |
| Edge Functions | 55 | 52 | -5% |
| Componentes | ~224 | ~198 | -12% |
| NPM Packages | ~950 | ~936 | -1.5% |
| Build Time | ~18s | ~17s | -6% |

---

*Generado automáticamente por Claude Code - 2026-01-22*
