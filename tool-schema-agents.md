# Tool Schema Agent Summary

Tool Module standard document for agents.

## Module Shape

필수 파일:

- `manifest.json`
- `logic.mjs`

선택 파일/폴더:

- `assets/`
- `view.html`
- `style.css`
- `README.md`

## Manifest Core

핵심 필드:

- `schemaVersion`: latest is `1.1`
- `id`: 소문자, 숫자, 하이픈만 사용
- `name`
- `version`
- `description`
- `inputs`
- `outputs`
- `permissions`

확장 필드:

- `assets`: 도구 내부 정적 데이터, 이미지, 샘플 파일
- `dataSources`: 외부 데이터, 로컬 DB, 사용자 선택 파일/폴더, HTTP API 참조
- `datasets`: asset, dataSource, output 기반 데이터셋 선언
- `indexing`: 검색과 Workflow 입력 후보 제공을 위한 인덱싱 메타데이터

## IO Types

default types:

- `string`
- `number`
- `boolean`
- `json`
- `file`
- `string[]`
- `number[]`
- `boolean[]`

additional types:

- `file[]`
- `image`
- `image[]`
- `color`
- `color[]`
- `url`
- `url[]`
- `record[]`

`record[]`는 `fields` 또는 `schema`로 필드 구조를 설명해야 한다.

## UI Metadata

입력은 `input.ui.control`로 자동 폼 힌트를 제공한다.

control form:

- `text`
- `textarea`
- `number`
- `toggle`
- `checkbox`
- `select`
- `radio`
- `color`
- `json`
- `list`
- `file`
- `files`
- `image`
- `images`
- `url`
- `table`

출력은 `output.ui.view`로 결과 렌더링 힌트를 제공한다.

view form:

- `text`
- `code`
- `list`
- `table`
- `image`
- `gallery`
- `color`
- `palette`
- `link`
- `links`
- `file`
- `files`
- `download`

## Runtime Contract

`logic.mjs`는 반드시 `run(input, context)`를 export한다.

```js
export async function run(input, context) {
  return {};
}
```

반환값은 object여야 하며, key는 `outputs`에 선언된 key와 일치해야 한다.

## Context APIs

도구는 앱 내부 API를 직접 호출하지 않고 제한된 `context`만 사용한다.

대표 API:

- `context.clipboard`
- `context.files`
- `context.network`
- `context.assets`
- `context.dataSources`

manifest에 선언되지 않은 permission이나 dataSource 접근은 제공하지 않는다.