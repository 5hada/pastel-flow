import { useEffect, useRef } from 'react'
import type { ShortcutSettings } from '../../../shared/settings'

export type WorkspaceShortcutHandlers = {
  onOpenActions(): void
  onOpenRun(): void
  onOpenSettings(): void
  onOpenTools(): void
  onOpenWorkflows(): void
  onRefresh(): void
  onRunSelectedWorkflow(workflowId: string): void
}

export type UseWorkspaceShortcutsOptions = {
  selectedWorkflowId: string | null
  shortcuts: ShortcutSettings
  handlers: WorkspaceShortcutHandlers
}

export function useWorkspaceShortcuts(options: UseWorkspaceShortcutsOptions) {
  const optionsRef = useRef(options)

  useEffect(() => {
    optionsRef.current = options
  }, [options])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      const {
        handlers,
        selectedWorkflowId,
        shortcuts,
      } = optionsRef.current
      const pressedShortcut = formatKeyboardShortcut(event)

      if (pressedShortcut === shortcuts.refresh) {
        event.preventDefault()
        handlers.onRefresh()
      } else if (pressedShortcut === shortcuts.openRun) {
        event.preventDefault()
        handlers.onOpenRun()
      } else if (pressedShortcut === shortcuts.openActions) {
        event.preventDefault()
        handlers.onOpenActions()
      } else if (pressedShortcut === shortcuts.openWorkflows) {
        event.preventDefault()
        handlers.onOpenWorkflows()
      } else if (pressedShortcut === shortcuts.openTools) {
        event.preventDefault()
        handlers.onOpenTools()
      } else if (pressedShortcut === shortcuts.openSettings) {
        event.preventDefault()
        handlers.onOpenSettings()
      } else if (
        pressedShortcut === shortcuts.runSelectedWorkflow &&
        selectedWorkflowId
      ) {
        event.preventDefault()
        handlers.onRunSelectedWorkflow(selectedWorkflowId)
      }
    }

    window.addEventListener('keydown', handleShortcut)

    return () => {
      window.removeEventListener('keydown', handleShortcut)
    }
  }, [])
}

function formatKeyboardShortcut(event: KeyboardEvent): string {
  const parts = [
    event.ctrlKey ? 'Ctrl' : '',
    event.altKey ? 'Alt' : '',
    event.shiftKey ? 'Shift' : '',
    event.metaKey ? 'Meta' : '',
    normalizeShortcutKey(event.key),
  ].filter(Boolean)

  return parts.join('+')
}

function normalizeShortcutKey(key: string): string {
  if (key === ' ') {
    return 'Space'
  }

  if (key === ',') {
    return ','
  }

  return key.length === 1 ? key.toUpperCase() : key
}
