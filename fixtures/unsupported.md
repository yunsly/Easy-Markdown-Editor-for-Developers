---
title: Markdown 보존 경계
description: "지원 여부를 검증하는 문서"
tags:
  - safety
  - markdown
custom:
  preserve: true
---

# 지원 미검증 문법

이 문서는 MVP 전용 편집 범위 밖이거나 보존 여부를 검증해야 하는 문법을 모아 둡니다.

<!-- 이 HTML 주석의 내용과 위치를 보존해야 합니다. -->

## Raw HTML

<section data-preserve="true">
  <strong>원본 HTML</strong>
  <span lang="ko">안녕하세요.</span>
</section>

## 이미지

![대체 텍스트](./assets/example.png "예시 이미지")

## 표

| 문법 | 상태 |
| :--- | ---: |
| HTML | 검증 필요 |
| Table | 이후 지원 |
