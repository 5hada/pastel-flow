# Pastel Flow 구조 문서

이 문서는 에이전트가 Pastel Flow 구현을 이어가기 위한 작업 기준이다. 코드 구조를 다시 추측하지 말고, 아래 책임 경계와 데이터 흐름을 우선 따른다.

## 1. 프로젝트 스택

- 데스크톱 런타임: Electron
- Renderer: React + TypeScript
- 번들러/개발 서버: Vite
- 초기 저장 방식: Electron `userData` 경로의 `tasks.json`
- Action/Workflow 저장 방식: Electron `userData` 경로의 `tasks.json` 안에 `tasks`, `actions`, `workflows`를 함께 저장
- 앱 설정 저장 방식: Electron `userData` 경로의 `appSettings.json`
- 기기 식별자 저장 방식: Electron `userData` 경로의 `device.json`
- 로컬 secret 저장 방식: Electron `userData` 경로의 `secrets.json`
- 실행 이벤트 저장 방식: Electron `userData` 경로의 `taskRunEvents.json`
- Tool Module 등록 저장 방식: Electron `userData` 경로의 `toolModules.json`
- Tool Module 복사 위치: Electron `userData` 경로의 `tool-modules/`
- mock sync export 저장 방식: Electron `userData` 경로의 `syncExport.json`
- 서버 DB 연동 상태: 현재 구현 범위에서 제외. 실제 서버, transport, 계정 backend 없이 로컬 mock 파일 sync만 사용
- 현재 MVP: 브라우저 탭 그룹 템플릿 생성, 수정, 삭제, 저장, 실행, 목록 표시
- 현재 브라우저 실행 기본값: `dedicated_profile`

## 2. 책임 경계

### `electron`

Electron main process 영역이다.

- 파일 시스템 접근
- Electron `app.getPath('userData')` 접근
- IPC 핸들러 등록
- 외부 브라우저 프로세스 실행
- 브라우저 프로필 디렉터리 생성
- 향후 secret 저장소와 adapter 실행

### `src`

React renderer 영역이다.

- 작업 목록 표시
- 작업 생성, 수정, 삭제 UI
- 작업 실행 버튼과 상태 표시
- 사용자 입력 검증과 오류 표시
- Electron 기능은 직접 호출하지 않고 preload API만 사용

### `src/shared`

main process와 renderer가 함께 쓰는 타입과 순수 helper 영역이다.

- 작업 템플릿 타입
- 작업 config/state/permission 타입
- 기본값 생성 함수
- Node/Electron API 의존 코드는 넣지 않는다.

## 3. 현재 주요 경로

```text
electron/
  main.ts                         Electron 앱 시작점, task store와 IPC 등록
  preload.ts                      window.pastelFlow API 노출
  devices/
    store/
      deviceStore.ts              device.json 기반 현재 기기 ID 저장소
  settings/
    ipc/
      appSettingsIpc.ts           settings:get/update IPC 등록
    store/
      appSettingsStore.ts         appSettings.json 기반 설정 저장소
  secrets/
    ipc/
      secretIpc.ts                secrets:list/create/delete IPC 등록
    store/
      secretStore.ts              secrets.json 기반 로컬 secret 저장소
  tools/
    ipc/
      toolModuleIpc.ts            tools:list/register-folder/run/create-action IPC 등록
    runner/
      toolModuleRunner.ts         logic.js 동적 import 실행, permission 기반 context API 제공
    store/
      toolModuleStore.ts          toolModules.json 등록 저장소, manifest/logic 검증, tool-modules 복사
  tasks/
    adapters/
      taskAdapter.ts              작업 adapter 공통 인터페이스
      browserExecutableFinder.ts  Chrome, Edge, Chromium 실행 파일 탐색
      browserTabGroupAdapter.ts   전용 프로필 디렉터리 준비와 브라우저 프로세스 실행
      crawlerAdapter.ts           URL 목록을 fetch해 로컬 JSON 결과 파일로 저장
      dryRunAdapters.ts           Discord/Notion/trading dry-run 실행 adapter
      taskAdapterRegistry.ts      작업 타입별 adapter 조회
    ipc/
      taskIpc.ts                  tasks:list/create/update/delete IPC 등록
    runner/
      taskRunner.ts               작업 조회, adapter 실행, 상태 저장, legacy task 실행 이벤트에 workflow/action run 참조 기록
    scheduler/
      taskScheduler.ts            Workflow schedule을 확인해 due Workflow 실행
    store/
      taskRunEventStore.ts        taskRunEvents.json 기반 실행 이벤트 저장소
      taskStore.ts                tasks.json 기반 로컬 저장소, legacy task를 단일 Action/Workflow로 동기화
  workflows/
    runner/
      workflowRunner.ts           Workflow 조회, enabled Action 확인, legacy task 기반 Workflow 실행/중지 위임

src/
  App.tsx                         renderer 앱 진입점. PastelFlowApp 연결과 최상위 스타일 import만 담당
  App.css                         기능별 renderer 스타일 모듈 import만 담당
  index.css                       전역 스타일
  renderer/
    app/
      PastelFlowApp.tsx           Pastel Flow renderer 상태, IPC 호출, 화면 모드 orchestration
      taskFormState.ts            작업/설정/Secret 폼 상태 타입, 기본값, 초기 snapshot
      usePastelFlowApp.ts         기능별 hook을 조립하고 화면 모드 전환/초기 bootstrap만 담당
      hooks/
        useActionWorkflowData.ts  Action/Workflow 목록 조회와 선택 상태
        useAppSettingsData.ts     앱 설정 snapshot, 저장, 테마 적용, 목록 표시 설정 변경
        useSecretsData.ts         Secret 목록/status/form과 생성/삭제 handler
        useSyncData.ts            mock sync export/import, 실행 이벤트 prune handler
        useTaskData.ts            legacy task 목록, 선택, 생성/수정/삭제/실행/중지, 실행 이벤트
        useToolModulesData.ts     Tool Module 등록/목록/실행/Action 생성 handler
      components/
        shell/
          TopModeBar.tsx          상단 모드 전환 컨트롤
          WorkspaceSidebar.tsx    모드별 좌측 탐색/필터 패널
        run/
          TaskLaunchPanel.tsx     실행 페이지 Workflow 런처 목록
          TaskListDisplayToggle.tsx 실행 목록/그리드 표시 전환 컨트롤
        actions/
          ActionWorkspacePanel.tsx Action 목록/상세와 legacy Action 생성 진입
        tasks/
          CreateTaskPanel.tsx     단일 Action Workflow 생성 폼
          EditWorkspace.tsx       Workflow 상세/legacy task 편집 화면 조립
          TaskEditPanel.tsx       작업 설정 편집 폼
          TaskFormFields.tsx      작업 타입별 config, schedule, policy 폼 필드
          TaskRunEventsPanel.tsx  작업 실행 이벤트 검색/상태 필터 패널
          DetailItem.tsx          상세 정보 dl item 공용 컴포넌트
        tools/
          ToolsPanel.tsx          Tool Module 등록/목록/실행/Action 생성 화면
        settings/
          AppSettingsPanel.tsx    설정 카테고리별 편집, secret, sync, data management 화면
      utils/
        taskFormTransforms.ts     폼 입력을 task config/policy/schedule/settings 값으로 변환
        viewLabels.ts             renderer 표시 label, 날짜/상태/summary formatter
    api/
      tasksApi.ts                 renderer에서 보는 preload API 타입
    styles/
      tokens.css                  테마 변수와 색상 토큰
      layout.css                  앱 shell, header, sidebar, workspace layout
      forms.css                   폼, 버튼, 입력, 오류/성공 메시지 공용 스타일
      tasks.css                   실행/Action/Workflow 목록, 상세, 실행 이벤트 스타일
      tools.css                   Tool Module 목록, runner, manifest input 컨트롤 스타일
      settings.css                설정/Secret/기기/테마 preview 스타일
      responsive.css              모바일/좁은 viewport 대응 스타일
    types/
      global.d.ts                 window.pastelFlow 전역 타입 선언
  shared/
    devices.ts                    현재 기기, 연동 기기, 허용 수준 타입과 helper
    secrets.ts                    로컬 secret 메타데이터와 생성 입력 타입
    settings.ts                   앱 설정 타입, 기본값, normalize helper
    tools.ts                      Tool Module manifest, 등록 정보, 실행 결과 타입
    tasks/
      policies.ts                 기기 visibility/execution 정책 helper
      types.ts                    작업 템플릿과 브라우저 config 타입
      defaults.ts                 기본 state/config/policy
      index.ts                    shared tasks barrel export
```

## 4. 현재 데이터 흐름

```text
App.tsx
  -> renderer/app/PastelFlowApp.tsx
  -> window.pastelFlow.tasks / window.pastelFlow.settings
  -> electron/preload.ts
  -> IPC channel: tasks:* | settings:*
  -> electron/tasks/ipc/taskIpc.ts / electron/settings/ipc/appSettingsIpc.ts
  -> electron/tasks/store/taskStore.ts / electron/settings/store/appSettingsStore.ts
  -> electron/tasks/runner/taskRunner.ts
  -> electron/tasks/adapters/browserTabGroupAdapter.ts
  -> Electron userData/tasks.json / appSettings.json
```

현재 UI는 브라우저 탭 그룹 생성, 수정, 삭제, 실행, 목록 표시와 앱 설정 편집을 지원한다. 이름, 브라우저 종류, 실행 방식, 초기 URL 목록을 renderer에서 편집하고 `tasks.json`에 저장한다. `taskStore`는 legacy `tasks`를 계속 보존하면서 각 task를 같은 ID 기반의 단일 Action과 단일 Workflow로 자동 동기화한다. `actions:list`, `workflows:list`, `workflows:run`, `workflows:stop` IPC는 새 모델 조회와 legacy task 기반 Workflow 실행을 제공한다. `dedicated_profile` 실행 방식에서는 전용 프로필 디렉터리를 만든 뒤 Chrome, Edge, Chromium 실행 파일을 찾아 `--user-data-dir` 인자로 브라우저 프로세스를 연다. 초기 URL이 있으면 브라우저 실행 인자로 같이 전달한다. `extension_controlled` 실행 방식은 Pastel Flow companion extension을 로드하고, DevTools 포트로 확장 서비스워커를 호출해 열린 탭 URL과 탭 그룹 이름, 색, 접힘 상태, 그룹-탭 관계를 `config.tabGroupSnapshot`에 저장한다. 확장 프로그램 제어 실행은 기본적으로 작업 전용 프로필을 쓰지만, 사용자가 `profileSource=existing_profile`과 `existingProfilePath`를 명시하면 평소 사용하는 브라우저 user data/profile 경로를 `--user-data-dir`로 실행할 수 있다. `default_browser_deeplink` 실행 방식은 전용 프로필을 만들지 않고 초기 URL을 OS 기본 브라우저로 여는 최소 실행만 담당한다.

도구 페이지는 `tool-schema.md` 규격 Tool Module 등록과 실행만 지원한다. 사용자가 도구 폴더를 선택하면 main process가 `manifest.json`과 `logic.js`를 검증한 뒤 Electron `userData/tool-modules/` 아래로 복사하고 `toolModules.json`에 등록한다. renderer는 좌측 패널과 본문에 등록된 도구 목록을 표시하고, manifest inputs 기반 자동 실행 폼을 표시한다. input의 `ui` 메타데이터가 있으면 toggle, checkbox, select, radio, color, list, textarea, json 같은 구체 컨트롤로 렌더링한다. 단독 실행은 `tools:run` IPC를 통해 main process에서 `logic.js`를 동적 import해 수행한다. 실행 context는 manifest permissions에 선언된 `clipboard`, `file.read`, `file.write`, `network` API만 노출한다. 도구 페이지의 `Action 생성`은 등록된 module을 `tool_action` Action 정의로 `tasks.json`에 추가한다. 아직 이 Action을 Workflow 작성 화면에 삽입하거나 순수 Workflow runner에서 실행하는 UI/engine 흐름은 남은 작업이다.

설정 페이지는 일반, 브라우저, 단축키, 기기, Secret, 동기화, 실행 이벤트, 데이터 관리 카테고리로 나뉜다. 기존 도구 페이지에 있던 mock sync export/import와 실행 이벤트 정리 기능은 설정 페이지의 동기화/실행 이벤트 카테고리로 이동했다. 데이터 관리 카테고리는 현재 `userData` 위치와 주요 로컬 파일명을 표시한다.

작업 목록과 실행 버튼은 모든 작업 타입을 표시한다. 생성/수정 UI는 브라우저 탭 그룹, crawler, Discord bot dry-run, Notion sync dry-run, trading bot skeleton dry-run 설정을 저장할 수 있다. `crawler` adapter는 `config.urls`를 fetch해 `crawler-results` 디렉터리에 JSON 결과를 저장하고, URL 형식과 성공/실패 개수를 기록한다. `discord_bot`, `notion_sync`는 외부 API 연결 전 dry-run만 지원하며 `dry-run-results` 디렉터리에 실행 artifact를 저장한다. `trading_bot`은 skeleton dry-run만 제공하며 실행 artifact를 남기되 실제 자동매매, 실거래 주문, 거래소 API 주문 실행은 구현하지 않는다.

작업에는 선택적 `schedule`이 있고 legacy task와 동기화된 Workflow에도 같은 schedule이 노출된다. 현재 예약 실행은 interval minute, daily wall-clock, weekly wall-clock 방식을 지원한다. `taskScheduler`가 1분마다 Workflow 목록을 확인해 `nextRunAt`이 지난 Workflow를 `workflowRunner.runWorkflow`로 실행한다. 실행 권한 정책을 통과하지 못하거나 이미 실행 중인 Workflow는 예약 실행하지 않는다. daily/weekly 스케줄은 로컬 시간 기준 `HH:mm`과 요일 번호 `0=일요일`부터 `6=토요일`을 사용한다.

브라우저 작업에는 `dynamicTemplateUpdates` 토글이 있다. 이 값이 켜져 있으면 adapter가 브라우저를 `--remote-debugging-port`와 함께 실행하고, 실행 중 DevTools target 목록을 주기적으로 읽어 열린 탭 URL 스냅샷을 유지한다. 브라우저 정상 종료 시 마지막 URL 목록을 작업 config의 `initialUrls`로 저장한다. 이 기능은 전용 프로필 MVP에서 가능한 URL 목록 반영이며, 실제 탭 그룹 이름, 색, 그룹 관계는 확장 프로그램 기반 실행 방식에서 다룬다.

앱 설정은 `appSettings.json`에 저장한다. 설정에는 테마, 기본 브라우저, 새 작업 기본 이름, 브라우저별 실행 파일 수동 경로, 연동 기기별 허용 수준이 포함된다. 브라우저 실행 파일 경로가 설정되어 있으면 자동 탐색보다 우선 사용하고, 경로가 비어 있으면 OS별 기본 경로와 `PATH`를 탐색한다.

설정에는 실행 이벤트 보존 개수도 포함된다. `taskRunEventStore`는 이벤트 추가 시 현재 설정값을 읽어 `taskRunEvents.json`의 저장 개수를 제한한다. renderer는 선택한 작업의 최근 실행 이벤트를 검색어와 상태별로 필터링한다.

설정에는 sync export에 포함할 실행 이벤트 개수도 포함된다. mock sync export는 이 설정값만큼 최근 실행 이벤트를 `syncExport.json`에 포함한다. 도구 화면의 실행 이벤트 정리는 현재 보존 개수를 즉시 적용해 오래된 항목을 제거한다.

현재 기기 ID는 `device.json`에 저장한다. `tasks:list`는 main process에서 현재 기기와 연동 기기 허용 수준, 작업 `DevicePolicy.visibility`를 확인한 뒤 허용된 작업만 renderer에 반환한다. 따라서 허용되지 않은 작업은 renderer 상태에 들어오지 않으며 목록에도 표시되지 않는다. `tasks:run`, `tasks:update`, `tasks:delete`는 `DevicePolicy.execution`을 확인한 뒤 허용되지 않으면 오류를 반환한다.

작업 생성/수정 UI는 작업별 표시 정책, 실행 정책, 허용 기기 ID, secret 참조를 편집한다. 제한 정책이나 secret 참조가 있는 작업은 목록에서 `제한됨` 배지를 표시한다. Secret 값은 Electron `safeStorage`로 암호화해 `secrets.json`에 저장하고, renderer에는 메타데이터만 반환한다. 기존 평문 `value`가 남아 있으면 secret 목록 조회/생성/삭제 시 암호화 형식으로 자동 마이그레이션한다. Secret을 삭제하면 main process가 모든 작업의 `secretRefs`에서 해당 ID를 제거한다.

Secret 설정 화면은 Electron `safeStorage` 사용 가능 여부, 선택된 backend, 안내 메시지를 표시한다. 암호화가 불가능한 환경에서는 secret 생성이 main process에서 거부되고, renderer는 해당 오류를 설정 화면에 표시한다.

작업 실행 이벤트는 `taskRunEvents.json`에 append-only 형태로 저장한다. `taskRunner`는 실행 시작, 실행 요청 처리, 실행 이후 상태 변경, 실패를 이벤트로 기록한다. 새 이벤트는 기존 `taskId`와 함께 `workflowId`, `actionRunId`, `legacyTaskId`를 기록할 수 있다. renderer는 선택한 작업의 최근 실행 이벤트를 수정 화면에 표시한다. 이벤트 조회도 task visibility policy를 통과한 작업에 대해서만 허용한다.

작업 상세 화면은 작업 타입, 설정 요약, 예약, 상태, 마지막 실행 시간, 마지막 메시지, 출력 경로, 생성/수정 시간, 표시/실행 정책을 표시한다. crawler와 dry-run adapter가 남긴 JSON artifact 경로는 `state.outputPath`에 저장되어 상세 화면에서 확인할 수 있다.

서버 DB 동기화 초안은 `sync-schema.md`에 둔다. 이 문서는 서버에 동기화할 작업 설정, 기기 정책, 실행 이벤트와 로컬 전용으로 남길 secret 값, 브라우저 프로필, 기기별 실행 파일 경로의 경계를 정의한다. 현재 구현은 실제 서버 DB 연동, transport, 계정 backend를 만들지 않고 mock 파일 export/import까지만 지원한다.

mock sync는 `syncExport.json` 기본 파일을 사용하며, 도구 화면에서 외부 JSON 파일로 내보내거나 외부 JSON 파일에서 가져올 수 있다. export snapshot은 legacy `tasks`와 새 `actions`, `workflows`를 함께 포함한다. 가져오기 병합은 task ID 기준으로 최신 `updatedAt` 작업을 기본으로 하되, config/policy/schedule/state 일부를 필드 단위로 병합하고 로컬 전용 `state.localProfilePath`와 실행 중 상태는 보존한다. Action/Workflow 정의는 ID 기준으로 최신 `updatedAt` 정의를 유지한다.

도구 화면의 sync 상태는 `mode=mock_file`, `serverDbSyncEnabled=false`로 표시한다. 이 값은 실제 서버 DB 연동이 비활성화되어 있고 현재 구현이 로컬 mock snapshot에 한정된다는 계약이다.

작업 adapter는 `TaskRunContext.updateState`를 통해 실행 이후의 비동기 상태 변화를 저장할 수 있다. 브라우저 탭 그룹 adapter는 브라우저 프로세스 종료 이벤트를 감지해 정상 종료 시 `idle`, 비정상 종료 시 `failed`와 오류 메시지를 저장한다. `taskRunner`는 작업 상태가 저장될 때 `onTaskUpdated` 콜백을 호출하고, `electron/main.ts`는 모든 BrowserWindow에 `tasks:changed` 이벤트를 보낸다. renderer는 `window.pastelFlow.tasks.onChanged`로 이벤트를 구독해 목록의 작업 상태를 실시간으로 병합한다.

브라우저 탭 그룹 adapter는 실행 중인 브라우저 프로세스를 task ID 기준으로 추적한다. renderer가 `tasks:stop`을 호출하면 `taskRunner.stopTask`가 adapter `stop`을 호출하고, 성공 시 작업 상태를 `idle`로 저장하며 실행 이벤트를 남긴다.

## 5. 다음 구현 위치

- 작업 타입 변경: `src/shared/tasks/types.ts`
- 작업 기본값 변경: `src/shared/tasks/defaults.ts`
- 앱 설정 변경: `src/shared/settings.ts`, `electron/settings/store/appSettingsStore.ts`, `src/App.tsx`
- 기기 정책 변경: `src/shared/devices.ts`, `src/shared/tasks/policies.ts`, `electron/devices/store/deviceStore.ts`, `electron/tasks/ipc/taskIpc.ts`
- Secret 저장소 변경: `src/shared/secrets.ts`, `electron/secrets/store/secretStore.ts`, `electron/secrets/ipc/secretIpc.ts`
- 실행 이벤트 변경: `src/shared/taskRunEvents.ts`, `electron/tasks/store/taskRunEventStore.ts`, `electron/tasks/runner/taskRunner.ts`, `src/App.tsx`
- 동기화 스키마 변경: `sync-schema.md`
- mock sync export/import 변경: `src/shared/sync.ts`, `electron/sync/store/mockSyncStore.ts`, `electron/sync/ipc/syncIpc.ts`, `electron/preload.ts`, `src/renderer/api/tasksApi.ts`, `src/App.tsx`
- 서버 DB sync 실제 구현은 현재 진행하지 않는다. 관련 변경은 문서/타입의 경계 표시와 mock sync 유지에 한정한다.
- 로컬 저장 방식 변경: `electron/tasks/store/taskStore.ts`
- 새 IPC 추가: `electron/tasks/ipc/taskIpc.ts`, `electron/preload.ts`, `src/renderer/api/tasksApi.ts`
- 브라우저 실행 구현: `electron/tasks/adapters/browserTabGroupAdapter.ts`
- 브라우저 실행 파일 탐색 변경: `electron/tasks/adapters/browserExecutableFinder.ts`
- 작업 실행 버튼/상태 UI: `src/App.tsx`
- 예약 실행 변경: `src/shared/tasks/types.ts`, `src/shared/tasks/defaults.ts`, `electron/tasks/scheduler/taskScheduler.ts`, `electron/main.ts`, `src/App.tsx`

브라우저 실행 기능을 추가할 때는 adapter가 프로필 경로 생성과 외부 프로세스 실행을 담당하고, renderer는 실행 요청과 결과 표시만 담당한다.

## 6. 구현 규칙

- 기본 브라우저 프로필은 직접 조작하지 않는다.
- 템플릿별 전용 프로필 디렉터리를 사용한다.
- 기존 브라우저 프로필은 사용자가 명시적으로 경로를 입력한 `extension_controlled` 작업에서만 사용한다. 자동 탐색이나 기본 프로필 강제 조작은 하지 않는다.
- `BrowserTabGroupConfig.runMode`는 실행 전략을 나타낸다. MVP 기본값은 `dedicated_profile`이고, 향후 확장 프로그램 기반 제어는 `extension_controlled`로 추가한다.
- 전용 프로필 방식은 작업별 로그인을 반복시킬 수 있으므로, 로그인 공유가 필요한 기능은 확장 프로그램 기반 실행 전략에서 다룬다.
- API key, token, 로그인 세션 같은 secret은 task `config`에 직접 저장하지 않는다.
- `dist-electron`은 빌드 산출물이므로 직접 수정하지 않는다.
- Electron/Node API는 renderer에서 직접 사용하지 않는다.
- main/renderer 공유 타입은 `src/shared`에 두고, Electron 의존 코드는 `electron`에 둔다.
- 작업 타입별 실행 로직은 `TaskAdapter` 형태로 추가한다.
- 구현 검증을 위해 dev 서버 응답 확인이나 UI 직접 확인을 하지 않는다.

## 7. 검증 명령

문서만 변경한 경우에도 기존 상태 확인이 필요하면 다음 명령을 사용한다.

```bash
npx tsc --noEmit
npm run lint
```
