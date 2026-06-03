# Renderer Code Review

Completed items were removed from this document.

## Remaining Items

### AppSettingsPanel is still too large

- Location: `src/renderer/features/settings/AppSettingsPanel.tsx`
- Issue: One file still owns general settings, appearance, shortcuts, browser settings, device policies, secrets, sync, events, data management, developer options, and nested profile/device editors.
- Risk: The file violates the one-responsibility-per-file rule and will remain difficult to review safely.
- Direction: Split the panel by settings category and keep only composition in `AppSettingsPanel.tsx`.

### DetailItem implementations are duplicated

- Location: `src/renderer/features/workflows/components/EditWorkspace.tsx`, `src/renderer/features/settings/AppSettingsPanel.tsx`, `src/renderer/features/tools/ToolsPanel.tsx`
- Issue: Small detail display components are reimplemented in multiple files.
- Risk: UI behavior and spacing can diverge over time.
- Direction: Move a shared detail-list primitive into `src/renderer/shared`.

### Shortcut registration still relies on a render-bound effect

- Location: `src/renderer/shared/hooks/usePastelFlowApp.ts`
- Issue: The keyboard shortcut listener effect still runs after every render.
- Risk: Cleanup prevents listener leaks, but the lifecycle is noisy and makes future shortcut changes easier to break.
- Direction: Extract shortcut handling to a dedicated hook with stable callbacks.
