# Renderer Code Review

## High

### Workflow를 첫 Action 기반 legacy Task로 투영함

- location: `src/renderer/features/workflows/hooks/useTaskData.ts:404`
- content: `createWorkflowTemplates`가 각 Workflow의 첫 번째 `actionRef`만 Task로 만든다.
- effect: 다중 Action Workflow에서 UI가 전체 Workflow를 정확히 보여주지 못한다. 편집/삭제/실행이 실제 Workflow 전체에 어떤 영향을 주는지 불명확해진다.
- direction: Run/Workflow 화면은 Workflow를 source of truth로 두고, legacy Task UI는 단일 Action Workflow 전용으로 제한하거나 제거한다.

### Task 편집이 첫 번째로 찾은 Workflow만 수정함

- location: `src/renderer/features/workflows/hooks/useTaskData.ts:232`
- 내용: Action을 포함하는 Workflow를 `find`로 하나만 찾고 이름/권한/schedule을 업데이트한다.
- 영향: 하나의 Action이 여러 Workflow에 들어 있으면 임의의 첫 Workflow만 바뀐다.
- 개선: 사용자가 현재 선택한 Workflow id를 기준으로 수정하거나, Action 편집과 Workflow 편집을 분리한다.

### Task 삭제가 Action만 삭제하고 Workflow 의미가 흐려짐

- location: `src/renderer/features/workflows/hooks/useTaskData.ts:276`
- 내용: Task 삭제 버튼이 Action 삭제를 호출한다. main store는 Action ref만 제거하고 Workflow 자체는 남긴다.
- 영향: 사용자는 "작업 삭제"로 이해하지만 실제로는 빈 Workflow 또는 일부 Action이 빠진 Workflow가 남을 수 있다.
- 개선: 삭제 버튼을 Action 삭제/Workflow 삭제로 분리하고, 다중 Action Workflow에서는 삭제 영향 범위를 명시한다.

### Workflow 재정렬이 누락 id를 조용히 삭제할 수 있음

- location: `src/renderer/features/workflows/components/EditWorkspace.tsx:389`
- 내용: `reorderWorkflowActionRefs`가 전달된 id 목록에 없는 actionRef를 결과에서 제외한다.
- 영향: drag/drop 이벤트 데이터가 손상되거나 부분 목록만 전달되면 Workflow actionRef가 삭제될 수 있다.
- 개선: 기존 actionRef 전체를 보존하고, 알 수 없는/누락된 id는 원래 순서를 유지하도록 한다.

### `workflows.pruneEvents`가 task prune 채널을 호출함

- location: `src/main/preload.ts:159`, `src/renderer/features/sync/hooks/useSyncData.ts:89`
- 내용: renderer는 workflow API를 호출하지만 preload 내부는 task 채널로 연결되어 있다.
- 영향: 현재 main handler가 task prune 채널에 workflow event prune을 연결해 두어 우연히 동작하지만 API 계약이 틀어져 있다.
- 개선: preload/main/shared channel 이름을 workflow 기준으로 맞춘다.

## Medium

### 전역 hook이 너무 많은 책임을 갖고 있음

- location: `src/renderer/shared/hooks/usePastelFlowApp.ts`
- 내용: workspace mode, settings, secrets, sync, tools, legacy tasks, actions/workflows, keyboard shortcut, sidebar responsive 상태를 한 hook에서 모두 조합한다.
- 영향: 변경 범위가 커지고 stale closure, 불필요한 rerender, 테스트 어려움이 커진다. `src/AGENTS.md`의 상태/폼/API/presentational 분리 원칙과도 거리가 있다.
- 개선: workspace controller, shortcut controller, bootstrap loader를 분리한다.

### 초기 로딩 상태가 tasks에만 묶임

- location: `src/renderer/shared/hooks/usePastelFlowApp.ts:192`
- 내용: 반환되는 `isLoading`이 `tasks.isLoading`만 사용한다.
- 영향: settings/secrets/tools/actions/workflows 로딩 중이어도 전체 로딩 표시가 정확하지 않을 수 있다.
- 개선: domain별 loading을 합산하거나 화면별 loading을 별도로 전달한다.

### refresh가 일부 데이터만 갱신함

- location: `src/renderer/shared/hooks/usePastelFlowApp.ts:108`
- 내용: `refreshWorkspaceData`는 tasks/actions/tools만 다시 불러오고 settings, secrets, sync status, events는 갱신하지 않는다.
- 영향: 상단 refresh가 전체 refresh처럼 보이지만 일부 정보는 stale하게 남는다.
- 개선: refresh 범위를 화면별로 명확히 하거나 전체 domain refresh로 확장한다.

### import/export 같은 파괴적 동작에 확인 단계가 부족함

- location: `src/renderer/features/sync/hooks/useSyncData.ts:62`, `src/renderer/features/sync/hooks/useSyncData.ts:78`
- 내용: sync import가 현재 data merge/overwrite에 영향을 줄 수 있지만 확인/preview가 없다.
- 영향: 사용자가 파일을 잘못 선택하면 Workflow/Action/settings가 예상과 다르게 병합된다.
- 개선: import preview, diff, 명시적 confirm, rollback snapshot을 제공한다.

### Tool output image/link가 임의 URL을 그대로 렌더링함

- location: `src/renderer/features/tools/ToolsPanel.tsx:130`, `src/renderer/features/tools/ToolsPanel.tsx:154`
- 내용: Tool output의 `image`, `gallery`, `link` 값이 `src`/`href`에 그대로 들어간다.
- 영향: remote tracking URL, `file:` URL, custom scheme 노출 가능성이 있다.
- 개선: 허용 scheme 검증, `file` output 별도 처리, remote image 표시 opt-in을 둔다.

### Tool list input이 빈 항목을 유지하기 어려움

- location: `src/renderer/features/tools/ToolsPanel.tsx:322`
- 내용: list value를 문자열 join/split로 다루며 `.filter(Boolean)`을 사용한다.
- 영향: 빈 문자열이 의미 있는 배열 값이거나 사용자가 빈 행을 편집 중일 때 상태가 사라질 수 있다.
- 개선: UI 상태는 배열로 유지하고 runner 직전 normalize 단계에서만 문자열 변환한다.

### Workflow grouping이 이름 prefix 기반임

- location: `src/renderer/features/run/TaskLaunchPanel.tsx:278`
- 내용: 그룹 분류가 `workflow.name.startsWith(groupName)`이다.
- 영향: "기본 A" 같은 이름 규칙에 의존하고, 명시적 category/hierarchy 필드가 없어 오분류가 발생한다.
- 개선: Workflow metadata에 group/category 필드를 추가하거나 별도 mapping을 둔다.

### AppSettingsPanel이 지나치게 큼

- location: `src/renderer/features/settings/AppSettingsPanel.tsx:60`, `src/renderer/features/settings/AppSettingsPanel.tsx:1001`
- 내용: 일반 설정, 테마, 단축키, 브라우저, 기기, secret, sync, events, data, developer와 하위 editor가 한 파일에 있다.
- 영향: 한 책임 한 파일 원칙과 맞지 않고 변경 충돌/리뷰 난이도가 커진다.
- 개선: category별 panel 파일과 shared field component로 분리한다.

### ActionWorkspacePanel에 WorkflowActionList가 같이 있음

- location: `src/renderer/features/actions/components/ActionWorkspacePanel.tsx`
- 내용: Action 편집 패널 파일에 Workflow action list/drag/drop picker가 함께 정의되어 있다.
- 영향: actions feature와 workflows feature 책임이 섞인다.
- 개선: `WorkflowActionList`를 workflows component 디렉토리로 옮긴다.

## Low

### keyboard shortcut effect가 매 render마다 재등록됨

- location: `src/renderer/shared/hooks/usePastelFlowApp.ts:57`
- 내용: dependency array가 없어 render마다 keydown listener를 remove/add 한다.
- 영향: cleanup으로 누수는 막지만 불필요한 work가 생기고 의도가 흐리다.
- 개선: handler를 `useCallback`으로 묶거나 dependency를 명시한다.

### Sidebar 초기 상태가 desktop에서도 닫힘

- location: `src/renderer/shared/hooks/usePastelFlowApp.ts:17`, `src/renderer/shared/hooks/usePastelFlowApp.ts:94`
- 내용: `isSidebarOpen`'s initial value is `false`, make media query effect false when only compact.
- 영향: 지침의 left side panel 기본 존재감과 다르게 desktop 첫 화면에서도 sidebar가 접혀 있을 수 있다.
- 개선: 초기값을 viewport에 맞게 계산하거나 desktop 기본 open으로 둔다.

### DetailItem card duplicatio/repeat

- location: `src/renderer/features/workflows/components/EditWorkspace.tsx`, `src/renderer/features/settings/AppSettingsPanel.tsx`, `src/renderer/features/tools/ToolsPanel.tsx`
- 내용: `DetailItem` 구현이 여러 파일에 반복되고, `Card` 안에 작은 `Card`를 반복 배치하는 패턴이 많다.
- 영향: 디자인 지침의 card 중첩 제한과 맞지 않고 UI density/일관성이 흔들릴 수 있다.
- 개선: shared description/detail primitive로 분리하고 section/card 중첩을 줄인다.
