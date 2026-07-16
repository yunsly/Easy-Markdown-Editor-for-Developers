# 수동 테스트 기록

## 한글 IME Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 `fixtures/korean.md`
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 한글을 연속으로 입력해도 조합 중인 글자가 분리되거나 누락되지 않는다.
- [x] 받침이 포함된 한글을 Backspace로 지울 때 조합과 커서가 정상적으로 유지된다.
- [x] 한영 전환 후 한글과 영문을 이어서 입력할 수 있다.
- [x] 한글 텍스트를 복사하고 붙여넣을 수 있다.
- [x] 빠르게 입력해도 마지막 음절이 누락되지 않는다.
- [x] 굵게 입력 상태에서도 한글 조합이 정상적으로 동작한다.
- [x] 입력 중 커서가 예상하지 않은 위치로 이동하지 않는다.

### 이번 검증에서 제외한 항목

이 테스트 당시에는 Crepe 편집 결과를 VS Code `TextDocument`에 반영하는 동기화가 구현되지 않아 dirty 상태와 저장을 확인하지 않았다. 해당 항목은 아래 문서 동기화 Smoke Test에서 별도로 확인했다. Undo/Redo와 외부 변경 반영은 아직 검증하지 않았다.

## 문서 동기화 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일 및 `fixtures/code-block.md`
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 편집 후 debounce가 끝나면 VS Code 탭의 닫기 표시가 dirty 상태를 나타내는 원형 표시로 바뀐다.
- [x] dirty 상태에서는 아직 저장하지 않은 Markdown이 디스크 파일에 기록되지 않는다.
- [x] `Cmd+S`로 저장하면 dirty 표시가 해제된다.
- [x] 저장 후 입력한 한글 문자열이 실제 Markdown 파일에 기록된다.
- [x] 동기화 및 저장 과정에서 오류 알림이 나타나지 않는다.

### 관찰 사항

코드 블록 뒤에 새 문단을 추가했을 때 Crepe 직렬화 결과에 `<br />`가 함께 추가됐다. 저장 동작 자체는 성공했지만 이 표현의 의미 보존 여부와 허용 가능성은 Markdown round-trip 검증에서 별도로 판단한다.

### 이번 검증에서 제외한 항목

Undo/Redo, 충돌 처리와 읽기 전용 문서 오류는 확인하지 않았다.

## 외부 문서 변경 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 디스크에서 Markdown 제목을 변경하면 열려 있는 Visual Editor에 자동으로 반영된다.
- [x] 디스크에서 추가한 한글 문장이 Visual Editor에 정상적으로 표시된다.
- [x] 외부 변경 반영 중 Crepe Editor가 반복해서 갱신되지 않는다.
- [x] 외부 변경 반영 중 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

로컬 편집과 외부 변경이 동시에 발생하는 충돌 상황, Git checkout, 파일 삭제 및 여러 Visual Editor panel 간 동기화는 확인하지 않았다.

## 제목 H1~H3 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 기존 H1, H2, H3가 서로 구분되는 크기로 표시된다.
- [x] 일반 문단을 `Cmd+Option+1`, `Cmd+Option+2`, `Cmd+Option+3`으로 각각 H1, H2, H3으로 변경할 수 있다.
- [x] 제목에 포함된 한글이 화면과 저장 결과에서 보존된다.
- [x] 저장된 Markdown에 H1은 `#`, H2는 `##`, H3는 `###`로 직렬화된다.
- [x] 제목 편집과 저장 과정에서 오류 알림이 나타나지 않는다.

### 재검증 메모

첫 수동 실행에서는 지시 외의 편집이 함께 발생해 저장 결과를 판정할 수 없었다. 일반 문단 세 개만 포함한 새 파일에서 각 단축키를 한 번씩 적용하는 독립 테스트를 다시 실행했고, 저장 결과가 기대한 Markdown과 정확히 일치하는 것을 확인했다.

## 인라인 서식 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 선택한 한글 텍스트에 `Cmd+B`로 Bold를 적용·해제할 수 있다.
- [x] 선택한 한글 텍스트에 `Cmd+I`로 Italic을 적용·해제할 수 있다.
- [x] 선택한 한글 텍스트에 `Cmd+Option+X`로 Strikethrough를 적용·해제할 수 있다.
- [x] 선택한 한글 텍스트에 `Cmd+E`로 Inline code를 적용·해제할 수 있다.
- [x] 저장된 Markdown이 각각 `**…**`, `*…*`, `~~…~~`, `` `…` `` 마커를 사용한다.
- [x] 서식 편집과 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

여러 서식이 중첩된 선택 영역, 여러 문단 선택 및 경계가 일부만 겹치는 선택 영역은 확인하지 않았다.
