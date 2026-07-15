# Visual Markdown Editor 아키텍처

## 문서 목적

이 문서는 MVP 구현이 따라야 할 계층 경계와 데이터 흐름을 정의한다. 현재 저장소에는 아직 Extension 실행 코드가 없으므로 아래 내용은 구현 완료 상태가 아니라 목표 아키텍처다. 실제 API와 Milkdown 동작을 확인하면서 세부 타입이 달라지면 코드와 이 문서를 같은 작업에서 함께 갱신한다.

## 핵심 원칙

1. VS Code `TextDocument`를 문서 내용과 버전의 권위 있는 원본으로 취급한다.
2. Extension Host만 VS Code API를 사용하고 Webview는 VS Code 객체에 직접 접근하지 않는다.
3. Extension Host와 Webview는 HTML이 아닌 Markdown 문자열을 교환한다.
4. Webview에서 직렬화된 변경은 `WorkspaceEdit`을 통해서만 `TextDocument`에 적용한다.
5. 문서 버전을 확인하지 않은 변경으로 더 최신 내용을 덮어쓰지 않는다.
6. 일반 입력과 한글 조합 중에는 Milkdown Editor를 재생성하지 않는다.
7. 내부 변경과 외부 변경을 구분해 feedback loop를 방지한다.
8. 미검증 Markdown 문법을 조용히 제거할 수 있는 편집 흐름을 허용하지 않는다.

## 시스템 경계

```text
VS Code Workbench
    |
    | opens .md with visualMarkdown.editor
    v
TextDocument  <---- WorkspaceEdit / onDidChangeTextDocument ----+
    ^                                                        |
    |                                                        v
VisualMarkdownEditorProvider                         Document sync state
    |                                                        |
    +---- typed Markdown messages ----------------------------+
                             |
                             v
                       Webview bridge
                             |
                             v
                    Milkdown / Crepe Editor
```

`TextDocument`와 `WorkspaceEdit`은 Extension Host 영역에만 존재한다. Milkdown과 DOM은 Webview 영역에만 존재하며, 두 환경 사이의 유일한 데이터 경로는 검증된 typed message다.

## 계층별 책임

| 계층 | 책임 | 하지 않는 일 |
| --- | --- | --- |
| Extension entry point | 확장 활성화, Custom Editor Provider 등록, 구독 해제 | Webview DOM이나 Milkdown 조작 |
| Visual Editor Provider | Webview 설정, HTML 생성, panel 생명주기, 메시지 연결 | Markdown 렌더링과 직접 편집 |
| Document sync | 문서 버전 확인, `WorkspaceEdit` 적용, 내부·외부 변경 분류, 오류 전달 | VS Code를 우회한 디스크 쓰기 |
| Shared messages | 양방향 discriminated union과 런타임 유효성 검사 | VS Code 또는 DOM 의존성 포함 |
| Webview bridge | 준비 알림, 변경 큐, 버전·적용 확인 관리, 오류 표시 | VS Code API 직접 호출 |
| Milkdown / Crepe | Markdown 파싱·렌더링·직렬화, 선택 영역, 편집기 생명주기 | 파일 저장 또는 문서 버전 결정 |
| Floating Toolbar | 선택 상태 관찰, 서식 명령 실행, 접근 가능한 UI | Extension Host와 직접 통신 |

## 목표 파일 책임

실제 책임이 생길 때 다음 구조를 기준으로 파일을 추가한다. 구현 전 빈 계층을 미리 만들지는 않는다.

```text
src/
  extension.ts                              Provider 등록과 deactivate 경계
  editor/VisualMarkdownEditorProvider.ts    Custom Text Editor 및 panel 연결
  editor/createWebviewHtml.ts               CSP와 로컬 리소스 HTML
  editor/documentSync.ts                    TextDocument 동기화 정책
  shared/messages.ts                        공유 메시지 타입과 validator
webview/src/
  main.ts                                   Webview 시작과 종료
  vscodeApi.ts                              acquireVsCodeApi 단일 래퍼
  editor/createEditor.ts                    Milkdown 생성과 dispose
  editor/floatingToolbar/                   선택 기반 Toolbar
```

## 메시지 프로토콜

메시지는 `type` 필드를 기준으로 좁혀지는 discriminated union을 사용한다. 수신 측은 `event.data`를 신뢰하지 않고 필수 필드의 타입과 값을 검사한다.

목표 메시지 형태는 다음과 같다.

```ts
type ExtensionToWebviewMessage =
  | { type: 'initDocument'; text: string; version: number }
  | { type: 'replaceDocument'; text: string; version: number }
  | { type: 'documentApplied'; changeId: number; version: number }
  | { type: 'showError'; message: string };

type WebviewToExtensionMessage =
  | { type: 'ready' }
  | {
      type: 'documentChanged';
      text: string;
      baseVersion: number;
      changeId: number;
    }
  | { type: 'reportError'; message: string };
```

- `version`은 VS Code `TextDocument.version`을 의미한다.
- `baseVersion`은 Webview가 편집을 시작할 때 알고 있던 마지막 적용 버전이다.
- `changeId`는 Webview panel 안에서 단조 증가하며 요청과 적용 확인을 연결한다.
- 오류 메시지는 사용자에게 보여 줄 안전한 설명만 포함하고 임의 HTML을 포함하지 않는다.

구현 중 필드가 추가되더라도 Markdown 원문, 문서 버전, 변경 식별자의 역할은 분리한다.

## 초기 문서 로딩

1. VS Code가 `.md` 파일에 대해 `VisualMarkdownEditorProvider`를 호출한다.
2. Provider는 scripts 활성화와 제한된 `localResourceRoots`를 설정하고 CSP가 포함된 HTML을 제공한다.
3. Webview 번들이 로드되면 `ready`를 보낸다.
4. Extension Host는 그 시점의 `TextDocument.getText()`와 `TextDocument.version`을 `initDocument`로 보낸다.
5. Webview는 Markdown 문자열로 Milkdown Editor를 한 번 생성하고 현재 버전을 저장한다.
6. 초기화 실패 시 Webview는 `reportError`를 보내고 Extension Host는 사용자에게 오류를 알린다.

Markdown 문자열을 HTML template에 삽입하지 않고, Webview가 준비된 뒤 message payload로만 전달한다.

## Webview 편집 반영

1. 사용자가 Milkdown에서 문서를 편집한다.
2. Webview는 조합 입력 중에는 직렬화 전송을 보류하고, 조합 종료 후 변경을 약 300ms debounce한다.
3. Milkdown에서 Markdown 문자열을 얻어 `documentChanged`를 보낸다.
4. Extension Host는 메시지 유효성과 `baseVersion === TextDocument.version`을 확인한다.
5. 버전이 일치하면 문서 전체 범위를 계산하고 `WorkspaceEdit`으로 Markdown을 적용한다.
6. 적용 결과가 확인되면 Extension Host는 새 문서 버전을 `documentApplied`로 보낸다.
7. Webview는 적용 확인을 받은 뒤에만 대기 중인 최신 변경을 새 `baseVersion`으로 전송한다.

Webview는 한 번에 하나의 변경만 전송 중 상태로 둔다. 사용자가 적용 확인 전에 계속 입력하면 중간 snapshot을 모두 보내지 않고 최신 Markdown 하나만 대기시킨다. 이 규칙은 빠른 입력에서 버전 충돌과 불필요한 undo 항목을 줄인다.

## 내부 변경과 feedback loop 방지

`WorkspaceEdit`이 성공하면 VS Code는 `onDidChangeTextDocument`를 발생시킨다. Document sync는 적용 중인 `changeId`, 예상 Markdown, 대상 문서를 기록한다.

- 이벤트의 문서와 내용이 예상한 내부 변경과 일치하면 origin Webview에는 전체 문서를 다시 보내지 않고 `documentApplied`만 보낸다.
- 같은 문서를 보여 주는 다른 panel이 있다면 최신 내용을 `replaceDocument`로 보낸다.
- 예상 내용이나 버전이 다르면 내부 변경으로 간주하지 않고 외부 변경 또는 충돌 흐름으로 처리한다.
- 적용 성공 여부가 확인되면 pending 상태를 반드시 정리한다.

문자열이 우연히 같다는 이유만으로 모든 이벤트를 무시하지 않고 문서 식별자, 변경 식별자, 버전, 예상 내용을 함께 사용한다.

## 외부 변경과 충돌 처리

기본 Text Editor, Undo/Redo, Git 작업 또는 외부 도구가 `TextDocument`를 변경하면 Extension Host가 이를 감지한다.

1. 변경이 pending 내부 적용과 일치하지 않으면 최신 Markdown과 버전을 `replaceDocument`로 보낸다.
2. Webview에 전송 중인 로컬 변경이 없다면 현재 Milkdown 인스턴스의 내용을 교체한다.
3. 전송 중이거나 대기 중인 로컬 변경이 있다면 더 최신 문서를 자동으로 덮어쓰지 않고 충돌을 표시한다.
4. MVP에서는 충돌 시 최신 `TextDocument`를 권위 있는 원본으로 유지하고, 사용자에게 기본 Markdown Text Editor에서 확인하도록 안내한다.

외부 변경으로 전체 내용을 교체할 때 커서가 초기화되는 것은 MVP에서 허용하지만, 일반 Webview 입력에는 전체 교체를 사용하지 않는다.

## 저장과 Undo/Redo

- Extension은 파일 시스템에 직접 쓰지 않는다. `WorkspaceEdit`이 `TextDocument`를 변경하면 VS Code가 dirty 상태와 저장을 관리한다.
- `Cmd+S`와 `Ctrl+S`는 VS Code의 문서 저장 흐름을 사용한다.
- Undo/Redo로 발생한 `TextDocument` 변경도 외부 변경과 같은 경로로 Webview에 반영한다.
- Milkdown의 로컬 history와 VS Code undo stack 사이의 키보드 라우팅은 통합 테스트로 확인하기 전까지 지원 완료로 표시하지 않는다.

## 한글 IME 정책

- `compositionstart`부터 `compositionend`까지 조합 상태를 추적한다.
- 조합 중인 Markdown snapshot을 Extension Host에 전송하지 않는다.
- 조합 종료 후 최종 문자열만 debounce 대상에 포함한다.
- 일반 타이핑과 조합 입력 중 Milkdown Editor를 dispose하거나 재생성하지 않는다.
- 마지막 음절 누락, Backspace, 한영 전환, 빠른 입력, 서식 상태에서의 한글 입력을 수동 smoke test로 확인한다.

## Webview 보안

- scripts와 styles는 extension package의 로컬 번들만 사용한다.
- 모든 리소스 URI는 `webview.asWebviewUri()`로 변환한다.
- `localResourceRoots`는 필요한 build output 디렉터리로 제한한다.
- CSP는 기본 출처를 차단하고 nonce가 있는 local script와 필요한 local style만 허용한다.
- 외부 CDN, inline event handler, 임의 remote script를 사용하지 않는다.
- 사용자 Markdown을 Webview HTML 문자열에 직접 삽입하거나 `innerHTML`로 렌더링하지 않는다.

## 생명주기와 정리

Webview panel이 닫히면 message listener, document-change listener, debounce timer, composition listener, Milkdown Editor를 정리한다. Extension이 비활성화될 때 Provider 등록도 dispose한다. dispose 이후 도착한 비동기 결과는 문서나 Webview를 변경하지 않는다.

## 오류 처리

- 메시지 유효성 실패, 버전 충돌, `WorkspaceEdit` 실패, 읽기 전용 또는 닫힌 문서를 구분한다.
- Extension Host 오류는 `showError`와 VS Code 알림을 통해 사용자에게 알린다.
- Webview 초기화·직렬화 오류는 `reportError`로 Extension Host에 전달한다.
- 오류 이후 원본 `TextDocument`를 자동으로 대체하거나 미검증 Markdown을 저장하지 않는다.
- 사용자에게 복구 방법 또는 기본 Markdown Text Editor 사용 안내를 제공한다.

## 아키텍처 검증 조건

- Extension Host와 Webview bundle이 서로의 런타임 API를 import하지 않는다.
- 공유 메시지 validator가 잘못된 payload를 거부한다.
- 연속 입력에서도 Webview가 동시에 둘 이상의 변경을 전송 중으로 두지 않는다.
- 내부 `WorkspaceEdit`이 다시 `replaceDocument`로 돌아오는 loop가 없다.
- 더 최신 `TextDocument.version`이 있으면 오래된 Webview 변경을 적용하지 않는다.
- 외부 변경에서만 전체 문서 교체가 일어난다.
- 한글 조합 중에는 문서 적용과 Editor 재생성이 발생하지 않는다.
- panel dispose 후 listener와 Editor 인스턴스가 남지 않는다.
