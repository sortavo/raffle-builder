# Guía de Optimización de Queries - Sortavo

## Principio Fundamental: NUNCA usar `.select('*')`

### ¿Por qué es importante?

1. **Reduce payload de red** - 60-80% menos datos transferidos
2. **Mejora tiempo de respuesta** - Queries más rápidos
3. **Reduce uso de memoria** - Menos datos en cliente
4. **Mejor seguridad** - No expone campos innecesarios
5. **Evita breaking changes** - Nuevas columnas no rompen el código

---

## Campos por Caso de Uso

### Listado de Órdenes (Dashboard)

```typescript
// ❌ MAL
.from('orders').select('*')

// ✅ BIEN
.from('orders').select(`
  id, 
  raffle_id, 
  buyer_name, 
  ticket_count, 
  status, 
  reference_code,
  order_total,
  created_at,
  reserved_until
`)
```

### Verificación de Boleto (Público)

```typescript
// Solo datos necesarios para mostrar estado
.from('orders').select(`
  id, 
  ticket_ranges, 
  lucky_indices, 
  status,
  reserved_until
`)
```

### Aprobación de Orden (Admin)

```typescript
// Incluye datos de pago para verificación
.from('orders').select(`
  id,
  buyer_name,
  buyer_email,
  buyer_phone,
  buyer_city,
  ticket_count,
  order_total,
  payment_proof_url,
  payment_method,
  status,
  created_at
`)
```

### Listado de Rifas (Dashboard)

```typescript
// ❌ MAL
.from('raffles').select('*')

// ✅ BIEN
.from('raffles').select(`
  id,
  title,
  slug,
  status,
  total_tickets,
  ticket_price,
  draw_date,
  cover_image_url,
  created_at
`)
```

### Detalle de Rifa (Público)

```typescript
.from('raffles').select(`
  id,
  title,
  slug,
  description,
  prize_name,
  prize_description,
  prize_images,
  prize_value,
  ticket_price,
  total_tickets,
  draw_date,
  draw_method,
  status,
  cover_image_url,
  currency_code,
  customization,
  faq,
  numbering_config,
  organizations!inner (
    id, name, logo_url, brand_color, slug,
    whatsapp_number, city
  )
`)
```

### Notificaciones

```typescript
.from('notifications').select(`
  id,
  title,
  message,
  type,
  read,
  link,
  created_at
`)
```

### Customers

```typescript
.from('customers').select(`
  id,
  full_name,
  email,
  phone,
  city,
  total_spent,
  total_orders,
  total_tickets,
  last_purchase_at
`)
```

### Payment Methods

```typescript
.from('payment_methods').select(`
  id,
  name,
  type,
  subtype,
  enabled,
  display_order,
  bank_name,
  account_holder,
  account_number,
  clabe,
  instructions
`)
```

---

## Patrones Comunes

### Joins Eficientes

```typescript
// ❌ Múltiples queries
const { data: raffle } = await supabase.from('raffles').select('*').eq('id', id);
const { data: org } = await supabase.from('organizations').select('*').eq('id', raffle.organization_id);

// ✅ Join en una query
const { data: raffle } = await supabase
  .from('raffles')
  .select(`
    id, title, slug, status,
    organizations (id, name, logo_url, slug)
  `)
  .eq('id', id)
  .single();
```

### Conteos Sin Datos

```typescript
// ❌ Trae todos los datos solo para contar
const { data } = await supabase.from('orders').select('*').eq('raffle_id', id);
const count = data.length;

// ✅ Usa count directamente
const { count } = await supabase
  .from('orders')
  .select('id', { count: 'exact', head: true })
  .eq('raffle_id', id);
```

### Paginación

```typescript
// ✅ Siempre paginar listas grandes
.from('orders')
.select('id, buyer_name, ticket_count, status')
.eq('raffle_id', raffleId)
.range(0, 49) // Primeros 50
.order('created_at', { ascending: false })
```

---

## Campos por Hook

| Hook | Campos Requeridos |
|------|-------------------|
| `useOrders` | id, raffle_id, buyer_name, ticket_count, status, reference_code, created_at |
| `useRaffles` | id, title, slug, status, total_tickets, ticket_price, draw_date |
| `useNotifications` | id, title, message, type, read, created_at, link |
| `useCustomers` | id, full_name, email, phone, total_spent, total_orders |
| `usePaymentMethods` | id, name, type, enabled, display_order, bank_name |
| `useCoupons` | id, code, name, discount_type, discount_value, active, max_uses, current_uses |

---

## Excepciones Válidas

Solo usar `select('*')` cuando:

1. **Formularios de edición** - Necesitas todos los campos para el form
2. **Duplicación de registros** - Necesitas copiar todos los campos
3. **Exportación de datos** - CSV/Excel con todos los campos
4. **Debug temporal** - Revertir después de debugging

En estos casos, documenta por qué:

```typescript
// Necesitamos todos los campos para duplicar la rifa
const { data: original } = await supabase
  .from('raffles')
  .select('*') // Full select: duplicating all fields
  .eq('id', raffleId)
  .single();
```

---

## Checklist de Review

- [ ] ¿Usa `.select()` con campos específicos?
- [ ] ¿Incluye solo los campos necesarios para la UI?
- [ ] ¿Usa joins en lugar de múltiples queries?
- [ ] ¿Tiene paginación para listas potencialmente largas?
- [ ] ¿Los campos sensibles están excluidos en queries públicas?
