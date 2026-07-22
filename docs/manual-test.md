# 수동 테스트 기록

## Local File Attachment 회귀 테스트

- 실행일: 미실행
- 환경: Extension Development Host
- 대상: workspace root의 `README.md`, 중첩된 `docs/guide.md`
- 편집기: Visual Markdown Editor
- 결과: 사용자 검증 필요

### 확인 항목

- [ ] Attach 버튼이 단일 파일 picker를 열고 picker 취소 시 문서와 workspace가 변경되지 않는다.
- [ ] 기본 목적지가 현재 Markdown 파일 옆의 `assets/`로 제안된다.
- [ ] 존재하지 않는 목적지 폴더가 Attach 시 생성된다.
- [ ] PNG 파일이 복사되고 현재 cursor 위치에 상대 경로 image로 삽입된다.
- [ ] PDF 파일이 복사되고 현재 cursor 위치에 상대 경로 link로 삽입된다.
- [ ] `docs/guide.md`에서 root `assets/`를 지정하면 `../assets/...` 경로가 저장된다.
- [ ] 동일한 파일명을 다시 첨부하면 `-2`, `-3` suffix가 붙고 기존 파일은 변경되지 않는다.
- [ ] 한글, 공백, 괄호, `#`, `%`가 포함된 파일명이 복사·표시·저장된다.
- [ ] Image/Link 기본 판별을 사용자가 반대로 변경할 수 있다.
- [ ] 잘못된 상대 폴더, `..`, 절대 경로, separator가 포함된 파일명이 차단된다.
- [ ] 복사 실패 시 Markdown이 삽입되지 않고 dialog에서 다시 시도할 수 있다.
- [ ] Undo가 Markdown 삽입만 제거하고 복사된 실제 파일은 유지한다.
- [ ] Redo가 image 또는 link 삽입을 복원한다.
- [ ] 저장 후 Visual Editor를 다시 열어 상대 image와 link가 유지된다.
- [ ] 로컬 image가 Visual Editor와 GitHub Markdown에서 모두 표시된다.
- [ ] H1, 표, Badge Builder, Floating Toolbar, 한글 IME, 저장 및 외부 변경 동기화가 기존과 동일하게 동작한다.

### 현재 제한

- 한 번에 한 파일만 첨부한다.
- Undo는 복사된 실제 파일을 삭제하지 않는다.
- local desktop workspace만 지원하며 remote, virtual 및 web workspace는 검증하지 않았다.
- drag and drop, clipboard image 저장, image resize 및 압축은 지원하지 않는다.
- 파일 복사 성공 후 예기치 않게 Milkdown 삽입이 실패하면 복사된 파일을 자동 삭제하지 않고 상대 경로를 오류로 안내한다.

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

## 반응형 문서 레이아웃 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] 넓은 Editor Group에서 본문이 중앙에 배치되고 읽기 좋은 최대 폭을 유지한다.
- [x] 좁은 Editor Group에서 좌우 여백이 줄어들어 본문 영역을 확보한다.
- [x] 문단, 목록 및 코드 블록이 창 크기 변경 중 잘리거나 겹치지 않는다.
- [x] 창 크기를 변경하면 Editor를 다시 열지 않아도 레이아웃이 즉시 재배치된다.
- [x] 레이아웃 변경 후에도 Floating Toolbar가 Webview 경계 안에 표시된다.
- [x] 창 크기 변경만으로 Markdown 내용이 수정되지 않는다.

## 코드 블록 CSP 스타일 회귀 테스트

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 여러 줄 fenced code block
- 편집기: Visual Markdown Editor
- 결과: 수정 후 통과

### 확인 항목

- [x] 여러 줄 코드의 줄 번호와 각 코드 줄이 같은 행에 정렬된다.
- [x] 코드 줄을 추가하거나 삭제해도 줄 번호 정렬이 유지된다.
- [x] 긴 코드 줄을 코드 블록 안에서 가로로 스크롤할 수 있다.
- [x] 코드 블록을 편집한 결과가 Markdown으로 저장된다.
- [x] 코드 블록 편집 과정에서 오류 알림이 나타나지 않는다.

### 재검증 메모

CodeMirror가 런타임에 생성한 기본 레이아웃 CSS가 Webview CSP에 의해 차단되어 줄 번호와 코드 열 배치가 깨졌다. Webview의 nonce를 CodeMirror `EditorView.cspNonce` 설정에 전달한 뒤 재검증해 통과했다.

## 편집기 보조 UI 포커스 Smoke Test

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] Floating Toolbar 버튼에 키보드 포커스 테두리가 표시된다.
- [x] Link 입력과 미리보기 링크에 키보드 포커스 테두리가 표시된다.
- [x] 코드 블록의 언어 및 복사 버튼이 키보드 포커스를 받으면 표시된다.
- [x] 코드 블록 언어 목록 항목에 키보드 포커스 테두리가 표시된다.
- [x] 라이트·다크 테마에서 포커스 테두리를 구분할 수 있다.
- [x] 마우스 클릭에는 불필요한 포커스 테두리가 남지 않는다.

## 표 Toolbar 상태 갱신 회귀 테스트

- 실행일: 2026-07-16
- 환경: macOS 26.5.1 (arm64), VS Code 1.127.0
- 대상: Extension Development Host의 GFM 표
- 편집기: Visual Markdown Editor
- 결과: 수정 후 통과

### 확인 항목

- [x] 표 밖에 커서가 있으면 `Table` 버튼이 활성화되고 `Delete Table` 버튼이 비활성화된다.
- [x] 표 셀을 처음 클릭하면 `Table` 버튼이 비활성화되고 `Delete Table` 버튼이 즉시 활성화된다.
- [x] `Delete Table` 버튼을 활성화하기 위해 같은 셀을 두 번 클릭할 필요가 없다.
- [x] 표 밖으로 selection을 옮기면 두 버튼의 활성 상태가 원래대로 돌아온다.
- [x] 상태가 갱신된 뒤에도 선택한 표 셀을 계속 편집할 수 있다.

### 재검증 메모

최초 구현은 Milkdown의 `selectionUpdated` 처리 중 아직 이전 `editorView.state`를 읽어 Toolbar 상태가 selection보다 한 단계 늦게 반영됐다. ProseMirror transaction이 View에 적용된 다음 microtask에서 최신 selection을 읽도록 변경한 뒤 첫 클릭 동작을 재검증해 통과했다.

## Badge Preset Builder Smoke Test

- 실행일: 2026-07-20
- 환경: Extension Development Host
- 대상: `fixtures/badges.md` 및 임시 Markdown 파일
- 편집기: Visual Markdown Editor
- 결과: 통과

### 확인 항목

- [x] `Badge` 버튼이 Builder dialog를 열고 모든 Badge UI 문구가 영어로 표시된다.
- [x] Technology 목록에서 각 카테고리의 프리셋을 선택할 수 있다.
- [x] Color preset에는 Brand와 Dark만 표시된다.
- [x] Brand preset이 기술 brand color를 적용한다.
- [x] Dark preset이 동일한 dark background를 적용한다.
- [x] Brand와 Dark에서 `Show label`을 켜거나 끄면 palette를 바꾸지 않고 label만 추가되거나 제거되며 preview와 삽입 결과에 반영된다.
- [x] Technology, Color preset, Label 및 Style 변경이 preview에 즉시 반영된다.
- [x] Preview loading 및 failure 상태가 dialog 안에서 명확하게 표시된다.
- [x] 빈 Click URL은 일반 image Markdown을 생성한다.
- [x] 유효한 HTTP(S) Click URL은 linked image Markdown을 생성한다.
- [x] 잘못된 Click URL은 삽입을 막고 dialog와 사용자 입력을 유지한다.
- [x] 현재 cursor 위치에 Badge를 삽입하고 dialog가 닫힌 뒤 Editor focus가 복귀한다.
- [x] Badge 삽입을 Undo 한 번과 Redo 한 번으로 되돌리고 다시 적용할 수 있다.
- [x] Badge 삽입 후 dirty state가 표시되고 저장 및 다시 열기가 성공한다.
- [x] `fixtures/badges.md`의 Brand/Dark label on·off, 한글 label, 공백 및 특수문자가 보존된다.
- [x] linked Badge가 GitHub Markdown의 `[![alt](image)](target)` 형식으로 저장된다.
- [x] 기존 Editor Toolbar, Table 편집 및 Floating Toolbar가 이전과 동일하게 동작한다.
- [x] Badge 사용 후 한글 IME, 외부 변경 동기화 및 여러 Markdown 탭 전환이 정상 동작한다.
- [x] Builder와 preview가 VS Code light 및 dark theme에서 읽기 쉽게 표시된다.

## VSIX Installation Smoke Test

- 실행일: 2026-07-20
- 환경: 사용자 로컬 VS Code
- 대상: `easy-markdown-editor-for-developers-0.0.1.vsix`
- 확장 ID: `yunsly.easy-markdown-editor-for-developers`
- SHA-256: `d627d2bb2501a86f01aadda3cbe87d19b0b6ea626f7d8ed8697acee333f519a0`
- 결과: 통과

### 확인 항목

- [x] **Extensions: Install from VSIX...**에서 패키지가 오류 없이 설치된다.
- [x] 설치된 확장이 **Easy Markdown Editor for Developers**라는 이름으로 표시된다.
- [x] 설치 후 Markdown 파일을 확장 편집기로 열 수 있다.
- [x] 설치된 패키지에서 편집기를 사용하는 동안 별도 문제가 발생하지 않는다.

## Table Delete Tooltip 및 Visual/Source Mode 회귀 테스트

- 실행일: 2026-07-21
- 환경: 사용자 로컬 VS Code 및 새로 설치한 VSIX
- 대상: `fixtures/table.md`, `fixtures/unsupported.md`, `fixtures/badges.md`, `fixtures/korean.md` 및 임시 Markdown 파일
- 편집기: Easy Markdown Editor for Developers
- VSIX SHA-256: `e9f0ac9ecf23b97befe34d53ffa998e33ad38c5955fb4a595209b11537b5a929`
- 결과: 통과

### Table Delete Tooltip

- [x] 일반 셀에 cursor를 두면 table 전체 상단 경계에 `Delete Table` Tooltip이 표시된다.
- [x] header 셀과 table 내부 text selection에서도 Tooltip이 표시된다.
- [x] table 밖으로 cursor를 옮기면 Tooltip이 숨겨진다.
- [x] `Alt+Shift+F10`으로 Tooltip 버튼에 접근하고 `Escape`로 Editor에 복귀할 수 있다.
- [x] Tooltip이 좁은 pane, 화면 가장자리 및 가로 스크롤된 table에서도 잘리지 않는다.
- [x] `Delete Table`을 실행하면 활성 table만 삭제되고 주변 내용과 다른 table은 유지된다.
- [x] 한 번의 Undo로 table이 복원되고 Redo로 다시 삭제된다.
- [x] 삭제 직후 cursor가 유효하고 Tooltip이 즉시 숨겨진다.
- [x] Badge, Attachment 또는 Table Size dialog가 열려 있으면 Tooltip이 겹쳐 표시되지 않는다.
- [x] Source Mode에서는 Tooltip이 표시되지 않는다.

### Visual/Source Mode

- [x] 새 Custom Editor가 Visual Mode로 시작한다.
- [x] `Visual | Source`가 Toolbar 오른쪽에 항상 표시되고 mouse, Tab, Enter, Space 및 좌우 화살표로 전환된다.
- [x] Source 전환 시 최신 Markdown 원문과 syntax highlighting이 표시된다.
- [x] Source에서 한글, Emoji, 긴 줄, code fence를 편집하고 copy/paste할 수 있다.
- [x] Source 편집 후 dirty state가 표시되고 `Cmd+S` 또는 `Ctrl+S`로 저장된다.
- [x] Source Undo/Redo가 동작하고 Visual Undo/Redo도 기존대로 동작한다.
- [x] Source 변경 후 Visual로 전환하면 변경 내용이 렌더링된다.
- [x] Visual 변경 후 Source로 전환하면 최신 Markdown이 표시된다.
- [x] 편집 없이 Visual → Source → Visual로 전환해도 dirty state와 파일 byte가 변경되지 않는다.
- [x] Source Mode에서 Visual Toolbar action이 비활성화되고 숨겨진 Milkdown selection을 변경하지 않는다.
- [x] 각 Mode로 돌아오면 focus, selection 및 scroll 위치가 합리적으로 복원된다.
- [x] 외부 Markdown 변경이 활성 Mode와 비활성 Editor 양쪽에 반영되고 feedback loop가 발생하지 않는다.
- [x] Light, Dark 및 High Contrast theme에서 Source text, selection, cursor, gutter와 Segmented Control을 읽을 수 있다.
- [x] Front matter, HTML comment, raw HTML, table, Badge, 상대 image, 한글, Emoji 및 Unicode가 무편집 Mode 왕복에서 보존된다.

### 기본 Custom Editor 및 기존 기능

- [x] 새 VS Code window와 workspace에서 `.md`, README 및 중첩 Markdown 파일을 double click하면 Visual Editor가 기본으로 열린다.
- [x] **Reopen Editor With... → Text Editor**로 기본 Markdown Text Editor를 선택할 수 있다.
- [x] 확장을 비활성화하면 기본 Markdown Text Editor를 사용할 수 있다.
- [x] Heading, list, task list, blockquote, code block 및 Floating Toolbar가 기존대로 동작한다.
- [x] Table 삽입과 기존 row/column 편집 UI가 유지된다.
- [x] Badge Builder, Local File Attachment 및 상대 image 표시가 기존대로 동작한다.
- [x] 한글 IME, 저장, dirty state, 외부 변경 동기화와 여러 Markdown tab이 기존대로 동작한다.
- [x] 저장 후 닫고 다시 열어 Visual/Source 양쪽에서 최종 내용이 일치한다.

### 재검증 메모

첫 실행에서는 `fixtures/unsupported.md`를 열기만 해도 Milkdown의 지연된 초기 정규화 이벤트가 문서 변경으로 전달되어 dirty state가 발생했다. `b727161`에서 Visual 사용자 변경이 실제로 관찰된 경우에만 Markdown 변경을 동기화하도록 수정하고 새 VSIX로 같은 절차를 다시 실행했다. 편집 없이 파일을 열거나 Visual → Source → Visual로 전환한 뒤에도 dirty state와 파일 byte가 유지되는 것을 포함해 최종 사용자 검증을 통과했다.

### 현재 제한

- Visual Mode와 Source Mode는 각각의 Undo history를 사용하며 Mode를 넘나드는 하나의 통합 history는 보장하지 않는다.
- Source와 Visual을 동시에 표시하는 split view는 지원하지 않는다.
- 마지막으로 선택한 Mode를 workspace에 영구 저장하지 않으며 새 Editor는 Visual Mode로 시작한다.
