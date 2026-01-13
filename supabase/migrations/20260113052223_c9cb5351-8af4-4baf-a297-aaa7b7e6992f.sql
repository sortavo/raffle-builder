-- Agregar contact@sortavo.com como Super Admin de la plataforma
INSERT INTO public.platform_admins (user_id, notes, created_at)
VALUES (
  '79dca02b-1bca-418b-bdbb-5986f794fe19',
  'Super Admin - Cuenta principal de Sortavo',
  NOW()
);