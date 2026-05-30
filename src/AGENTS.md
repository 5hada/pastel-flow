# Renderer/Shared Agent Guide

This document apply to all files and directories under `src`.

## Responsibilities

- React renderer, 공유 타입, 앱 스타일을 담당한다.
- Electron/Node API는 직접 사용하지 않고 preload API를 통해 호출한다.
- UI 상태, 폼 상태, API 타입, presentational component를 분리한다.

## Structure

- `renderer/app`: 화면, hook, UI component.
- `renderer/api`: preload API 타입과 renderer-facing wrapper.
- `renderer/styles`: 레이아웃, 토큰, 화면별 스타일.
- `renderer/types`: 전역 renderer 타입.
- `shared`: main/renderer 공용 순수 타입과 helper.