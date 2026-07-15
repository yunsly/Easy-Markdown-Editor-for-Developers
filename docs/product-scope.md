# Visual Markdown Editor 제품 범위

## 해결하려는 문제

Markdown 문법에 익숙하지 않은 사용자도 VS Code를 벗어나지 않고 `.md` 파일을 일반 문서처럼 읽고 편집할 수 있어야 한다. 기존 Markdown Preview는 렌더링 결과를 보여 주지만 그 화면에서 직접 편집할 수 없으므로, 원문 편집기와 미리 보기 사이를 오가야 한다.

이 프로젝트는 VS Code의 Editor Tab 안에서 렌더링된 Markdown을 직접 수정하고, 결과를 원본 `.md` 파일에 안전하게 저장하는 Visual Markdown Editor를 제공한다. 기능 수나 시각적 완성도보다 Markdown 데이터 보존과 안정적인 한글 IME 입력을 우선한다.

## 타깃 사용자

- Markdown 문법을 외우지 않고 문서를 작성하려는 VS Code 사용자
- README, 기술 문서, 회의록 등을 시각적으로 편집하려는 개발자와 비개발자
- 한글과 영어가 섞인 Markdown 문서를 자주 작성하는 사용자
- 편집 결과를 별도 형식이 아닌 기존 `.md` 파일로 계속 관리하려는 사용자

## 핵심 사용자 흐름

1. 사용자가 VS Code Explorer에서 `.md` 파일을 선택한다.
2. 사용자가 `Visual Markdown Editor`로 파일을 연다. 기본 Markdown Text Editor도 계속 선택할 수 있다.
3. 편집기는 현재 `TextDocument`의 Markdown 문자열을 읽어 렌더링된 편집 화면을 표시한다.
4. 사용자가 본문을 직접 편집하고, 텍스트 선택 시 나타나는 Floating Toolbar로 인라인 서식을 적용한다.
5. 편집 결과는 Markdown 문자열로 직렬화되어 VS Code `TextDocument`에 반영되고 dirty 상태가 표시된다.
6. 사용자가 `Cmd+S` 또는 `Ctrl+S`를 누르면 VS Code의 일반 저장 흐름으로 원본 파일을 저장한다.
7. 다른 편집기나 외부 도구가 문서를 변경하면 Visual Editor가 최신 내용을 반영한다.
8. 지원하지 않거나 안전한 보존이 검증되지 않은 문법이 있으면 편집 전에 경고하고 기본 Markdown Text Editor 사용을 안내한다.

## MVP 포함 범위

### 편집과 VS Code 통합

- `.md` 파일용 선택형 Custom Text Editor
- Milkdown 또는 Milkdown Crepe 기반 시각적 편집
- 기존 Markdown 문자열의 초기 로딩
- 편집 결과의 Markdown 문자열 직렬화
- Webview와 `TextDocument` 사이의 양방향 동기화
- VS Code dirty 상태, 저장, Undo, Redo 지원
- 외부 문서 변경 반영과 동기화 반복 방지
- 기본 Markdown Text Editor로 다시 열 수 있는 선택권 유지

### 문서 작성 기능

- 제목 1~3과 일반 문단
- 굵게, 기울임, 취소선, 인라인 코드, 링크
- 글머리 목록, 번호 목록, 체크리스트
- 인용문과 코드 블록
- 선택 영역용 Floating Toolbar
- 안정적인 한글 IME 및 한영 혼합 입력
- VS Code 라이트·다크 테마에서 읽을 수 있는 화면

### 데이터 안전과 배포

- 지원 문법에 대한 fixture 기반 Markdown round-trip 검증
- HTML, HTML 주석, front matter 등 보존 미검증 문법에 대한 경고 정책
- 동기화 실패를 사용자에게 알리는 오류 처리
- VSIX 패키징 및 깨끗한 VS Code 프로필에서의 설치 확인

## MVP 제외 범위

- AI 문서 교정 또는 작성 기능
- 이미지 업로드
- 고급 표 편집
- Mermaid와 수식
- Slash Command
- 블록 드래그 앤 드롭
- 실시간 협업
- Markdown 원문과 Visual Editor의 동시 분할 편집
- 웹 버전 VS Code 지원
- 원격 저장소 자동 게시와 Marketplace 자동 배포
- 모바일 지원

제외 기능은 MVP의 데이터 안전성, 동기화, 한글 입력이 안정화된 뒤 별도 범위로 검토한다.

## MVP 완료 조건

다음 항목을 모두 실제로 검증했을 때 MVP가 완료된 것으로 본다.

- [ ] `.md` 파일을 선택적으로 `Visual Markdown Editor`에서 열 수 있다.
- [ ] 현재 파일의 Markdown 내용이 시각적 편집기에 표시된다.
- [ ] 한글 연속 입력, 한영 전환, Backspace, 복사·붙여넣기에서 조합 중인 글자가 누락되거나 커서가 이동하지 않는다.
- [ ] 시각적 편집 결과가 Markdown 문자열로 `TextDocument`에 반영되고 dirty 상태가 표시된다.
- [ ] `Cmd+S` 또는 `Ctrl+S`로 원본 `.md` 파일을 저장할 수 있다.
- [ ] VS Code의 Undo와 Redo가 편집 흐름에서 동작한다.
- [ ] 외부 문서 변경이 Visual Editor에 반영되며, 일반 입력 중에는 편집기를 재생성하지 않는다.
- [ ] 내부 변경과 외부 변경 사이에 동기화 무한 루프가 발생하지 않는다.
- [ ] 제목, 문단, 인라인 서식, 링크, 목록, 체크리스트, 인용문, 코드 블록을 편집하고 의미를 보존할 수 있다.
- [ ] 텍스트 선택 시 Floating Toolbar가 나타나고 굵게, 기울임, 취소선, 인라인 코드, 링크를 적용·해제할 수 있다.
- [ ] 라이트·다크 테마와 키보드 탐색에서 편집기와 Toolbar를 읽고 조작할 수 있다.
- [ ] 지원한다고 명시한 Markdown fixture가 round-trip 검증을 통과한다.
- [ ] 안전한 보존이 검증되지 않은 문법은 조용히 삭제되지 않고 사용자에게 경고된다.
- [ ] VSIX를 생성하고 깨끗한 VS Code 프로필에 설치하여 핵심 사용자 흐름을 재현할 수 있다.
