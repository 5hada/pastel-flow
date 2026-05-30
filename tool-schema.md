# Pastel Tool Module Specification v1.0

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
├─ view.html
├─ style.css
└─ README.md
```

파일 설명:

| 파일          | 필수 | 설명         |
| ------------- | -- | ----------     |
| manifest.json | O  | 도구 메타데이터 |
| logic.mjs      | O  | 실행 로직      |
| view.html     | X  | 사용자 정의 UI  |
| style.css     | X  | 사용자 정의 스타일 |
| README.md     | X  | 설명 문서      |

---

# manifest.json

manifest.json은 도구의 메타데이터를 정의한다.

예시:

```json
{
  "schemaVersion": "1.0",
  "id": "wildcard-generator",
  "name": "Wildcard Generator",
  "version": "1.0.0",
  "description": "Generate random strings from a pattern.",

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
      "type": "string",
      "default": "mint",
      "ui": {
        "control": "radio",
        "label": "Theme",
        "options": [
          { "label": "Mint", "value": "mint", "color": "#1f6f68" },
          { "label": "Rose", "value": "rose", "color": "#b94a48" }
        ]
      }
    }
  ],

  "outputs": [
    {
      "key": "items",
      "type": "string[]"
    }
  ],

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
"schemaVersion": "1.0"
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
| json     | JSON 객체 |
| file     | 파일      |

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
| list     | string[], number[] | 항목 추가/삭제형 목록 입력 |
| file     | file      | 파일 경로 입력 |

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

# 사용자 정의 UI

기본적으로 Pastel Flow는 입력 정의를 기반으로 자동 UI를 생성한다.

도구 제작자는 UI를 만들 필요가 없다.

---

## view.html

복잡한 인터페이스가 필요한 경우 사용할 수 있다.

예시:

```txt
graph-generator
image-editor
prompt-builder
```

view.html은 선택 사항이다.

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

---

# 모범 사례

좋은 도구:

* 입력이 명확하다.
* 출력이 명확하다.
* UI 없이도 동작한다.
* 자동화에서 사용할 수 있다.

나쁜 도구:

* 화면에만 결과를 표시한다.
* 전역 상태에 의존한다.
* 입력/출력이 정의되어 있지 않다.

---

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

모든 도구는 이 구조를 유지해야 한다.
