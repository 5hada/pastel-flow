# Pastel Tool Module Specification v1.1

사용자 전용 규격서

## 개요

Pastel Tool Module은 Pastel Flow에서 실행 가능한 독립형 도구 패키지이다.

도구 제작자는 본 문서에 정의된 규격만 준수하면 된다.

Pastel Flow는 도구 패키지를 자동으로 인식하고 등록하며, 사용자 인터페이스 생성, 실행, 자동화 연동을 수행한다.

도구는 다음 원칙을 따른다.

* 독립적으로 제작 가능해야 한다.
* 앱 내부 구조를 알 필요가 없다.
* 입력(Input)과 출력(Output)이 명확해야 한다.
* 자동화 환경에서도 실행 가능해야 한다.
* 필요한 권한을 명시해야 한다.

---

# 도구 구조

최소 구조:

```txt
my-tool/
├─ manifest.json
└─ logic.mjs
```

권장 구조:

```txt
my-tool/
├─ manifest.json
├─ logic.mjs
├─ assets/
│  ├─ sample.png
│  └─ examples.json
├─ view.html
├─ style.css
└─ README.md
```

파일 설명:

| 파일          | 필수 | 설명         |
| ------------- | -- | ----------     |
| manifest.json | O  | 도구 메타데이터 |
| logic.mjs      | O  | 실행 로직      |
| assets/       | X  | 정적 데이터, 이미지, 샘플 파일 |
| view.html     | X  | 사용자 정의 UI  |
| style.css     | X  | 사용자 정의 스타일 |
| README.md     | X  | 설명 문서      |

---

# manifest.json

manifest.json은 도구의 메타데이터를 정의한다.

예시:

```json
{
  "schemaVersion": "1.1",
  "id": "wildcard-generator",
  "name": "Wildcard Generator",
  "version": "1.0.0",
  "description": "Generate random strings from a pattern.",

  "assets": [
    {
      "key": "examples",
      "path": "assets/examples.json",
      "type": "json",
      "description": "Sample pattern presets."
    }
  ],

  "dataSources": [
    {
      "key": "localPresets",
      "type": "file",
      "required": false,
      "description": "Optional local preset file selected by the user."
    }
  ],

  "datasets": [
    {
      "key": "patternSamples",
      "source": "asset:examples",
      "recordType": "json",
      "index": true
    }
  ],

  "inputs": [
    {
      "key": "pattern",
      "type": "string",
      "required": true
    },
    {
      "key": "count",
      "type": "number",
      "default": 10,
      "ui": {
        "control": "number",
        "min": 1,
        "max": 100,
        "step": 1
      }
    },
    {
      "key": "theme",
      "type": "color",
      "default": "#1f6f68",
      "ui": {
        "control": "radio",
        "label": "Theme",
        "options": [
          { "label": "Mint", "value": "#1f6f68", "color": "#1f6f68" },
          { "label": "Rose", "value": "#b94a48", "color": "#b94a48" }
        ]
      }
    }
  ],

  "outputs": [
    {
      "key": "items",
      "type": "string[]",
      "ui": {
        "view": "list",
        "label": "Generated items"
      }
    }
  ],

  "indexing": {
    "enabled": true,
    "fields": ["name", "description", "inputs.key", "outputs.key", "datasets.key"]
  },

  "permissions": [
    "clipboard"
  ]
}
```

---

# 필수 필드

## schemaVersion

현재 규격 버전.

```json
"schemaVersion": "1.1"
```

---

## id

도구 고유 식별자.

```json
"id": "wildcard-generator"
```

규칙:

* 영문 소문자
* 숫자
* 하이픈(-)

허용:

```txt
my-tool
json-converter
```

금지:

```txt
MyTool
my tool
```

---

## name

사용자에게 표시되는 이름.

```json
"name": "Wildcard Generator"
```

---

## version

도구 버전.

```json
"version": "1.0.0"
```

Semantic Versioning 사용 권장.

---

# 입력 정의

입력은 사용자 UI 생성 및 자동화 연결에 사용된다.

예시:

```json
"inputs": [
  {
    "key": "text",
    "type": "string",
    "required": true
  }
]
```

---

## 지원 타입

| 타입       | 설명      |
| -------- | ------- |
| string   | 문자열     |
| number   | 숫자      |
| boolean  | 참/거짓    |
| string[] | 문자열 배열  |
| number[] | 숫자 배열   |
| boolean[] | 참/거짓 배열 |
| json     | JSON 객체 |
| file     | 파일      |
| file[]   | 파일 배열 |
| image    | 이미지 파일 또는 이미지 참조 |
| image[]  | 이미지 배열 |
| color    | 색상 값. 기본 표현은 hex 문자열 |
| color[]  | 색상 값 배열 |
| url      | URL 문자열 |
| url[]    | URL 문자열 배열 |
| record[] | 같은 구조의 레코드 배열 |

타입 규칙:

* `file`과 `file[]`은 사용자가 선택한 로컬 파일 참조를 나타낸다.
* `image`와 `image[]`는 이미지 파일 또는 이미지 결과 참조를 나타낸다.
* `color`와 `color[]`는 기본적으로 `#RRGGBB` 형식을 권장한다. alpha가 필요한 경우 `#RRGGBBAA`를 사용할 수 있다.
* `url`과 `url[]`는 `http://`, `https://`, 또는 앱이 허용한 프로토콜을 사용한다.
* `record[]`는 `fields` 또는 `schema` 메타데이터로 레코드 구조를 설명해야 한다.

`record[]` 예시:

```json
{
  "key": "rows",
  "type": "record[]",
  "fields": [
    { "key": "name", "type": "string" },
    { "key": "score", "type": "number" },
    { "key": "url", "type": "url" }
  ]
}
```

---

# 입력 UI 메타데이터

각 input은 선택적으로 `ui` 객체를 가질 수 있다. `ui`는 Pastel Flow가 자동 실행 폼을 더 구체적으로 만들기 위한 힌트이며, 자동화 입력/출력 계약을 바꾸지 않는다.

예시:

```json
{
  "key": "accentColor",
  "type": "string",
  "default": "#1f6f68",
  "ui": {
    "control": "color",
    "label": "Accent color",
    "helpText": "결과물에 적용할 강조 색상입니다."
  }
}
```

지원 control:

| control  | 권장 타입 | 설명 |
| -------- | --------- | ---- |
| text     | string    | 한 줄 텍스트 입력 |
| textarea | string    | 여러 줄 텍스트 입력 |
| number   | number    | 숫자 입력. `min`, `max`, `step` 사용 가능 |
| toggle   | boolean   | 켜기/끄기 토글 |
| checkbox | boolean   | 체크박스 |
| select   | string, number, boolean | 단일 선택 목록 |
| radio    | string, number, boolean | 단일 선택 버튼 그룹 |
| color    | string    | 색상 선택 |
| json     | json      | JSON 편집 |
| list     | string[], number[], boolean[], file[], image[], color[], url[], record[] | 항목 추가/삭제형 목록 입력 |
| file     | file      | 파일 경로 입력 |
| files    | file[]    | 여러 파일 선택 |
| image    | image     | 이미지 파일 선택 또는 미리보기 |
| images   | image[]   | 여러 이미지 선택 또는 미리보기 |
| url      | url       | URL 입력 |
| table    | record[]  | 레코드 배열 표 편집 |

`ui` 필드:

| 필드 | 설명 |
| ---- | ---- |
| control | 사용할 입력 컨트롤 |
| label | 화면에 표시할 입력 이름. 없으면 `key`를 사용 |
| placeholder | 입력 예시 |
| helpText | 보조 설명 |
| options | `select`, `radio`에서 사용할 선택지 |
| min, max, step | 숫자 입력 제약 |
| rows | textarea 높이 |
| accept | file/image 선택에서 허용할 확장자 또는 MIME type |
| multiple | 복수 선택 여부 |
| fields | record[] 편집에 사용할 열 정의 |

`options` 항목:

```json
{
  "label": "Blue",
  "value": "blue",
  "color": "#3b82f6"
}
```

`color`는 선택 UI에서 swatch를 표시하기 위한 선택 속성이다.

---

# 출력 정의

도구가 반환하는 결과 형식.

예시:

```json
"outputs": [
  {
    "key": "result",
    "type": "string"
  }
]
```

---

# 출력 UI 메타데이터

각 output은 선택적으로 `ui` 객체를 가질 수 있다. 출력 UI 메타데이터는 Pastel Flow가 실행 결과를 더 적절한 형태로 렌더링하기 위한 힌트이다. 출력값의 실제 데이터 계약은 `type`이 결정한다.

예시:

```json
{
  "key": "preview",
  "type": "image",
  "ui": {
    "view": "image",
    "label": "Preview",
    "thumbnail": true
  }
}
```

지원 view:

| view | 권장 타입 | 설명 |
| ---- | --------- | ---- |
| text | string, number, boolean | 단일 값 표시 |
| code | string, json | 코드 블록 또는 JSON 표시 |
| list | string[], number[], url[], file[], image[], color[] | 목록 표시 |
| table | record[] | 표 형태 표시 |
| image | image | 이미지 미리보기 |
| gallery | image[] | 이미지 갤러리 |
| color | color | 색상 swatch |
| palette | color[] | 색상 팔레트 |
| link | url | 링크 표시 |
| links | url[] | 링크 목록 |
| file | file | 파일 경로 또는 파일 열기 액션 |
| files | file[] | 파일 목록 |
| download | file, file[] | 다운로드 또는 저장 액션 중심 표시 |

`ui` 필드:

| 필드 | 설명 |
| ---- | ---- |
| view | 출력 렌더링 방식 |
| label | 화면에 표시할 출력 이름 |
| helpText | 보조 설명 |
| emptyText | 결과가 비어 있을 때 표시할 문구 |
| columns | table view에서 표시할 열 |
| thumbnail | image/gallery view에서 썸네일 사용 여부 |
| maxItems | list/gallery/table view에서 기본 표시할 최대 항목 수 |
| actions | 출력 옆에 표시할 보조 액션. 예: copy, open, save |

---

# assets

`assets`는 도구가 사용하는 정적 데이터, 이미지, 샘플 파일을 선언한다. asset은 도구 패키지 내부 경로만 참조해야 하며, 임의의 외부 경로나 사용자 파일을 가리키면 안 된다.

예시:

```json
"assets": [
  {
    "key": "logo",
    "path": "assets/logo.png",
    "type": "image",
    "description": "Default logo used in previews."
  },
  {
    "key": "samples",
    "path": "assets/samples.json",
    "type": "json"
  }
]
```

asset 필드:

| 필드 | 필수 | 설명 |
| ---- | ---- | ---- |
| key | O | 도구 내부에서 사용할 asset 식별자 |
| path | O | 도구 폴더 기준 상대 경로 |
| type | O | asset 타입. `file`, `image`, `json`, `text` 권장 |
| description | X | 설명 |

실행 시 asset은 `context.assets`를 통해 참조한다.

```js
export async function run(input, context) {
  const samples = await context.assets.readJson("samples");
  return { count: samples.length };
}
```

---

# dataSources

`dataSources`는 도구가 외부 데이터나 로컬 DB, 사용자 선택 파일, 네트워크 API 같은 외부 참조를 필요로 할 때 선언한다. dataSource는 정적 asset과 다르며, 사용자 환경이나 권한에 따라 접근 가능 여부가 달라질 수 있다.

예시:

```json
"dataSources": [
  {
    "key": "customersDb",
    "type": "sqlite",
    "required": true,
    "description": "Local customer database."
  },
  {
    "key": "remoteCatalog",
    "type": "http",
    "required": false,
    "description": "Optional remote product catalog."
  }
]
```

지원 type:

| type | 설명 |
| ---- | ---- |
| file | 사용자 선택 파일 |
| folder | 사용자 선택 폴더 |
| sqlite | 로컬 SQLite DB |
| json | 로컬 또는 원격 JSON 데이터 |
| csv | CSV 데이터 |
| http | HTTP API |
| custom | 도구가 정의한 외부 데이터 원천 |

dataSource 필드:

| 필드 | 필수 | 설명 |
| ---- | ---- | ---- |
| key | O | dataSource 식별자 |
| type | O | 데이터 원천 타입 |
| required | X | 실행에 필수인지 여부 |
| description | X | 사용자에게 보여줄 설명 |
| permissions | X | 필요한 permission 목록 |
| schema | X | 데이터 구조 설명 |

dataSource 접근은 `context.dataSources`를 통해 수행한다. 필요한 permission은 manifest `permissions`에도 선언해야 한다.

---

# datasets

`datasets`는 Tool Module이 제공하거나 참조하는 데이터셋을 선언한다. dataset은 asset 또는 dataSource를 기반으로 할 수 있으며, Workflow의 다른 Action에서 입력 후보나 검색 대상으로 사용할 수 있다.

예시:

```json
"datasets": [
  {
    "key": "productRecords",
    "source": "dataSource:remoteCatalog",
    "recordType": "record[]",
    "schema": [
      { "key": "id", "type": "string" },
      { "key": "name", "type": "string" },
      { "key": "image", "type": "image" },
      { "key": "url", "type": "url" }
    ],
    "index": true
  }
]
```

dataset 필드:

| 필드 | 필수 | 설명 |
| ---- | ---- | ---- |
| key | O | dataset 식별자 |
| source | O | `asset:key`, `dataSource:key`, 또는 `output:key` |
| recordType | O | 데이터 타입. 보통 `record[]` |
| schema | X | 레코드 필드 정의 |
| index | X | 인덱싱 대상 여부 |
| description | X | 설명 |

---

# 인덱싱

도구는 검색, 빠른 선택, Workflow 연결 후보 제공을 위해 인덱싱 메타데이터를 선언할 수 있다.

예시:

```json
"indexing": {
  "enabled": true,
  "fields": ["name", "description", "datasets.productRecords.name"],
  "datasets": ["productRecords"]
}
```

인덱싱 규칙:

* `indexing.enabled`가 `true`이면 Pastel Flow는 manifest와 선언된 dataset을 검색 인덱스 후보로 본다.
* `fields`는 manifest 또는 dataset record에서 인덱싱할 필드를 지정한다.
* `datasets`는 인덱싱할 dataset key 목록이다.
* 인덱싱은 도구 실행 결과를 바꾸지 않는다.
* 외부 dataSource 기반 dataset은 권한과 접근 가능 여부에 따라 인덱싱이 지연되거나 실패할 수 있다.

---

# logic.mjs

logic.mjs는 도구의 실행 로직을 담당한다.

필수 함수:

```js
export async function run(input, context) {
  return {};
}
```

---

# input

manifest.json에 정의된 입력값이 전달된다.

예시:

```js
export async function run(input) {
  return {
    text: input.text.toUpperCase()
  };
}
```

---

# 반환값

반환값은 반드시 객체여야 한다.

예시:

```js
return {
  result: "Hello"
};
```

출력 키는 manifest.json에 정의된 output과 일치해야 한다.

---

# context API

도구는 앱 내부 기능을 직접 사용할 수 없다.

대신 context API를 사용한다.

예시:

```js
export async function run(input, context) {
  await context.clipboard.writeText("Hello");

  return {
    success: true
  };
}
```

---

# 권한(Permissions)

권한은 manifest.json에 명시해야 한다.

예시:

```json
"permissions": [
  "clipboard"
]
```

---

## clipboard

클립보드 읽기/쓰기

```js
context.clipboard.readText()
context.clipboard.writeText()
```

---

## file.read

파일 읽기

```js
context.files.open()
```

---

## file.write

파일 저장

```js
context.files.save()
```

---

## network

외부 네트워크 요청

```js
context.network.fetch()
```

---

## assets

정적 asset 접근

```js
context.assets.getPath("logo")
context.assets.readText("samples")
context.assets.readJson("samples")
```

---

## dataSources

외부 데이터 원천 접근

```js
context.dataSources.get("customersDb")
context.dataSources.query("customersDb", { limit: 10 })
```

---

# 사용자 정의 UI

기본적으로 Pastel Flow는 입력 정의를 기반으로 자동 UI를 생성한다.

---

## view.html

복잡한 인터페이스가 필요한 경우 사용할 수 있다.

---

# 자동화

모든 도구는 자동화 환경에서도 동작해야 한다.

따라서 다음 규칙을 준수해야 한다.

권장:

```js
export async function run(input) {
  return {
    result: transform(input)
  };
}
```

비권장:

```js
alert("완료");
document.querySelector(...);
```

실행 결과가 UI에 의존하면 자동화에서 사용할 수 없다.

---

# 오류 처리

오류 발생 시 예외를 던진다.

예시:

```js
if (!input.text) {
  throw new Error("text is required");
}
```

Pastel Flow는 해당 오류를 사용자에게 표시한다.


# 설계 철학

Pastel Tool Module은 "페이지"가 아니라 "함수"이다.

사용자 인터페이스는 선택 사항이며,

도구의 핵심은 다음 구조를 따른다.

```txt
Input
 ↓
Run
 ↓
Output
```