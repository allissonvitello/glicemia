import { createContext, useContext } from 'react'
import { METAS_PADRAO } from './regras'

// As metas são carregadas no App e lidas pelas telas por aqui.
export const MetasContexto = createContext(METAS_PADRAO)

export function useMetas() {
  return useContext(MetasContexto)
}
