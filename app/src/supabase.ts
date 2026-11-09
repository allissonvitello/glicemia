import { createClient } from '@supabase/supabase-js'

// Endereço e chave pública do projeto, em app/.env.local. Quem protege os dados
// são as regras do banco (app/supabase/esquema.sql), não o segredo desta chave.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)
