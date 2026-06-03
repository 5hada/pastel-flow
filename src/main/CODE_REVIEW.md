# Main Code Review

## Completed

### Tool Module asset path traversal 방어

- 완료 위치: `src/main/tools/runner/toolModuleRunner.ts`
- 반영 내용: manifest asset path를 `path.resolve`로 정규화하고, resolved path가 tool root 밖이면 예외를 던지도록 변경했다.
- 남은 범위: Tool Module 자체가 main process에서 실행되는 구조와 임의 파일 read/write 권한은 별도 개선이 필요하다.

### 기본 브라우저 열기 command parsing 위험 완화

- 완료 위치: `src/main/browsers/browserProcessLauncher.ts`, `src/main/browsers/browserUrlFilters.ts`
- 반영 내용: Windows `cmd /c start` 경유를 제거하고 Electron `shell.openExternal`을 사용한다. URL 필터는 `http`/`https` scheme만 허용하도록 변경했다.

### Workflow legacy IPC device policy 검사 적용

- 완료 위치: `src/main/workflows/ipc/workflowIpc.ts`
- 반영 내용: legacy list는 visible Workflow만 반환하고, legacy update/delete는 modern workflow IPC와 같은 execution policy 검사를 통과하도록 변경했다. legacy create는 permissions가 없으면 current device local-only policy를 부여한다.
- 남은 범위: legacy 채널 자체 제거 여부는 호환성 판단이 필요하다.

### Workflow 동시 실행 race 완화

- 완료 위치: `src/main/workflows/workflowRunner.ts`
- 반영 내용: workflowId 단위 in-memory lock을 추가해 같은 main process 안에서 동일 Workflow run 요청이 동시에 시작되지 않도록 했다.
- 남은 범위: store 수준 compare-and-set은 아직 없으므로 멀티 프로세스/미래 remote runner까지 고려하려면 추가 설계가 필요하다.

### Adapter stop result 타입 불일치 수정

- 완료 위치: `src/main/actions/adapters/actionAdapter.ts`
- 반영 내용: `ActionStopResult`의 config field명을 runner가 읽는 `config`로 통일했다.

### Crawler 응답 크기 제한과 timeout 추가

- 완료 위치: `src/main/actions/adapters/crawlerAdapter.ts`
- 반영 내용: `response.text()` 전체 로딩 대신 stream reader로 `maxBytes`까지만 읽고, 15초 AbortController timeout을 추가했다.

### Crawler private hostname 기본 차단

- 완료 위치: `src/main/actions/adapters/crawlerAdapter.ts`
- 반영 내용: `localhost`, `.localhost`, `.local`, IPv4 private/link-local/loopback, 일부 IPv6 local 대역을 fetch 전에 차단한다.
- 남은 범위: DNS rebinding, public hostname이 private IP로 resolve되는 경우, redirect 후 최종 URL 재검증은 아직 남아 있다.

### Tool Module network.fetch scheme 제한

- 완료 위치: `src/main/tools/runner/toolModuleRunner.ts`
- 반영 내용: Tool Module `network.fetch`는 `http`/`https` URL만 허용하도록 입력 검증을 추가했다.

## Critical

### 사용자 Tool Module이 main process에서 직접 실행됨

- location: `src/main/tools/runner/toolModuleRunner.ts:62`
- content: 등록된 `logic.mjs`를 동적 `import()`로 main process 안에서 실행한다. Tool Module 작성자가 악의적이거나 취약한 코드를 제공하면 Electron main process 권한과 동일한 권한으로 코드가 동작한다.
- effect: 로컬 파일 접근, 네트워크 접근, clipboard 접근, 프로세스 안정성 문제가 모두 main process에 전파된다.
- direction: 별도 worker process 또는 sandboxed utility process로 격리하고, permission manifest를 main process capability proxy로만 제공한다. 실행 timeout, 메모리 제한, 취소 처리도 필요하다.

### Tool Module 파일 권한이 경로 제한 없이 동작함

- location: `src/main/tools/runner/toolModuleRunner.ts:185`, `src/main/tools/runner/toolModuleRunner.ts:189`
- content: `file.read` 또는 `file.write` 권한이 있으면 Tool Module이 전달한 임의 경로를 그대로 `readFile`/`writeFile` 한다.
- effect: 사용자가 의도하지 않은 파일 읽기/덮어쓰기, 민감 파일 유출, 앱 데이터 손상 가능성이 있다.
- direction: 사용자 승인 파일 picker, workspace/dataDir allowlist, 확장자/크기 제한, overwrite confirmation을 추가한다.

## High

### Sync export export Action config as it

- location: `src/main/sync/store/mockSyncStore.ts:55`, `src/main/sync/store/mockSyncStore.ts:73`, `src/shared/browsers/types.ts:66`
- content: sync snapshot has original `actions`. Browser action config can have `existingProfilePath`, Tool Action config can haveinput default.
- effect: sync principle conflict
- direction: make export sanitizer by action type. eliminate local-only profile path, local output path, session snapshot, secret-like defaults.

### Crawler DNS/redirect 기반 SSRF 방어는 아직 부족함

- location: `src/main/actions/adapters/crawlerAdapter.ts:100`
- content: 기본 private hostname/IP 차단은 추가했지만, public hostname이 private IP로 resolve되는 경우나 redirect 이후 최종 URL은 아직 검증하지 않는다.
- effect: DNS rebinding 또는 redirect 기반 SSRF 가능성이 남아 있다.
- direction: DNS lookup 기반 private IP 차단, redirect manual 처리 후 최종 URL 재검증, allowlist 옵션을 추가한다.

### Not limit Native messaging host input

- location: `src/main/browsers/browserNativeMessagingHost.ts`'s embedded `nativeHostScript`
- content: reading body size by length prefix, but not limit size, repeat `Buffer.concat`.
- direction: add max message size limit, connection end when exceeded.

### Weak Browser bridge target verification

- location: `src/main/browsers/browserBridgeTransport.ts:64`, `src/main/browsers/browserBridgeTransport.ts:89`
- content:  judge bridge target as `url.endsWith('/bridge.html')` or `/background.js`. expected extension id verification is weak, `findLoadedExtensionId` using first extension target.
- direction: check `chrome-extension://${browserExtensionId}/...` strictly.

## Medium

### Workflow/Event prune channel naming subordinate to task

- location: `src/main/workflows/ipc/workflowIpc.ts:178`, `src/main/preload.ts:159`
- content: workflow event prune registered only at `tasks.pruneEvents` channel, workflow API also call it.
- direction: add `workflows.pruneEvents` channel, fitting preload. delete task channel.

### IPC handler input runtime validation shortage

- location: `src/main/workflows/ipc/workflowIpc.ts:53`, `src/main/workflows/ipc/workflowIpc.ts:89`, `src/main/secrets/ipc/secretIpc.ts:14`, `src/main/settings/ipc/appSettingsIpc.ts:15`
- content: get renderer input only by TypeScript type. no schema validation.
- direction: apply shared schema or zod parser by IPC boundary.

### File base store can lost update

- location: `src/main/workflows/store/workflowStore.ts`, `src/main/settings/store/appSettingsStore.ts`, `src/main/secrets/store/secretStore.ts`, `src/main/workflows/store/workflowRunEventStore.ts`
- content: read-modify-write not processed by individual file lock.
- direction: add store level write queue, atomic temp file rename, version check.

### WorkflowStore not guarantee referential integrity

- location: `src/main/workflows/store/workflowStore.ts:191`, `src/main/workflows/store/workflowStore.ts:271`
- content: not validate action id referenced by `actionRefs` when create/update.
- direction: validate action id existance at update/create, specify dangling ref at UI.

### replaceWorkflows/replaceWorkflowData duplication, normalize omission

- location: `src/main/workflows/store/workflowStore.ts:256`, `src/main/workflows/store/workflowStore.ts:265`
- content: doing same works, not apply normalize/default correction to import data.
- effect: sync import로 잘못된 schedule/state/permissions가 저장될 수 있다.
- direction: merge it, passing to action/workflow schema normalize.

### Secret value trim -> value deformed

- location: `src/main/secrets/store/secretStore.ts:117`
- content: apply `.trim()` to secret value.
- direction: delete space trimming, return notification prohibiting spaces before and after

### Secret name duplication allowed

- location: `src/main/secrets/store/secretStore.ts:115`
- content: can make secrets as same name.
- direction: name unique policy or same name mark disambiguation.

### Tool root scan excess

- location: `src/main/tools/store/toolModuleStore.ts:209`, `src/main/tools/store/toolModuleStore.ts:820`
- content: scan all root recursively except `node_modules`.
- direction: add depth/file count limit, ignore list, progress/cancel, permission error skip.

### Tool registration copy entire repository

- location: `src/main/tools/store/toolModuleStore.ts:176`
- content: `registerToolFromPath` copy entire source folder.
- direction: do not copy, use directly from path.

### startAtLogin setting not applied to OS

- location: `src/renderer/features/settings/AppSettingsPanel.tsx:104`
- content: UI, settings store has `startAtLogin`, but not in main process(not calling `app.setLoginItemSettings`).
- direction: Apply login items by platform, return failed status when settings update.

## Low

### Naming/Typo

- location: `src/main/actions/adapters/actionAdapter.ts:9`, `src/main/actions/adapters/actionAdapter.ts:26`, `src/main/main.ts:184`
- content: `updateAConfig`, `validateAConfig`, `Aconfig`, `createObservedworkflowStore` 등 비표준 명명 반복.
- effect: can evoke type/field inconsistency bug.
- direction: Organize to `updateConfig`, `validateConfig`, `actionConfig`, `createObservedWorkflowStore`.
