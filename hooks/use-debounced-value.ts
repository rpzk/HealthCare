'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Retorna um valor com debounce. Útil para buscar na API somente após o usuário parar de digitar.
 * O valor imediato é mantido no estado do componente pai; use este hook para o valor que dispara a busca.
 *
 * @param value - Valor a ser debounced
 * @param delayMs - Atraso em ms (padrão 400)
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
