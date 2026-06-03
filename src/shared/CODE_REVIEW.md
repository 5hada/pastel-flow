# Shared Code Review

## High

### 실행 이벤트 타입이 중복되어 API 계약이 불일치함

- location: `src/shared/runStatus.ts:3`, `src/shared/taskRunEvents.ts:3`, `src/renderer/features/workflows/workflowsApi.ts:15`, `src/main/workflows/store/workflowRunEventStore.ts:5`
- content: main store use `WorkflowRunEvent`, but renderer workflow API declare to return `TaskRunEvent[]`. 두 타입의 status union도 다르다.
- effect: `succeeded` 같은 status가 추가되거나 legacy task 필드가 섞일 때 타입 안정성이 깨진다.
- direction: `WorkflowRunEvent` 하나로 통합하고 legacy task field가 필요하면 optional compatibility field로 둔다.

### Sync snapshot normalize가 nested 데이터 검증을 거의 하지 않음

- location: `src/shared/sync.ts:32`, `src/shared/sync.ts:58`
- content: snapshot의 필수 top-level 필드만 확인하고 `actions`, `workflows`, `workflowRunEvents`, `linkedDevices` 내부 shape는 거의 검증하지 않는다.
- effect: import로 잘못된 action type, schedule, permission, event status가 저장될 수 있다.
- direction: Action/Workflow/Event/Device별 normalize schema를 재사용한다.

### local-only와 sync/export 대상 구분이 타입에 드러나지 않음

- location: `src/shared/browsers/types.ts:66`, `src/shared/settings/types.ts`
- content: `existingProfilePath`, `BrowserProfilePreset.profilePath`, `browserExecutablePaths`처럼 로컬 절대 경로가 타입에 있지만 sync/export 제외 대상이라는 표시가 없다.
- effect: main sync store가 실수로 raw object를 export하기 쉽다.
- direction: `LocalOnly<T>` marker, 별도 `SyncActionDefinition`, sanitizer helper를 둔다.

## Medium

### Device policy에서 현재 기기는 기본 trusted로 처리됨

- location: `src/shared/devices/policies.ts:71`
- content: linkedDevices에 현재 기기가 없으면 accessLevel이 `trusted`로 간주된다.
- effect: 새 기기/미등록 기기도 기본적으로 trusted가 되어 `trusted_devices` 정책을 통과할 수 있다. 로컬 앱 UX 의도일 수 있지만 정책명과 보안 의미가 모호하다.
- direction: 현재 기기 auto-trusted 정책을 명시적으로 문서화하거나, currentDevice id가 workflow allowedDeviceIds에 없으면 local-only만 허용하도록 조정한다.

### `local_only`에서 allowedDeviceIds가 비어 있으면 모든 로컬 기기 허용처럼 동작함

- location: `src/shared/devices/policies.ts:84`
- content: `permissions.allowedDeviceIds`가 없거나 빈 배열이면 `local_only`가 true를 반환한다.
- effect: sync/import된 local-only workflow가 allowedDeviceIds 없이 들어오면 현재 기기에서 실행 가능하다.
- direction: 생성 시 항상 current device id를 넣고, normalize/import 단계에서 local-only without allowed ids를 별도 migration 처리한다.

### `normalizeDevicePolicy`가 allowedDeviceIds 중복을 제거하지 않음

- location: `src/shared/devices/defaults.ts:18`
- content: device id trim/filter는 하지만 dedupe는 하지 않는다.
- effect: UI와 sync diff에서 불필요한 중복이 생긴다.
- direction: `new Set`으로 dedupe한다.

### `cryptoSafeId` 이름과 구현이 맞지 않음

- location: `src/shared/settings/defaults.ts:260`
- content: 함수명이 crypto-safe를 의미하지만 `Math.random()`을 사용한다.
- effect: 보안 식별자는 아니더라도 이름이 오해를 만든다.
- direction: renderer에서는 `crypto.randomUUID()`를 쓰거나 함수명을 `createFallbackProfileId`로 바꾼다.

### Browser URL normalize가 scheme 검증을 하지 않음

- location: `src/main/browsers/browserUrlFilters.ts:1`
- content: shared 쪽 browser config normalize와 main URL filter가 모두 일부 internal scheme 제외에 가깝고, `http`/`https` allowlist가 아니다.
- effect: browser action, bridge, default browser open에서 임의 scheme이 흘러갈 수 있다.
- direction: shared URL sanitizer를 만들어 renderer form, main adapter, bridge에서 동일하게 사용한다.

## Low

### 빈 guards 파일

- location: `src/shared/devices/guards.ts`
- content: 0 byte 파일이다.
- effect: device guard 책임이 예정되어 있었는지, defaults/policies에 흡수되었는지 불분명하다.
- direction: 필요한 런타임 guard를 구현하거나 제거한다.

### 타입 import/export 경로가 일관되지 않음

- location: `src/shared/actions/types.ts`, `src/shared/workflows/types.ts`, `src/shared/settings/types.ts`
- content: 일부 파일은 세미콜론/따옴표/경로 스타일이 다르고, `../devices/`처럼 trailing slash import가 반복된다.
- effect: 기능 버그는 아니지만 코드베이스 품질과 자동 정렬 일관성이 떨어진다.
- direction: formatter/linter 규칙으로 import style을 통일한다.
