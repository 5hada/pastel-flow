# Pastel Flow 구조 문서

이 문서는 에이전트가 Pastel Flow 구현을 이어가기 위한 작업 기준이다. 코드 구조를 다시 추측하지 말고, 아래 책임 경계와 데이터 흐름을 우선 따른다.

## 1. 프로젝트 스택

- 데스크톱 런타임: Electron
- Renderer: React + TypeScript
- 번들러/개발 서버: Vite
- 초기 저장 방식: Electron `userData` 경로의 `tasks.json`
- 현재 MVP: 브라우저 탭 그룹 템플릿 생성, 수정, 삭제, 저장, 목록 표시
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
  tasks/
    adapters/
      taskAdapter.ts              작업 adapter 공통 인터페이스
      browserTabGroupAdapter.ts   브라우저 탭 그룹 adapter 자리
      taskAdapterRegistry.ts      작업 타입별 adapter 조회
    ipc/
      taskIpc.ts                  tasks:list/create/update/delete IPC 등록
    runner/
      taskRunner.ts               작업 조회, adapter 실행, 상태 저장
    store/
      taskStore.ts                tasks.json 기반 로컬 저장소

src/
  App.tsx                         현재 최소 Pastel Flow UI
  App.css                         App.tsx 스타일
  index.css                       전역 스타일
  renderer/
    api/
      tasksApi.ts                 renderer에서 보는 preload API 타입
    types/
      global.d.ts                 window.pastelFlow 전역 타입 선언
  shared/
    tasks/
      types.ts                    작업 템플릿과 브라우저 config 타입
      defaults.ts                 기본 state/config/policy
      index.ts                    shared tasks barrel export
```

## 4. 현재 데이터 흐름

```text
App.tsx
  -> window.pastelFlow.tasks
  -> electron/preload.ts
  -> IPC channel: tasks:list | tasks:create | tasks:update | tasks:delete | tasks:run
  -> electron/tasks/ipc/taskIpc.ts
  -> electron/tasks/store/taskStore.ts
  -> electron/tasks/runner/taskRunner.ts
  -> electron/tasks/adapters/browserTabGroupAdapter.ts
  -> Electron userData/tasks.json
```

현재 UI는 브라우저 탭 그룹 생성, 수정, 삭제, 실행, 목록 표시를 지원한다. 이름, 브라우저 종류, 실행 방식, 초기 URL 목록을 renderer에서 편집하고 `tasks.json`에 저장한다. 실행은 아직 실제 브라우저 프로세스를 열지 않고, `dedicated_profile` 실행 방식에서 전용 프로필 디렉터리 생성과 상태 저장까지만 처리한다.

## 5. 다음 구현 위치

- 작업 타입 변경: `src/shared/tasks/types.ts`
- 작업 기본값 변경: `src/shared/tasks/defaults.ts`
- 로컬 저장 방식 변경: `electron/tasks/store/taskStore.ts`
- 새 IPC 추가: `electron/tasks/ipc/taskIpc.ts`, `electron/preload.ts`, `src/renderer/api/tasksApi.ts`
- 브라우저 실행 구현: `electron/tasks/adapters/browserTabGroupAdapter.ts`
- 작업 실행 버튼/상태 UI: `src/App.tsx`

브라우저 실행 기능을 추가할 때는 adapter가 프로필 경로 생성과 외부 프로세스 실행을 담당하고, renderer는 실행 요청과 결과 표시만 담당한다.

## 6. 구현 규칙

- 기본 브라우저 프로필은 직접 조작하지 않는다.
- 템플릿별 전용 프로필 디렉터리를 사용한다.
- `BrowserTabGroupConfig.runMode`는 실행 전략을 나타낸다. MVP 기본값은 `dedicated_profile`이고, 향후 확장 프로그램 기반 제어는 `extension_controlled`로 추가한다.
- 전용 프로필 방식은 작업별 로그인을 반복시킬 수 있으므로, 로그인 공유가 필요한 기능은 확장 프로그램 기반 실행 전략에서 다룬다.
- API key, token, 로그인 세션 같은 secret은 task `config`에 직접 저장하지 않는다.
- `dist-electron`은 빌드 산출물이므로 직접 수정하지 않는다.
- Electron/Node API는 renderer에서 직접 사용하지 않는다.
- main/renderer 공유 타입은 `src/shared`에 두고, Electron 의존 코드는 `electron`에 둔다.
- 작업 타입별 실행 로직은 `TaskAdapter` 형태로 추가한다.

## 7. 검증 명령

문서만 변경한 경우에도 기존 상태 확인이 필요하면 다음 명령을 사용한다.

```bash
npx tsc --noEmit
npm run lint
```

브라우저 실행 기능을 구현한 뒤에는 추가로 다음을 확인한다.

- 앱에서 브라우저 탭 그룹 템플릿 생성
- 생성된 작업의 `profileId` 유지
- 전용 프로필 디렉터리 생성
- 브라우저 종료 후 재실행 시 세션 유지
- 실행 성공 시 `lastRunAt`, `localProfilePath`, `status` 저장
- 실행 실패 시 `lastError`, `status` 저장
