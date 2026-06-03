# Code Review Summary
2026-06-03

## Top priority elements to adjust

1. `Tool Module` run isolation: `src/main/tools/runner/toolModuleRunner.ts` dynamic import user provided `logic.mjs` at main process. File, network, and clipboard permissions also have weak path/domain restrictions.
2. Open Windows default browser: `src/main/browsers/browserProcessLauncher.ts` provide unverified URL `cmd /c start`. URL scheme validation and shell via removal is necessary.
3. Workflow Privilege bypass: `src/main/workflows/ipc/workflowIpc.ts`'s legacy workflow IPC dosen't pass through device policy check.
4. Workflow co-exexution race: `src/main/workflows/workflowRunner.ts`only checks the state before starting execution and does not have an atomic lock, so the same Workflow can be executed simultaneously.
5. Sync export sensitive information: `src/main/sync/store/mockSyncStore.ts`export Action config's original. form. Local-only values can be mixed: existing browser profile path, etc.
6. `preload.ts` channel connecting error: `window.pastelFlow.workflows.pruneEvents()` invoke not to workflow channel: task prune channel.
7. Renderer's legacy Task projection: Showing/editing Multi Action Workflow as first Action based Task, so Workflow/UI models are misaligned. Eliminate legacy task elements.
