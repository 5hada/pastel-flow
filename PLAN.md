# Pastel Flow 계획서

## 1. 프로젝트 비전

Pastel Flow는 반복적으로 사용하는 작업 환경을 템플릿으로 저장하고 실행하는 로컬 우선 데스크톱 앱이다.

초기 목표는 브라우저 탭 그룹을 작업 템플릿으로 저장하고, 템플릿 실행 시 해당 브라우저 환경을 다시 여는 것이다. 이후 Discord bot, crawler, Notion sync, trading bot 같은 작업을 같은 구조 안에서 확장한다.

최종적으로는 여러 기기에서 동일한 작업 설정을 불러오되, 기기별 권한과 민감 정보 정책을 적용해 특정 작업이나 secret이 허용된 기기에서만 보이거나 실행되도록 만든다.

이 프로젝트의 정체성은 단순 자동화 도구가 아니라, **작업 템플릿의 설정, 실행 상태, 권한, 동기화를 관리하는 플랫폼**이다.

## 2. 핵심 원칙

- **로컬 우선**: 첫 버전은 로컬 저장소를 기준으로 동작한다. 서버 DB 동기화는 이후 단계에서 추가한다.
- **상태 보존**: 작업 실행 중 사용자가 변경한 상태는 다음 실행에서 가능한 한 유지한다.
- **기기별 권한**: 민감한 작업은 신뢰된 기기에서만 열람하거나 실행할 수 있도록 설계한다.
- **secret 분리**: API key, token, 거래소 key, 로그인 세션 같은 민감 정보는 일반 작업 설정과 분리한다.
- **확장 가능한 작업 구조**: 작업 타입별 실행 로직은 코어에 직접 누적하지 않고 adapter 구조로 추가한다.
- **Electron 역할 분리**: main process는 로컬 리소스, 파일 시스템, 외부 프로세스 실행을 담당하고, React renderer는 작업 관리 UI를 담당한다.

## 3. MVP 1: 브라우저 탭 그룹 템플릿

첫 번째 MVP는 브라우저 탭 그룹 작업을 만드는 데 집중한다.

사용자는 작업 템플릿을 만들고, 템플릿에 브라우저 탭 그룹 설정을 저장한다. 템플릿을 실행하면 Pastel Flow가 해당 작업 전용 브라우저 프로필을 열고, 사용자는 그 안에서 탭을 추가하거나 닫거나 로그인 상태를 변경할 수 있다. 브라우저를 종료한 뒤 다시 같은 템플릿을 실행하면 이전 세션이 유지되어야 한다.

초기 구현 방식은 **템플릿별 전용 브라우저 프로필 실행**으로 고정한다.

- 각 브라우저 작업 템플릿은 고유한 `profileId`를 가진다.
- Electron main process는 해당 `profileId`에 대응하는 사용자 데이터 디렉터리로 Chrome, Edge, Chromium 계열 브라우저를 실행한다.
- 탭, 세션, 로그인 상태 등 브라우저가 자체적으로 보존하는 데이터는 해당 프로필 디렉터리에 남긴다.
- MVP에서는 기존 사용자의 기본 브라우저 프로필을 직접 조작하지 않는다.
- 브라우저 확장 프로그램 방식은 이후 고급 기능으로 검토한다.

전용 프로필 방식은 작업별 격리와 구현 단순성이 장점이지만, 로그인 측면에서는 한계가 있다. 같은 서비스라도 작업마다 다시 로그인해야 할 수 있고, SSO, 2FA, 보안 알림이 반복될 수 있다. 따라서 브라우저 작업 config에는 실행 방식을 나타내는 `runMode`를 포함한다. MVP 기본값은 `dedicated_profile`이며, 이후 확장 프로그램 기반 제어가 가능해지면 `extension_controlled` 실행 방식을 같은 작업 모델 안에 추가한다.

## 4. 아키텍처 방향

현재 프로젝트는 `Electron + React + TypeScript + Vite` 기반이다. 이 구조를 유지하면서 역할을 다음처럼 나눈다.

### Renderer

React renderer는 사용자 인터페이스를 담당한다.

- 작업 템플릿 목록 표시
- 작업 생성, 수정, 삭제 UI
- 작업 실행 버튼
- 작업 상태와 최근 실행 로그 표시
- 기기 권한과 민감 작업 표시 정책 UI

### Main Process

Electron main process는 로컬 시스템과 맞닿은 작업을 담당한다.

- 작업 템플릿 저장소 접근
- 브라우저 프로필 디렉터리 관리
- 외부 브라우저 프로세스 실행
- 작업 실행 상태 기록
- secret 저장소 접근
- 향후 백그라운드 작업 adapter 실행

### Storage

초기 저장소는 로컬 우선으로 설계한다.

후보는 SQLite 또는 앱 데이터 디렉터리의 구조화된 파일 저장소이다. MVP에서는 구현 속도를 고려해 단순한 로컬 저장 방식으로 시작할 수 있지만, 데이터 모델은 이후 SQLite와 서버 DB 동기화로 옮겨갈 수 있게 유지한다.

서버 DB 동기화는 후속 단계에서 추가한다. 동기화 대상은 일반 작업 설정과 비민감 상태를 우선으로 하며, secret과 로그인 세션은 기본적으로 로컬 전용으로 다룬다.

## 5. 데이터 모델 초안

아래 타입은 초기 구현 기준을 맞추기 위한 개념 모델이다. 실제 코드 추가 시 TypeScript 타입 또는 schema로 옮긴다.

```ts
type TaskType =
  | 'browser_tab_group'
  | 'discord_bot'
  | 'crawler'
  | 'notion_sync'
  | 'trading_bot';

type TaskTemplate<TConfig = unknown, TState = unknown> = {
  id: string;
  name: string;
  type: TaskType;
  config: TConfig;
  state: TState;
  permissions: DevicePolicy;
  createdAt: string;
  updatedAt: string;
};

type BrowserTabGroupConfig = {
  profileId: string;
  initialUrls: string[];
  browserKind: 'chrome' | 'edge' | 'chromium';
  restorePolicy: 'browser_profile' | 'initial_urls_only';
  runMode: 'dedicated_profile' | 'extension_controlled' | 'default_browser_deeplink';
};

type TaskState = {
  status: 'idle' | 'running' | 'failed';
  lastRunAt?: string;
  lastError?: string;
  localProfilePath?: string;
};

type DevicePolicy = {
  visibility: 'all_devices' | 'trusted_devices' | 'specific_devices' | 'local_only';
  execution: 'anywhere' | 'trusted_only' | 'specific_devices' | 'local_only';
  allowedDeviceIds?: string[];
  secretRefs?: SecretRef[];
};

type SecretRef = {
  id: string;
  scope: 'local_device' | 'trusted_devices';
  description?: string;
};
```

## 6. 작업 Adapter 구조

브라우저 탭 그룹 외의 작업은 `TaskAdapter` 구조로 확장한다.

코어 앱은 작업 템플릿 저장, 실행 요청, 권한 확인, 로그 기록, 상태 업데이트를 담당한다. 각 작업 타입의 실제 실행 방식은 adapter가 담당한다.

```ts
type TaskAdapter<TConfig = unknown, TState = unknown> = {
  type: TaskType;
  validateConfig(config: TConfig): Promise<void> | void;
  run(context: TaskRunContext<TConfig, TState>): Promise<TaskRunResult<TState>>;
  stop?(taskId: string): Promise<void>;
  getState?(taskId: string): Promise<TState>;
};

type TaskRunContext<TConfig, TState> = {
  task: TaskTemplate<TConfig, TState>;
  deviceId: string;
  dataDir: string;
};

type TaskRunResult<TState> = {
  state: TState;
  message?: string;
};
```

초기에는 `browser_tab_group` adapter만 구현한다. 이후 Discord bot, crawler, Notion sync, trading bot은 같은 인터페이스를 따르는 adapter로 추가한다.

## 7. 현재 구현 상태

이 섹션은 다음 구현자가 현재 코드 상태를 빠르게 파악하기 위한 기준이다.

### 완료

- `src/shared/tasks`에 작업 템플릿 타입, 브라우저 탭 그룹 config, 기본 상태, 기본 권한 정책을 정의했다.
- 브라우저 탭 그룹 config에 `runMode`를 추가해 전용 프로필 방식과 향후 확장 프로그램 기반 실행을 구분할 수 있게 했다.
- `electron/tasks/store/taskStore.ts`에 `tasks.json` 기반 로컬 저장소를 구현했다.
- `electron/tasks/ipc/taskIpc.ts`에 작업 CRUD IPC 핸들러를 분리했다.
- `electron/preload.ts`에서 renderer가 사용할 `window.pastelFlow.tasks` API를 노출했다.
- `src/App.tsx`를 Pastel Flow 최소 UI로 교체해 브라우저 탭 그룹 생성과 목록 표시를 지원한다.
- 브라우저 탭 그룹의 이름, 브라우저 종류, 실행 방식, 초기 URL을 UI에서 생성/수정할 수 있게 했다.
- 저장된 브라우저 탭 그룹을 UI에서 삭제할 수 있게 했다.
- 작업 실행 IPC, preload API, adapter registry, task runner를 추가했다.
- `dedicated_profile` 실행 방식에서 전용 브라우저 프로필 디렉터리를 생성하고 실행 상태를 저장한다.

### 부분 완료

- 실행 버튼과 실행 상태 갱신 흐름은 구현됐지만 실제 Chrome, Edge, Chromium 프로세스 실행은 아직 없다.
- `browser_tab_group` adapter는 전용 프로필 디렉터리 준비까지만 처리한다.
- `extension_controlled`, `default_browser_deeplink` 실행 방식은 모델에만 있고 아직 실행되지 않는다.

### 미완료

- Chrome, Edge, Chromium 실행 파일 탐색과 전용 프로필 실행.
- secret 저장소, 기기 식별자, 권한 정책 적용 로직.

### 현재 단계 완료 기준

- 앱에서 브라우저 탭 그룹 템플릿을 생성할 수 있다.
- 생성된 템플릿이 Electron `userData` 경로의 `tasks.json`에 저장된다.
- 앱 재시작 후에도 저장된 템플릿 목록을 다시 불러올 수 있다.

## 8. 로드맵

### Phase 1: Local MVP

- [x] 기본 앱 레이아웃을 Pastel Flow 전용 UI로 교체한다.
- [x] 작업 템플릿 타입과 기본값을 정의한다.
- [x] 브라우저 작업 실행 방식 `runMode`를 모델에 반영한다.
- [x] `tasks.json` 기반 로컬 저장소를 만든다.
- [x] 작업 목록 조회와 브라우저 탭 그룹 생성 UI를 만든다.
- [x] 작업 수정과 삭제 UI를 만든다.
- [x] 브라우저 종류 선택과 초기 URL 입력 UI를 만든다.
- [x] 작업 실행 IPC와 preload API를 추가한다.
- [x] adapter registry와 task runner를 추가한다.
- [x] `browser_tab_group` adapter에서 전용 프로필 디렉터리를 준비한다.
- [x] 실행 상태, 마지막 실행 시간, 오류, 로컬 프로필 경로를 저장한다.
- [x] Chrome, Edge, Chromium 실행 파일 탐색과 오류 처리를 구현한다.
- [x] 템플릿 실행 시 지정 브라우저를 전용 프로필로 실행한다.
- [x] `initialUrls`가 있으면 브라우저 실행 인자로 전달한다.
- [x] 브라우저 실행 실패 시 사용자가 이해할 수 있는 오류 메시지를 저장한다.
- [x] 실행된 브라우저 종료 이후 상태 표기 정책을 구현한다.
- [ ] 앱 재시작 후 작업 설정과 실행 상태가 유지되는지 검증한다.

다음 구현 우선순위:

1. 앱 재시작 후 작업 설정과 실행 상태가 유지되는지 검증한다.
2. 브라우저 실행 파일 수동 지정 설정을 검토한다.
3. 실행 상태 변경을 renderer에 실시간으로 알려주는 이벤트 흐름을 검토한다.

### Phase 2: 권한과 Secret 기반

- 기기 식별자를 생성하고 로컬에 저장한다.
- 작업 템플릿에 visibility와 execution policy를 추가한다.
- secret을 일반 config와 분리한다.
- 민감 작업과 일반 작업을 UI에서 구분한다.
- MVP에서는 실제 다중 기기 동기화 없이 로컬 정책 시뮬레이션부터 시작한다.

### Phase 3: DB Sync

- 계정과 기기 등록 개념을 도입한다.
- 서버 DB에 작업 템플릿 설정을 동기화한다.
- 기기별 권한 정책을 서버에서 내려받는다.
- secret과 브라우저 세션은 기본적으로 로컬 전용으로 유지한다.
- 필요한 경우 trusted device 간 암호화된 secret sync를 별도 기능으로 검토한다.

### Phase 4: Adapter 확장

- Discord bot adapter를 추가한다.
- crawler adapter를 추가한다.
- Notion sync adapter를 추가한다.
- trading bot adapter는 높은 위험도를 고려해 별도의 권한, 로그, 확인 절차를 둔다.
- adapter별 실행 로그와 오류 표시를 표준화한다.

### Phase 5: 자동화와 운영성

- 예약 실행을 지원한다.
- 장기 실행 작업의 stop/restart를 지원한다.
- 작업별 로그 검색과 필터를 추가한다.
- export/import를 지원한다.
- 플러그인 또는 외부 adapter 배포 구조를 검토한다.

## 9. 개발 우선순위

우선순위가 높은 작업:

1. 템플릿 기반 작업 모델 확정
2. 브라우저 탭 그룹 전용 프로필 실행
3. 로컬 저장소
4. 작업 목록과 실행 UI
5. 실행 상태와 오류 기록
6. 기기 권한과 secret 모델의 최소 설계 반영

초기에는 하지 않을 작업:

- 서버 DB 동기화 전체 구현
- 브라우저 확장 프로그램 개발
- 기본 브라우저 프로필 직접 조작
- 자동매매 실거래 실행
- 외부 플러그인 설치 시스템
- 복잡한 조직/팀 권한 모델

## 10. 검증 기준

MVP 1은 다음 조건을 만족하면 성공으로 본다.

- 사용자가 브라우저 탭 그룹 템플릿을 생성할 수 있다.
- 템플릿 실행 시 독립된 브라우저 프로필이 열린다.
- 사용자가 브라우저 안에서 탭을 변경한 뒤 종료해도 다음 실행에서 상태가 유지된다.
- 작업 목록에서 마지막 실행 시간과 기본 상태를 확인할 수 있다.
- 작업 설정과 실행 상태가 앱 재시작 후에도 유지된다.
- 이후 adapter 타입이 추가되어도 기존 브라우저 작업 모델을 크게 바꾸지 않아도 된다.

## 11. 현재 결정 사항

- 문서는 한국어로 유지한다.
- 앱 이름은 `Pastel Flow`를 사용한다.
- 첫 MVP는 브라우저 탭 그룹 실행과 상태 유지에 집중한다.
- 초기 저장 방식은 로컬 우선이다.
- 브라우저 탭 그룹은 템플릿별 전용 프로필 방식으로 구현한다.
- 전용 프로필의 로그인 반복 한계를 인정하고, 향후 `extension_controlled` 실행 방식으로 확장 가능하게 유지한다.
- 기기별 권한, secret 암호화, 서버 DB 동기화는 설계에 포함하되 MVP에서는 후순위로 둔다.
- 확장 기능은 `TaskAdapter` 방식으로 추가한다.
