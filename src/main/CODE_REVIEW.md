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
