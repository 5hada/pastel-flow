# Tool Schema Summary

Tool Module standard document summary.

## Module Shape

### Required:

- `manifest.json`
- `logic.mjs`

### Optional:

- `assets/`
- `view.html`
- `style.css`
- `README.md`

## Manifest Core

### Required field:

- `schemaVersion`: latest is `1.1`
- `id`: only lowercase, numbers, and hyphens
- `name`
- `version`
- `description`
- `inputs`
- `outputs`
- `permissions`

### Additional field:

- `assets`: Internal tool static data, images, sample files
- `dataSources`: External data, local DB, user-selected files/folders, HTTP API references
- `datasets`: Declaration of dataset based on asset, dataSource, and output
- `indexing`: Indexing metadata for providing search and workflow input suggestions

## IO Types

### default types:

- `string`
- `number`
- `boolean`
- `json`
- `file`
- `string[]`
- `number[]`
- `boolean[]`

### additional types:

- `file[]`
- `image`
- `image[]`
- `color`
- `color[]`
- `url`
- `url[]`
- `record[]`

`record[]` should describe the field structure with `fields` or `schema`.

## UI Metadata

Input automatically provides form hints with `input.ui.control`.

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

The output provides a hint for rendering the result with `output.ui.view`.

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

`logic.mjs` must export `run(input, context)`.

```js
export async function run(input, context) {
  return {};
}
```

The return value must be an object, and the keys must match the keys declared in `outputs`.

## Context APIs

The tool does not call the app's internal API directly and only uses the limited `context`.

### API:

- `context.clipboard`
- `context.files`
- `context.network`
- `context.assets`
- `context.dataSources`

Permissions or dataSource access not declared in the manifest will not be provided.