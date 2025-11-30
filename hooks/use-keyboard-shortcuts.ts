"use client"

import { useEffect, useCallback } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Ignorar se estiver em input/textarea
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Permitir apenas Ctrl+S em inputs
      if (!(event.ctrlKey && event.key.toLowerCase() === 's')) {
        return
      }
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey
      const altMatch = !!shortcut.altKey === event.altKey

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault()
        shortcut.action()
        return
      }
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Shortcuts padrão para consultas médicas
export const CONSULTATION_SHORTCUTS = {
  SAVE: { key: 's', ctrlKey: true, description: 'Salvar consulta (Ctrl+S)' },
  NEW_PRESCRIPTION: { key: 'p', ctrlKey: true, description: 'Nova prescrição (Ctrl+P)' },
  NEW_EXAM: { key: 'e', ctrlKey: true, description: 'Novo exame (Ctrl+E)' },
  NEW_DIAGNOSIS: { key: 'd', ctrlKey: true, description: 'Novo diagnóstico (Ctrl+D)' },
  TOGGLE_RECORD: { key: 'r', ctrlKey: true, description: 'Iniciar/parar gravação (Ctrl+R)' },
  HELP: { key: '/', ctrlKey: true, description: 'Mostrar atalhos (Ctrl+/)' },
}
