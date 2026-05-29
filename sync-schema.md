# Pastel Flow 동기화 스키마 초안

이 문서는 서버 DB 동기화를 추가할 때의 데이터 경계를 정리한다. 현재 구현은 로컬 우선이며, 이 스키마는 후속 서버 구현의 기준 초안이다.

## 동기화 원칙

- 작업 템플릿의 일반 설정과 비민감 상태만 기본 동기화한다.
- Secret 값, 브라우저 프로필, 로그인 세션은 기본적으로 로컬 전용이다.
- 기기별 허용 수준과 작업별 visibility/execution policy는 서버에 저장해 각 기기가 동일한 정책 판단을 할 수 있게 한다.
- 서버는 secret 값을 알지 않는다. 작업은 `secretRefs`만 저장하고, 각 기기는 로컬 secret 저장소에서 같은 ID를 가진 secret을 찾는다.

## 테이블 초안

### accounts

```text
id                 string primary key
email              string unique nullable
display_name       string nullable
created_at         datetime
updated_at         datetime
```

### devices

```text
id                 string primary key
account_id         string references accounts(id)
name               string
access_level       blocked | visible | executable | trusted
last_seen_at       datetime nullable
created_at         datetime
updated_at         datetime
```

### task_templates

```text
id                 string primary key
account_id         string references accounts(id)
name               string
type               browser_tab_group | discord_bot | crawler | notion_sync | trading_bot
config_json        json
state_json         json
visibility_policy  all_devices | trusted_devices | specific_devices | local_only
execution_policy   anywhere | trusted_only | specific_devices | local_only
allowed_device_ids json array
secret_refs_json   json array
created_at         datetime
updated_at         datetime
deleted_at         datetime nullable
```

### task_run_events

```text
id                 string primary key
task_id            string references task_templates(id)
device_id          string references devices(id)
status             running | idle | failed
message            string nullable
created_at         datetime
```

### local_only_not_synced

아래 데이터는 서버 DB에 저장하지 않는다.

```text
browser profile directories
browser cookies and sessions
secret values
Electron safeStorage encrypted blobs
OS keychain entries
machine-local absolute executable paths
```

## 현재 로컬 파일 대응

```text
tasks.json         -> task_templates 일부
appSettings.json   -> devices access_level 일부, 로컬 UI 설정
device.json        -> devices 현재 기기 레코드
secrets.json       -> local-only secret metadata and encrypted values
```

## 후속 결정 필요

- `appSettings.browserExecutablePaths`는 기기별 로컬 경로라 서버 동기화 대상에서 제외한다.
- Secret ID를 기기 간 동일하게 맞출지, 서버에 secret metadata만 별도 테이블로 둘지 결정해야 한다.
- conflict resolution은 `updated_at` 단순 승자 방식으로 시작할 수 있지만, task config와 policy는 필드 단위 merge가 필요할 수 있다.
