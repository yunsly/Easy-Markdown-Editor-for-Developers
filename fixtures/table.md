# 표 종합 검증

이 문서는 GFM 표의 파싱, 셀 편집, 정렬 정보 및 직렬화를 확인하기 위한 fixture입니다.

## 기본 표

| Header A | Header B |
| --- | --- |
| Value A | Value B |

## 한글, 빈 셀 및 인라인 요소

| 왼쪽 정렬 | 가운데 정렬 | 오른쪽 정렬 |
| :--- | :---: | ---: |
| 안녕하세요 👋 | 빈 셀은 오른쪽에 있습니다 | |
| **굵은 한글** | _기울임_과 ~~취소선~~ | `inlineCode()` |
| [절대 링크](https://example.com/docs?lang=ko#table) | | [상대 링크](../docs/markdown-support.md#문법별-정책) |
