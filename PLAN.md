# Pastel Flow 계획서

## 1. 프로젝트 비전

Pastel Flow는 반복되는 작업 환경을 로컬 우선 방식으로 정의, 실행, 보존하는 데스크톱 자동화 앱이다.

앞으로의 제품 기준은 단일 작업 템플릿이 아니라 **Action 기반 Workflow 실행 플랫폼**이다. 사용자는 실행 가능한 최소 단위인 Action을 만들고, 하나 이상의 Action을 Workflow로 묶어 실행한다. 실행 페이지는 Workflow 런처가 되며, 개별 Action은 Workflow를 구성하는 재사용 가능한 블록으로 다룬다.

기존 브라우저 탭 그룹, crawler, Discord/Notion/trading dry-run 작업은 이후 각각 단일 Action을 포함한 Workflow로 마이그레이션한다. 서버 DB, 계정 backend, 원격 transport는 아직 구현하지 않고, 로컬 저장과 mock sync 범위 안에서 설계를 유지한다.

## 2. 핵심 원칙

- **로컬 우선**: 첫 실행 모델은 로컬 저장소를 기준으로 동작한다. 원격 서버 DB 연동은 현재 구현 범위에서 제외한다.
- **Workflow 중심 실행**: 사용자가 실행 페이지에서 보는 대상은 항상 Workflow이다. Action은 Workflow 내부의 실행 단위로만 직접 실행 흐름에 참여한다.
- **Action 재사용성**: 브라우저 열기, crawler 실행, tool module 실행, dry-run 호출 같은 기능은 독립 Action으로 정의하고 여러 Workflow에서 재사용할 수 있게 한다.
- **상태와 로그의 기준 통일**: 예약 실행, 실행 상태, 실행 이벤트, 권한 정책은 Workflow를 중심으로 관리하고, 필요할 때 Action 단위 상세를 함께 기록한다.
- **secret 분리**: API key, token, 거래소 key, 로그인 세션 같은 민감 정보는 Action config나 Workflow config에 직접 저장하지 않고 secret 참조로 연결한다.
- **명시적 권한**: 기기 권한, secret 참조, tool module permission은 실행 전에 확인 가능한 형태로 노출한다.
- **도구 모듈 표준화**: 도구는 `tool-schema.md` 규격을 따르는 독립 모듈로 업로드, 검증, 등록, 실행한다.
- **Electron 역할 분리**: main process는 로컬 리소스, 파일 시스템, 외부 프로세스와 실행 엔진을 담당하고, React renderer는 Workflow/Action/설정 UI를 담당한다.

## 3. 제품 구조

### 3.1 Action

Action은 실행 가능한 최소 단위이다.

Action 예시:

- 브라우저 프로필 또는 기본 브라우저로 URL 열기
- 브라우저 탭 그룹 snapshot 갱신
- crawler로 URL 목록 수집
- Discord/Notion/trading dry-run 실행
- 업로드된 tool module 실행

Action은 타입, config, secret 참조, 입력 정의, 출력 정의, 실행 가능 여부, 상태 요약을 가진다. Action 자체는 재사용 가능한 정의이며, 실제 실행은 Workflow 안에서 수행한다.

### 3.2 Workflow

Workflow는 하나 이상의 Action을 순서 또는 조건 기반으로 묶은 실행 단위이다.

Workflow는 다음 책임을 가진다.

- 실행 페이지에 표시되는 런처 항목
- Action 목록과 실행 순서 관리
- Action 간 입력/출력 연결
- Workflow 단위 예약 실행
- Workflow 단위 visibility/execution policy
- Workflow 단위 실행 상태와 최근 실행 이벤트 표시

기존 단일 작업은 모두 “Action 1개를 가진 Workflow”로 이전한다.

### 3.3 Tool Module

Tool Module은 `tool-schema.md`를 따르는 독립형 도구 패키지이다.

도구 페이지는 더 이상 mock sync나 실행 이벤트 정리 화면이 아니다. 도구 페이지의 책임은 다음으로 제한한다.

- tool module 업로드
- `manifest.json`, `logic.js`, inputs, outputs, permissions 검증
- 등록된 도구 목록 관리
- inputs 정의 기반 자동 실행 UI 제공
- tool module 단독 실행
- Workflow에 `tool_action`으로 추가

`view.html`과 `style.css`는 선택 사항이다. 기본 실행 UI는 manifest inputs 정의로 자동 생성한다. 도구가 요청한 permission은 manifest에 선언된 항목만 허용하며, 실행 전 사용자에게 표시한다.

### 3.4 Settings

설정 페이지는 앱 운영과 데이터 관리 기능을 담당한다.

기존 도구 페이지에 있던 다음 항목은 설정 페이지의 카테고리로 이동한다.

- 동기화
- 실행 이벤트
- 데이터 관리

설정 페이지의 주요 카테고리는 다음을 기준으로 한다.

- 일반: 테마, 기본 브라우저, 새 항목 기본값
- 브라우저: 브라우저 실행 파일 경로, 브라우저 실행 정책
- 기기/권한: 현재 기기, 연동 기기, visibility/execution policy 기본값
- Secret: safeStorage 상태, secret 생성/삭제, 참조 현황
- 동기화: mock export/import, 서버 DB sync 비활성 상태 표시
- 실행 이벤트: 보존 개수, 검색/필터 기본값, 이벤트 정리
- 데이터 관리: userData 위치, snapshot, 백업/복구 후보 기능

## 4. 주요 데이터 모델 방향

아래 모델은 구현 방향을 맞추기 위한 개념 모델이다. 실제 타입과 schema는 구현 시 `src/shared` 기준으로 구체화한다.

```ts
type ActionType =
  | 'browser_action'
  | 'crawler_action'
  | 'discord_dry_run_action'
  | 'notion_dry_run_action'
  | 'trading_dry_run_action'
  | 'tool_action';

type ActionDefinition<TConfig = unknown> = {
  id: string;
  name: string;
  type: ActionType;
  config: TConfig;
  secretRefs?: SecretRef[];
  inputSchema?: ActionIOField[];
  outputSchema?: ActionIOField[];
  createdAt: string;
  updatedAt: string;
};

type WorkflowDefinition = {
  id: string;
  name: string;
  actionRefs: WorkflowActionRef[];
  permissions: DevicePolicy;
  schedule?: WorkflowSchedule;
  state: WorkflowState;
  createdAt: string;
  updatedAt: string;
};

type WorkflowActionRef = {
  id: string;
  actionId: string;
  order: number;
  inputMapping?: Record<string, string>;
  enabled: boolean;
};
```

마이그레이션 기준:

- 기존 `TaskTemplate` 데이터는 v1 legacy 데이터로 취급한다.
- 앱 시작 또는 명시적 마이그레이션 단계에서 각 legacy task를 Action 1개와 Workflow 1개로 변환한다.
- 기존 task 실행 이벤트는 가능한 경우 workflow/action 참조로 연결한다.
- 연결할 수 없는 과거 이벤트는 legacy event로 유지한다.
- mock sync는 새 Workflow/Action 모델을 대상으로 확장하되, 실제 서버 DB sync는 계속 제외한다.

## 5. 화면 구조 방향

### 실행 페이지

- Workflow만 표시한다.
- Workflow 카드/행에는 이름, 상태, 마지막 실행 시간, 예약 상태, 제한/secret 배지, 실행 버튼을 표시한다.
- 개별 Action은 실행 페이지에 직접 노출하지 않는다.

### Action 생성/관리

- Action 생성은 타입 선택 후 타입별 설정 폼을 보여준다.
- 브라우저, crawler, dry-run, tool module 실행은 각각 Action 타입으로 정의한다.
- Action 설정 화면에서는 config, secret 참조, 입력/출력 요약, 실행 가능 여부를 다룬다.

### Workflow 작성

- Workflow 작성 화면에서는 Action 추가, 순서 조정, enabled 토글, 입력 연결, 예약, 권한을 설정한다.
- 단일 Action Workflow도 기본 형태로 지원한다.
- Workflow 저장 후 실행 페이지에 런처 항목으로 표시한다.

### 도구 페이지

- `tool-schema.md` 규격 도구 모듈 업로드와 검증을 담당한다.
- 등록된 도구를 단독 실행하거나 Workflow의 `tool_action`으로 추가할 수 있게 한다.
- mock sync, 실행 이벤트 정리, 로그 보존 설정은 표시하지 않는다.

### 설정 페이지

- 동기화, 실행 이벤트, 데이터 관리를 설정 카테고리로 제공한다.
- mock sync import/export와 실행 이벤트 정리 기능은 설정 페이지에서 수행한다.
- 서버 DB sync는 비활성 상태와 향후 설계 대상으로만 표시한다.

## 6. 구현 로드맵

### Phase 1: 계획서와 UI 문서 정렬

- `plan.md`를 Action/Workflow 기준의 실행용 로드맵으로 유지한다.
- `ui-features.md`와 `ui-detail-design.md`를 Workflow 실행 페이지, Action 관리, Workflow 작성, Tool Module, Settings 구조에 맞게 개정한다.
- UI 관련 구현을 진행할 때는 `ui-features.md`의 기능 범위와 `ui-detail-design.md`의 화면/컴포넌트 규칙을 먼저 확인하고, 변경 사항이 두 문서의 기준과 어긋나지 않게 반영한다.
- `structure.md`는 실제 코드 전환이 시작될 때 Action/Workflow 기준으로 업데이트한다.

### Phase 2: 데이터 모델 전환

- `ActionDefinition`, `WorkflowDefinition`, Workflow state, Workflow schedule 타입을 추가한다. **완료**
- 기존 `TaskTemplate`은 legacy 타입으로 유지하되 Action/Workflow 모델과 병행 저장한다. **완료**
- legacy task를 단일 Action/Workflow로 변환하는 마이그레이션/동기화 로직을 작성한다. **완료**
- 실행 이벤트 저장 모델에 workflowId, actionRunId, legacyTaskId를 구분해 기록할 수 있게 한다. **완료**
- mock sync export/import가 legacy `tasks`와 새 `actions`, `workflows`를 함께 다루게 한다. **완료**
- 남은 작업: legacy task와 독립적인 신규 Action/Workflow 생성, 수정, 삭제 저장 API를 추가한다.

### Phase 3: 실행 엔진 전환

- 기존 task runner/adapter 실행 흐름을 Workflow runner 중심으로 전환한다. **진행 중**
- 각 Action 타입별 실행 handler를 등록하는 구조를 만든다.
- Workflow runner는 Action 순서, enabled 상태, input mapping, 실패 중단 정책을 처리한다.
- 예약 실행은 Workflow 단위로 실행한다.
- stop/restart는 Workflow 단위 요청으로 받고, 가능한 Action handler에 위임한다.

### Phase 4: UI 전환

- 실행 페이지를 Workflow 런처 관점의 문구와 빈 상태로 변경한다. **완료**
- 새 작업 생성 흐름을 Action 생성과 Workflow 작성으로 분리한다.
- 기존 작업 목록/수정 UI는 legacy task UI가 아니라 Action/Workflow UI로 대체한다. **진행 중**
- Workflow 상세 화면에 개요, Action 목록, 실행 기록, 권한, 예약, 출력 요약을 표시한다.
- 현재 구현: 상단 모드는 실행, Action, Workflow, 도구, 설정으로 분리했다. 실행 그리드는 Workflow 이름 버튼 중심으로 표시하고 열 수 설정을 제공한다. Action 화면은 Action 목록/상세/생성 진입 구조를 사용하고, Workflow 화면은 Workflow 목록과 Action 순서/Enabled 토글 미리보기를 제공한다. 완전한 Action 삽입, 순서 저장, 입력 매핑 저장 API는 남은 작업이다.

### Phase 5: Tool Module 시스템

- 도구 업로드 위치와 등록 저장소를 정의한다. **완료**
- 업로드된 폴더에서 `manifest.json`과 `logic.js`를 검증한다. **완료**
- `tool-schema.md`의 input/output/permission 규칙을 검증하는 loader를 만든다. **완료**
- tool module을 단독 실행할 수 있는 main process 실행 경로와 renderer UI를 만든다. **완료**
- tool module을 Workflow의 `tool_action`으로 추가할 수 있게 한다. **부분 완료**
- 현재 구현: renderer 도구 페이지에서 폴더 선택으로 module을 등록하고, manifest inputs 기반 자동 폼으로 단독 실행하며, 등록된 도구를 `tool_action` Action 정의로 생성할 수 있다.
- 도구 inputs의 `ui` 메타데이터를 지원해 toggle, checkbox, select, radio, color, list, textarea, json 같은 고급 자동 폼 컨트롤을 표시한다. **완료**
- 남은 작업: 생성된 `tool_action`을 Workflow 작성 화면에서 선택/삽입하고, Workflow runner가 legacy task 위임 없이 순수 Action handler로 `tool_action`을 실행하도록 확장한다.

### Phase 6: 설정 페이지 재배치

- 도구 페이지에 있는 sync/export/import, 실행 이벤트 정리, 로그 보존 관련 UI를 설정 페이지로 이동한다. **완료**
- 설정 카테고리에 브라우저, 단축키, 동기화, 실행 이벤트, 데이터 관리를 추가한다. **완료**
- 도구 페이지는 tool module 기능만 남긴다. **완료**

### Phase 7: 안정화와 검증

- legacy task 마이그레이션 fixture 테스트를 추가한다.
- Workflow runner의 Action 순서 실행, 실패 처리, disabled Action skip, input mapping을 테스트한다.
- Tool Module manifest 검증과 permission 표시를 테스트한다.
- mock sync가 Workflow/Action 모델을 export/import하는지 확인한다.
- `npx tsc --noEmit`, `npm run lint`를 기본 정적 검증으로 유지한다.

## 7. 명시적 제외 범위

- 실제 서버 DB, 원격 transport, 계정 backend 구현
- secret 값의 원격 동기화
- 기본 브라우저 프로필 자동 탐색 또는 강제 조작
- trading bot의 실거래 주문 실행
- 검증되지 않은 tool module의 권한 우회 실행
- 복잡한 조직/팀 권한 모델
- 외부 플러그인 마켓플레이스 배포 시스템

## 8. 검증 기준

다음 질문에 문서와 구현 방향이 명확히 답해야 한다.

- 실행 페이지에 무엇이 표시되는가: Workflow만 표시한다.
- Action과 Workflow의 차이는 무엇인가: Action은 최소 실행 단위이고 Workflow는 실행 가능한 묶음이다.
- 기존 Task는 어떻게 이전되는가: 단일 Action을 가진 Workflow로 마이그레이션한다.
- 도구 페이지와 설정 페이지의 책임은 어떻게 나뉘는가: 도구 페이지는 tool module, 설정 페이지는 sync/event/data management를 담당한다.
- `tool-schema.md`는 어디에 적용되는가: Tool Module 업로드, 검증, 실행, Workflow `tool_action` 등록 기준으로 적용한다.
- 다음 구현 우선순위는 무엇인가: 데이터 모델 전환, 실행 엔진 전환, UI 전환, Tool Module 시스템, 설정 페이지 재배치 순서이다.

문서만 변경한 경우 필수 테스트는 없다. 구현 변경 시에는 최소한 다음을 실행한다.

```bash
npx tsc --noEmit
npm run lint
```

## 9. 현재 결정 사항

- 문서는 한국어로 유지한다.
- 앱 이름은 `Pastel Flow`를 사용한다.
- 앞으로의 실행 단위는 Workflow이다.
- Action은 Workflow를 구성하는 재사용 가능한 최소 실행 단위이다.
- UI 작업은 `ui-features.md`와 `ui-detail-design.md`를 기준 문서로 삼아 구현한다.
- 기존 Task/Adapter 구조는 legacy로 취급하고 Action/Workflow 구조로 호환 마이그레이션한다.
- 브라우저, crawler, Discord/Notion/trading dry-run은 Action 타입으로 재정의한다.
- 실행 페이지는 Workflow만 표시한다.
- 새 작업 생성은 Action 생성과 Workflow 작성으로 분리한다.
- 도구 페이지는 `tool-schema.md` 규격 도구 모듈 업로드, 검증, 관리, 실행을 담당한다.
- 동기화, 실행 이벤트, 데이터 관리는 설정 페이지의 카테고리로 이동한다.
- 서버 DB sync 실제 구현은 제외하고 mock sync만 유지한다.
- trading bot은 dry-run skeleton만 유지하며 실제 자동매매는 구현하지 않는다.
- 에이전트 구현 검증 시 dev 서버 응답 확인과 UI 직접 확인은 수행하지 않는다. 필요한 검증은 `npx tsc --noEmit`, `npm run lint` 같은 정적 명령 중심으로 진행한다.
