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

## 목록과 체크리스트 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 일반 문단을 `Cmd+Option+8`로 bullet list 항목으로 변경할 수 있다.
- [x] 새 list item에서 `Tab`을 사용해 중첩 bullet list를 만들 수 있다.
- [x] 일반 문단을 `Cmd+Option+7`로 ordered list 항목으로 변경하고 다음 번호 항목을 추가할 수 있다.
- [x] bullet list 항목 시작에서 `[ ] `를 입력해 task list로 변경할 수 있다.
- [x] 렌더링된 체크박스를 클릭하면 checked 상태로 변경된다.
- [x] 저장된 Markdown에 bullet, 중첩 들여쓰기, ordered numbering 및 `[x]` 상태가 보존된다.
- [x] 목록 편집과 저장 과정에서 오류 알림이 나타나지 않는다.

### 관찰 사항

Bullet list와 task list는 `-` 대신 `*` marker로 직렬화됐다. 목록 의미와 중첩 구조 및 체크 상태는 보존됐다.

### 이번 검증에서 제외한 항목

세 단계 이상의 중첩, `Shift+Tab` 상위 이동, 빈 목록 항목 삭제와 여러 목록 사이 병합은 확인하지 않았다.

## 블록 문법 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 제한 사항과 함께 통과

### 확인 항목

- [x] 문단 시작에 `> `를 입력하면 Blockquote로 변환된다.
- [x] 문단 시작에 백틱 세 개와 공백을 입력하면 fenced Code block으로 변환된다.
- [x] 빈 문단에 `---`를 입력하면 Horizontal rule로 변환된다.
- [x] Blockquote와 Code block 안의 한글 내용이 저장 결과에서 보존된다.
- [x] 저장된 Markdown에 `>`, fenced code block 및 horizontal rule marker가 기록된다.
- [x] 입력 규칙을 사용한 편집과 저장 과정에서 오류 알림이 나타나지 않는다.

### 관찰 사항

- `Cmd+Shift+B`는 VS Code의 Run Build Task 명령과 충돌해 Blockquote 명령으로 사용할 수 없었다.
- `Cmd+Option+C`도 테스트 환경에서 Code block으로 전환되지 않았다.
- `---`로 입력한 Horizontal rule은 저장 시 의미가 같은 `***`로 직렬화됐다.

### 이번 검증에서 제외한 항목

언어 식별자가 있는 Code block, 여러 줄 코드의 들여쓰기, Blockquote 안의 여러 문단 및 중첩 Blockquote는 확인하지 않았다.

## Undo/Redo Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 시간 간격을 두고 입력한 두 변경 중 마지막 변경만 `Cmd+Z`로 되돌릴 수 있다.
- [x] `Cmd+Shift+Z`로 되돌린 마지막 변경을 다시 적용할 수 있다.
- [x] Undo/Redo 중 커서가 예상하지 않은 위치로 이동하거나 Editor가 반복 갱신되지 않는다.
- [x] Undo/Redo 이후 동기화 충돌 알림이 나타나지 않는다.
- [x] Redo 이후 최종 한글 문자열이 `Cmd+S` 저장 결과에 반영된다.

### 재검증 메모

최초 테스트에서는 한 번의 단축키가 Milkdown history와 VS Code 문서 undo 양쪽에서 처리되어 외부 변경 충돌이 발생했다. Webview capture 단계에서 Undo/Redo 키를 소비하고 Crepe history command를 한 번만 실행하도록 수정한 뒤 새 Extension Development Host에서 재검증해 통과했다.

### 이번 검증에서 제외한 항목

여러 단계 연속 Undo/Redo, 서식 및 블록 구조 변경의 Undo/Redo, Windows/Linux의 `Ctrl+Y` 조합은 확인하지 않았다.

## 복사 및 붙여넣기 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 제어된 `text/plain` 클립보드의 원시 Markdown을 붙여넣으면 제목과 Bold가 렌더링된다.
- [x] 한글과 여러 문단 및 이모지(`😀`)가 붙여넣기 결과에 보존된다.
- [x] 렌더링된 Bold 텍스트를 복사해 다시 붙여넣으면 Bold 서식이 보존된다.
- [x] 저장된 파일에 H2, 두 개의 Bold 문단, 일반 문단과 이모지가 Markdown으로 기록된다.
- [x] 붙여넣기와 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

실제 웹페이지의 HTML, VS Code 코드 편집기의 전용 클립보드 데이터, 매우 큰 클립보드와 이미지는 확인하지 않았다.

## Floating Toolbar 기반 요소 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 비어 있지 않은 텍스트 선택에서만 Toolbar가 표시된다.
- [x] 커서만 있는 빈 선택에서는 Toolbar가 표시되지 않는다.
- [x] Editor가 포커스를 잃으면 Toolbar가 숨겨진다.
- [x] 문서와 화면 가장자리의 선택에서도 Toolbar가 Webview 경계 안에 표시된다.
- [x] Editor를 닫거나 다시 열 때 중복 Toolbar가 생기지 않는다.

### 이번 검증에서 제외한 항목

이번 단계의 버튼은 의도적으로 비활성 상태이므로 서식 적용, 선택 유지, 활성 상태와 키보드 접근은 확인하지 않았다.

## Floating Toolbar Bold Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 한글 텍스트 선택에서 Bold 버튼을 누르면 선택 영역에 굵게가 적용된다.
- [x] Toolbar를 눌러도 선택 영역이 유지된다.
- [x] 같은 선택에서 Bold 버튼을 다시 누르면 굵게가 해제된다.
- [x] 굵게를 해제한 최종 상태가 일반 Markdown 문단으로 저장된다.
- [x] 적용·해제 및 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

Bold 활성 상태 표시, 키보드만 사용한 버튼 실행과 여러 문단에 걸친 선택은 확인하지 않았다.

## Floating Toolbar Italic Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 한글 텍스트 선택에서 Italic 버튼으로 기울임을 적용·해제할 수 있다.
- [x] Italic 버튼을 눌러도 선택 영역이 유지된다.
- [x] 기울임을 해제한 최종 상태가 일반 Markdown 문단으로 저장된다.
- [x] 같은 문서에서 Bold 버튼을 적용한 문단이 `**…**`로 저장된다.
- [x] 적용·해제 및 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

Italic 활성 상태 표시, 키보드만 사용한 버튼 실행과 Bold·Italic 중첩 선택은 확인하지 않았다.

## Floating Toolbar Strikethrough Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 한글 텍스트 선택에서 Strikethrough 버튼으로 취소선을 적용·해제할 수 있다.
- [x] Strikethrough 버튼을 눌러도 선택 영역이 유지된다.
- [x] 취소선을 다시 적용한 최종 상태가 `~~…~~` Markdown으로 저장된다.
- [x] 적용·해제 및 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

Strikethrough 활성 상태 표시, 키보드만 사용한 버튼 실행과 다른 mark와의 중첩 선택은 확인하지 않았다.

## Floating Toolbar Inline Code Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 한글 텍스트 선택에서 Inline Code 버튼으로 서식을 적용·해제할 수 있다.
- [x] Inline Code 버튼을 눌러도 선택 영역이 유지된다.
- [x] 서로 다른 두 문단을 가로지른 선택에서는 Inline Code가 적용되지 않는다.
- [x] 단일 문단에 다시 적용한 최종 상태가 `` `…` `` Markdown으로 저장된다.
- [x] 적용·해제 및 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

Inline Code 활성 상태 표시, 키보드만 사용한 버튼 실행과 백틱이 포함된 선택은 확인하지 않았다.

## Floating Toolbar 활성 상태 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 수정 후 통과

### 확인 항목

- [x] Bold, Italic, Strikethrough 및 Inline Code 선택에서 해당 버튼이 활성 상태로 표시된다.
- [x] Bold와 Italic이 중첩된 선택에서 두 버튼이 동시에 활성 상태로 표시된다.
- [x] 일반 텍스트 선택에서는 모든 서식 버튼이 비활성 상태로 표시된다.
- [x] 버튼으로 서식을 해제하면 활성 상태 표시도 즉시 해제된다.
- [x] 수정 후 Editor 초기화와 상태 변경 과정에서 오류 알림이 나타나지 않는다.

### 재검증 메모

최초 테스트에서는 Editor 생성이 완료되기 전에 활성 상태 명령이 실행돼 `Cannot destructure property 'doc' ...` 오류가 발생했다. Crepe 공식 Toolbar와 동일하게 `EditorStatus.Created` 이후에만 명령을 호출하도록 수정한 뒤 새 Extension Development Host에서 재검증해 통과했다.

### 이번 검증에서 제외한 항목

부분적으로만 mark가 적용된 선택 영역의 활성 상태와 스크린 리더의 `aria-pressed` 안내는 확인하지 않았다.

## Floating Toolbar Link Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 선택한 한글 텍스트에 Link 버튼으로 새 URL을 입력할 수 있다.
- [x] 기존 링크의 Preview Tooltip에서 URL을 수정할 수 있다.
- [x] 기존 링크의 Preview Tooltip에서 link mark를 제거할 수 있다.
- [x] 생성·수정·제거 결과가 각각 기대한 Markdown으로 저장된다.
- [x] Link Tooltip이 열리면 Floating Toolbar가 겹치지 않게 숨겨진다.
- [x] 생성·수정·제거 및 저장 과정에서 오류 알림이 나타나지 않는다.

### 저장 결과

- 새 링크: `[새 링크로 바꿀 텍스트입니다.](https://example.com/new)`
- 수정된 링크: `[기존 링크 수정 대상](https://example.org/updated)`
- 제거된 링크: `링크 제거 대상`

### 이번 검증에서 제외한 항목

상대 경로와 anchor URL, 잘못된 URL scheme, 빈 선택에서 URL 자체를 링크 텍스트로 삽입하는 흐름은 확인하지 않았다.

## Floating Toolbar 키보드 접근성 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 텍스트 선택 후 `Tab`, `Shift+Tab` 및 `Alt+F10`으로 Toolbar에 진입할 수 있다.
- [x] `Tab`과 `Shift+Tab`으로 활성화된 버튼 사이를 이동하고 양 끝에서 순환할 수 있다.
- [x] `Enter`와 `Space`로 포커스된 서식 버튼을 실행할 수 있다.
- [x] 버튼 실행 후 선택 영역과 Toolbar 버튼의 키보드 포커스가 유지된다.
- [x] `Escape`로 Toolbar를 닫고 Editor로 포커스를 돌려보낼 수 있다.
- [x] 키보드 포커스 테두리가 명확하게 표시된다.
- [x] 키보드로 적용한 서식 결과가 Markdown으로 저장된다.
- [x] 키보드 조작과 저장 과정에서 오류 알림이 나타나지 않는다.

### 이번 검증에서 제외한 항목

VoiceOver 등 실제 스크린 리더를 사용한 `aria-label` 및 `aria-pressed` 음성 안내는 확인하지 않았다.

## VS Code 라이트·다크 테마 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 라이트 테마에서 본문, 제목, 링크, 인라인 코드 및 코드 블록을 읽을 수 있다.
- [x] 다크 테마에서 본문, 제목, 링크, 인라인 코드 및 코드 블록을 읽을 수 있다.
- [x] 텍스트 선택 영역과 입력 커서가 두 테마에서 구분된다.
- [x] Floating Toolbar와 Link Tooltip이 두 테마에서 읽을 수 있게 표시된다.
- [x] Editor를 다시 열지 않고 테마를 전환해도 변경된 색상이 즉시 반영된다.
- [x] 테마 전환만으로 Markdown 내용이 변경되지 않는다.

### 이번 검증에서 제외한 항목

고대비 테마와 사용자가 직접 정의한 모든 색상 조합은 확인하지 않았다.

## Bold 단축키 충돌 회귀 테스트

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 수정 후 통과

### 확인 항목

- [x] 텍스트 선택 후 `Cmd+B`로 Bold를 적용할 수 있다.
- [x] 같은 선택에서 `Cmd+B`로 Bold를 해제할 수 있다.
- [x] `Cmd+B`를 실행해도 VS Code Explorer가 닫히지 않는다.
- [x] Bold 단축키 사용 후에도 `Cmd+Z` Undo가 동작한다.
- [x] 단축키 사용 과정에서 오류 알림이 나타나지 않는다.

### 재검증 메모

최초 테스트에서는 Milkdown이 `Cmd+B`를 처리한 뒤 같은 키 이벤트가 VS Code Workbench까지 전달되어 Explorer도 함께 닫혔다. ProseMirror에서 시작된 Bold 단축키의 버블링을 Webview 안에서 종료하도록 수정한 뒤 재검증해 통과했다.
