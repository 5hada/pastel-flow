# Main Code Review

## Critical

### Tool Module logic still runs inside the Electron main process

- location: `src/main/tools/runner/toolModuleRunner.ts`
- current mitigation:
  - Tool execution now has a 30 second timeout guard.
  - Tool `assets` paths are confined to the registered Tool Module root.
  - Tool `files.open/save` paths are confined to the registered Tool Module root.
  - Tool `network.fetch` only accepts `http` and `https` URLs.
- remaining risk: `logic.mjs` is still dynamically imported and executed in the Electron main process. A malicious Tool Module can still run arbitrary JavaScript with main-process privileges before or outside the provided context APIs.
- recommended next step: run Tool Module logic in a separate sandboxed process with a narrow RPC protocol, no ambient Node/Electron imports, explicit timeout/cancel handling, and manifest permission checks enforced by the parent process.

## High

### Windows default browser launching still goes through `cmd /c start`

- location: `src/main/browsers/browserProcessLauncher.ts`
- current mitigation: browser navigation URL validation now accepts only `http` and `https` through the shared browser URL helper.
- remaining risk: Windows launch still goes through shell mediation via `cmd /c start`, which is a larger parsing surface than a direct platform API.
- recommended next step: replace shell-based launching with a direct Electron or OS API that does not require command-line shell parsing.

### Workflow run requests still need an atomic lock

- location: `src/main/workflows/workflowRunner.ts`
- remaining risk: checking the current Workflow state before marking it `running` can still allow concurrent run requests to start the same Workflow.
- recommended next step: add a workflowId-scoped in-memory lock or compare-and-set store update before execution starts.
