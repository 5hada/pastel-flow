# Base Agent Guide

Top-level rules overriding all other project instructions.
Never modify.

## Architecture Rules

One responsibility per file.
Prefer new modules.

Modify, or create ONLY under /src.
Generally read file under /src, also can read ./.heroui-doc when needed.

## Validation

Run `npm run check` after implementation or before commit.

Never run applications, servers, browsers, or manual tests.

Skip for docs-only changes.