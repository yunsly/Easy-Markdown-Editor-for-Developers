# 블록 요소

이 문서는 인용문과 코드 블록의 파싱 및 직렬화를 확인하기 위한 fixture입니다.

## 인용문

> 첫 번째 인용문 문단입니다.
>
> 빈 줄 뒤에 이어지는 두 번째 문단입니다.
>
> > 중첩된 인용문입니다.

## 언어 식별자가 없는 코드 블록

```
첫 번째 줄

두 번째 줄에는 <tag>, &, "따옴표"가 있습니다.
```

## TypeScript 코드 블록

```ts
function greet(name: string): string {
  const message = `안녕하세요, ${name}!`;

  return message;
}
```
