# Pastel Flow UI 기능 명세

이 문서는 Pastel Flow의 현재 제품 방향인 **Action 기반 Workflow 실행 플랫폼**에서 사용자가 화면에서 수행할 수 있어야 하는 기능과 완료 기준을 정의한다. `plan.md`는 제품 방향과 로드맵을, `structure.md`는 코드 구조와 책임 경계를 다룬다.

## 1. 범위

UI의 중심 단위는 Workflow이다.

- 사용자는 실행 페이지에서 Workflow만 보고 실행한다.
- 사용자는 Action을 생성하고, 하나 이상의 Action을 Workflow로 묶을 수 있다.
- 사용자는 Workflow의 실행 상태, 예약, 권한, 실행 이벤트, 출력 요약을 확인할 수 있다.
- 사용자는 `tool-schema.md` 규격의 Tool Module을 도구 페이지에서 업로드, 검증, 관리, 단독 실행할 수 있다.
- 사용자는 등록된 Tool Module을 Workflow의 `tool_action`으로 추가할 수 있다.
- 사용자는 동기화, 실행 이벤트, 데이터 관리 기능을 설정 페이지에서 다룬다.

현재 UI에서 명시적으로 제외하는 항목:

- 실제 서버 DB, 계정 backend, 원격 transport 설정
- secret 값의 원격 동기화
- trading bot의 실거래 주문 실행
- 검증되지 않은 Tool Module 실행
- 조직/팀 단위 복합 권한 관리

## 2. 핵심 개념

### Action

Action은 실행 가능한 최소 단위이다. Action은 단독 정의로 저장되지만, 기본 실행 흐름에서는 Workflow 안에서 실행된다.

지원 대상:

- 브라우저 실행 Action
- crawler Action
- Discord dry-run Action
- Notion dry-run Action
- trading dry-run Action
- Tool Module 실행 Action

Action 생성/수정 UI는 타입별 config, secret 참조, 입력/출력 정의, 실행 가능 여부를 표시한다.

### Workflow

Workflow는 하나 이상의 Action을 순서 또는 조건 기반으로 묶은 실행 단위이다.

Workflow UI는 다음을 지원한다.

- Workflow 생성, 수정, 삭제
- Action 추가, 제거, 순서 조정
- Action enabled 토글
- Action 간 입력/출력 연결
- Workflow 단위 실행, 중지, 예약
- Workflow 단위 권한 정책과 secret 참조 요약
- Workflow 실행 이벤트와 Action별 결과 확인

기존 Task 데이터는 단일 Action을 가진 Workflow로 마이그레이션된 상태를 기준으로 표시한다. 실행 페이지에는 legacy Task를 직접 노출하지 않는다.

## 3. 메인 화면 구조

메인 화면은 창 전체를 사용하는 앱 프레임이다. 상단 카테고리 바, 좌측 보조 패널, 우측 작업 영역으로 구성한다.

- 상단 카테고리 바: 앱 이름, 현재 모드, 실행, Action, Workflow, 도구, 설정, 새로고침
- 좌측 패널: 현재 모드에 맞는 필터, 목록, 설정 분류, 도구 분류
- 우측 작업 영역: 현재 모드의 목록, 상세, 작성 폼, 설정 폼

기본 시작 모드는 `실행`이다. 실행 모드는 저장된 Workflow 런처만 보여준다. Action 생성, Workflow 작성, 도구 관리, 설정 화면은 실행 목록 안에 섞지 않는다.

기존의 `새로 만들기`와 `수정` 중심 분류는 사용하지 않는다. 상단 카테고리의 `Action`과 `Workflow`가 각각 생성과 수정을 함께 담당하는 편집 화면이다. 각 화면은 좌측 패널 목록에서 대상을 선택하면 우측에 수정 화면을 보여주고, 선택된 대상이 없으면 우측에 새로 만들기 진입을 보여준다.

## 4. 실행 페이지

실행 페이지는 Workflow 런처이다.

그리드 모드 표시 항목:

- Workflow 이름
- 실행 버튼

목록 모드 표시 항목:

- Workflow 이름
- Workflow 상태: 대기, 실행 중, 실패
- 마지막 실행 시간
- 예약 상태와 다음 실행 예정 시간
- 포함된 Action 개수
- 제한/secret 배지
- 마지막 결과 요약
- 실행 버튼
- 실행 중인 경우 중지 버튼

동작 규칙:

- 실행 페이지에는 Workflow만 표시한다.
- 개별 Action은 Workflow 카드/행의 요약으로만 표시하며 직접 실행 항목으로 노출하지 않는다.
- 그리드 모드에서는 Workflow 이름과 실행 기능만 노출한다.
- 그리드 모드의 각 Workflow는 별도 카드와 버튼으로 나누지 않고, Workflow 이름이 적힌 단일 버튼으로 표시한다.
- 그리드 모드에서 현재 활성 상태, 실행 중, 실패 같은 상태는 버튼의 색상과 상태 스타일로만 표현한다.
- 그리드 모드 기본 배치는 5열이다.
- 그리드 열 수 수정 옵션은 보기 모드 전환 토글 옆에 제공한다.
- 실행 중인 Workflow의 그리드 버튼은 비활성화하거나 실행 중 상태 색상으로 표시한다.
- 중지 가능한 Workflow의 중지 버튼은 목록 모드 또는 상세 화면에서 제공한다.
- 저장된 Workflow가 없으면 빈 상태와 `Workflow 작성` 진입을 보여준다.
- 기본 표시 방식은 그리드이며, 목록 표시 방식도 제공한다.
- 표시 방식은 전역 설정으로 저장한다.

좌측 패널 필터:

- 전체
- 실행 중
- 예약됨
- 실패
- 제한됨
- secret 필요

## 5. Action 편집 화면

Action 화면은 재사용 가능한 실행 단위를 생성하고 수정하는 편집 화면이다. Action 화면은 새로 만들기 화면과 수정 화면으로 분리하지 않는다.

화면 구조:

- 좌측 패널: Action 목록을 표시한다.
- 좌측 패널 우상단: `+` 아이콘으로 새 Action을 생성한다.
- 우측 작업 영역: 선택된 Action이 있으면 수정 화면을 표시한다.
- 우측 작업 영역: 선택된 Action이 없으면 새로 만들기 아이콘과 생성 진입을 표시한다.

Action 목록은 최종적으로 폴더 또는 그룹 기반 계층 구조로 관리할 수 있어야 한다. 초기 구현에서는 평면 목록으로 시작하더라도 UI 구조와 상태 이름은 계층 확장을 막지 않게 둔다.

Action 목록 표시 항목:

- Action 이름
- Action 타입
- secret 필요 여부
- 마지막 수정 시간
- 사용 중인 Workflow 수
- 실행 가능 여부

Action 생성 흐름:

1. Action 타입을 선택한다.
2. 타입별 필수 config를 입력한다.
3. 필요한 secret 참조를 연결한다.
4. 입력/출력 정의를 확인한다.
5. 저장한다.

타입별 최소 입력:

- 브라우저 Action: 브라우저 종류, 실행 방식, URL 목록 또는 snapshot 설정
- Crawler Action: URL 목록, 요청 옵션, 결과 저장 방식
- Discord/Notion dry-run Action: dry-run 이름, 대상 설명, secret 참조 슬롯
- Trading dry-run Action: 전략 이름, 입력 파라미터, 실거래 제외 확인
- Tool Action: 등록된 Tool Module, manifest input 기본값, permission 확인

삭제 규칙:

- 사용 중인 Workflow가 있는 Action은 바로 삭제하지 않는다.
- 삭제 전 사용 중인 Workflow 목록을 보여주고, 사용 해제 또는 Workflow 수정이 필요함을 안내한다.

## 6. Workflow 편집 화면

Workflow 화면은 Workflow를 생성하고 수정하는 편집 화면이다. Workflow 화면은 새로 만들기 화면과 수정 화면으로 분리하지 않는다. 구성은 Action 화면과 유사하되, 다루는 대상이 Workflow라는 점만 다르다.

화면 구조:

- 좌측 패널: Workflow 목록을 표시한다.
- 좌측 패널 우상단: `+` 아이콘으로 새 Workflow를 생성한다.
- 우측 작업 영역: 선택된 Workflow가 있으면 수정 화면을 표시한다.
- 우측 작업 영역: 선택된 Workflow가 없으면 새로 만들기 아이콘과 생성 진입을 표시한다.

Workflow 목록은 최종적으로 폴더 또는 그룹 기반 계층 구조로 관리할 수 있어야 한다. 초기 구현에서는 평면 목록으로 시작하더라도 이후 계층 구조로 확장 가능한 목록 컴포넌트를 사용한다.

Workflow 수정 화면은 Action을 조합해 실행 단위를 만드는 화면이다.

입력 항목:

- Workflow 이름
- 설명
- Action 목록
- Action 순서
- Action enabled 상태
- Action 입력 매핑
- 권한 정책
- 예약 설정

Workflow 상세 화면 표시 항목:

- 개요: 이름, 상태, 마지막 실행, 다음 실행, Action 개수
- Action: 실행 순서, 타입, enabled 상태, 입력 연결, 마지막 결과
- 실행 기록: Workflow 이벤트와 Action별 이벤트
- 출력: 마지막 실행 결과와 artifact 경로
- 권한: visibility/execution policy, secret 참조 요약
- 예약: interval, daily, weekly 설정과 다음 실행 예정 시간

수정 규칙:

- 실행 중인 Workflow는 구조 변경을 제한한다.
- 실행 중에도 이름, 설명 같은 비실행 메타데이터 수정은 허용할 수 있다.
- Action 순서 변경은 저장 전 미리보기로 표시한다.
- 삭제 전 확인 단계를 거친다.

## 7. 도구 페이지

도구 페이지는 Tool Module 전용 화면이다.

기능:

- Tool Module 업로드
- manifest 검증 결과 표시
- permission 목록 표시
- 등록된 도구 목록 관리
- 좌측 패널의 Tool Module 목록 표시
- inputs 기반 자동 실행 UI
- 도구 단독 실행
- Workflow에 Tool Action으로 추가

도구 화면 구조:

- 좌측 패널: 등록된 Tool Module 목록을 표시한다.
- 좌측 패널의 목록은 최종적으로 폴더 또는 그룹 기반 계층 구조로 관리할 수 있게 설계한다.
- 우측 작업 영역: 선택된 Tool Module의 상세, 검증 결과, 단독 실행 UI, Workflow 추가 액션을 표시한다.
- 선택된 Tool Module이 없으면 업로드 진입과 빈 상태를 표시한다.

업로드 검증:

- `manifest.json` 존재 여부
- `logic.js` 존재 여부
- `schemaVersion`, `id`, `name`, `version` 필수 필드
- input/output 타입 지원 여부
- permission 선언 유효성

도구 페이지에서 제외하는 기능:

- mock sync import/export
- 실행 이벤트 정리
- 로그 보존 설정
- 데이터 위치 보기

위 기능은 설정 페이지에서 다룬다.

## 8. 설정 페이지

설정 페이지는 앱 전역 동작과 운영 기능을 관리한다.

설정 카테고리:

- 일반: 테마, 기본 브라우저, 새 Action/Workflow 기본 이름
- 브라우저: 브라우저 실행 파일 경로, 브라우저 실행 정책
- 단축키: 전역 단축키와 화면별 단축키 사용자 정의
- 기기/권한: 현재 기기, 연동 기기, 기본 visibility/execution policy
- Secret: safeStorage 상태, secret 생성/삭제, 참조 현황
- 동기화: mock export/import, 서버 DB sync 비활성 상태
- 실행 이벤트: 보존 개수, 검색/필터 기본값, 이벤트 정리
- 데이터 관리: userData 위치, snapshot, 백업/복구 후보 기능

동작 규칙:

- 설정 변경은 저장 버튼으로 확정한다.
- 저장하지 않고 이동하려 하면 변경 사항 확인을 표시한다.
- 저장 성공 후 설정 화면을 유지하고 성공 상태를 짧게 표시한다.
- 저장 실패 시 해당 카테고리 안에 오류를 표시한다.
- 기존 프로필 경로, 브라우저 실행 파일 경로처럼 파일 시스템 경로를 입력하는 항목은 입력 형식 예시를 함께 표시한다.

## 9. 상태와 오류

빈 상태:

- Workflow가 없으면 실행 페이지에서 Workflow 작성 진입을 제공한다.
- Action이 없으면 Workflow 작성 화면에서 Action 생성 진입을 제공한다.
- Tool Module이 없으면 도구 페이지에서 업로드 진입을 제공한다.

로딩 상태:

- 목록, 상세, 도구 검증, 설정 저장 중에는 해당 영역에 로딩 상태를 표시한다.

실행 중 상태:

- 실행 중인 Workflow는 상태 배지와 중지 가능 여부를 표시한다.
- Action별 실행 상태는 Workflow 상세 안에서 표시한다.

실행 실패:

- 실행 페이지에는 실패 요약을 표시한다.
- Workflow 상세에는 실패한 Action과 오류 메시지를 표시한다.

공통 오류:

- Pastel Flow API 불러오기 실패, 저장소 접근 실패, 생성/수정/삭제 실패, Tool Module 검증 실패는 현재 화면 상단 또는 관련 섹션 안에 표시한다.

## 10. 완료 기준

- 앱 시작 시 실행 페이지에는 Workflow만 표시된다.
- Action과 Workflow 생성 흐름이 분리되어 있다.
- Action과 Workflow 화면은 각각 좌측 목록, 좌측 우상단 `+` 생성 버튼, 우측 수정/빈 상태 생성 진입 구조를 사용한다.
- Workflow 작성 화면에서 Action 추가, 순서 조정, enabled 토글, 입력 연결, 권한, 예약을 설정할 수 있다.
- 기존 Task 기반 항목은 단일 Action Workflow로 표시된다.
- 도구 페이지는 Tool Module 업로드, 검증, 관리, 단독 실행, Workflow 추가만 담당한다.
- 도구 페이지 좌측 패널은 Tool Module 목록을 표시하며, 이후 계층 구조 관리로 확장 가능하다.
- 동기화, 실행 이벤트, 데이터 관리는 설정 페이지의 카테고리로 이동되어 있다.
- 설정 페이지는 단축키 사용자 정의 카테고리를 제공한다.
- 브라우저 실행 파일 경로와 기존 프로필 경로 입력에는 경로 형식 예시가 표시된다.
- Tool Module은 `tool-schema.md` 규격 검증 결과와 permission을 사용자에게 표시한다.
- 실행 실패 시 Workflow와 Action 단위 오류를 구분해 확인할 수 있다.
- 창 전체가 상단 바, 좌측 패널, 우측 작업 영역으로 구성되고 실행 목록 안에 생성/설정/도구 UI가 섞이지 않는다.
