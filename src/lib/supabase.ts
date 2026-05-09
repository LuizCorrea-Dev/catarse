import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase' // O ficheiro gerado pelo comando anterior

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltam as variáveis de ambiente do Supabase no ficheiro .env')
}

// Ao passar <Database>, o cliente "aprende" a estrutura do teu banco de dados
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/* 
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function ListaBemEstar() {
  const { data, isLoading } = useQuery({
    queryKey: ['meus-dados'],
    queryFn: async () => {
      // O Autocomplete vai sugerir as tabelas automaticamente aqui!
      const { data, error } = await supabase
        .from('nome_da_tua_tabela') 
        .select('*')
      
      if (error) throw error
      return data
    }
  })

  if (isLoading) return <div>A carregar...</div>

  return (
    <ul>
      {data?.map(item => (
        <li key={item.id}>{/ * O item aqui já tem todas as propriedades tipadas! * /}</li>
      ))}
    </ul>
  )
}
*/