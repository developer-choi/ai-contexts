# Button 컴포넌트 기능 보완 및 다형성 탐색

## 동기
* 채용과제 레포지토리들의 버튼 컴포넌트 및 네이티브 버튼 마크업을 monorepo-playground (MP)의 `Button` 컴포넌트로 일괄 대체하려 함.
* 대체 가능성을 완벽히 확보하기 위해 MP의 기존 `Button` 스펙에 부족한 기능들을 보완하고, 특히 링크 버튼 대응을 위한 최선의 다형성 지원 방식을 탐색하여 도입하고자 함.

## 요구사항

### 아이콘 레이아웃 제어 (`leftIcon` / `rightIcon`)
* 버튼 텍스트의 좌/우에 아이콘을 유연하게 배치할 수 있도록 `leftIcon?: ReactNode` 및 `rightIcon?: ReactNode` 속성을 지원합니다.
* 로딩 중(`loading = true`)일 때는 기존 아이콘들도 텍스트와 함께 시각적으로 숨겨져야 합니다.
* 참고 소스: [assignment-playground: Button.tsx](file:///C:/Users/forwo/WebstormProjects/recruitment/assignment-playground/src/shared/ui/button/Button.tsx), [recruitment-dada-202602: Button.tsx](file:///C:/Users/forwo/WebstormProjects/recruitment/recruitment-dada-202602/src/shared/components/form/Button.tsx)
* **simplified 레포 및 외부 설계 탐색 메모**: `simplified-material-ui` 등의 simplified 레포지토리를 참조하여 업계 표준 UI 라이브러리들의 아이콘 인터페이스 설계를 조사합니다. 더불어, `ButtonBase`를 바탕으로 `IconButton`과 일반 `Button`을 엄격히 분리(children 대신 `label`/`icon` 제약)하여 구조적 오용을 타입 단에서 차단한 `langdy-design-system`의 패턴도 함께 검토하여 최종 설계에 반영합니다.

### 가로 너비 확장 지원 (`fullWidth`)
* 모바일 뷰나 입력 폼 하단에서 가로 전체를 채우는 디자인을 지원하기 위해 `fullWidth?: boolean` 속성 및 가로 확장 스타일(`width: 100%`)을 지원합니다.
* 참고 소스: [recruitment-dada-202602: Button.tsx](file:///C:/Users/forwo/WebstormProjects/recruitment/recruitment-dada-202602/src/shared/components/form/Button.tsx)
* **simplified 레포 탐색 메모**: simplified 레포지토리를 참조하여, 다른 UI 패키지들이 `fullWidth`나 이와 동등한 가로 확장 레이아웃 속성을 어떤 네이밍과 스타일링 기법으로 처리하고 있는지 조사 및 참고가 필요합니다.
### 로딩 중 클릭 및 제출 방지 처리 방식 검토
* 로딩 중(`loading = true`)일 때 클릭 이벤트가 발생할 경우, 상위 비즈니스 로직(onClick) 호출을 차단하는 것 외에도 **`event.preventDefault()`를 명시적으로 실행하여 form 서브밋 등 브라우저 네이티브 기본 동작까지 막아야 하는지** 여부를 검토합니다.
* **simplified 레포 탐색 메모**: `simplified-` 레포지토리들(react, radix-themes 등)의 버튼 구현 코드를 탐색하여 로딩/비활성 처리 시 `event.preventDefault()` 적용 실태를 조사하고 최종 모델을 결정합니다.


### 최고의 다형성 지원 방법 탐색 및 도입
* 버튼 형태의 링크(Next.js의 `<Link>` 등)를 깔끔하게 다루기 위해서는 다른 태그나 컴포넌트로 변환할 수 있는 다형성(Polymorphism) 지원이 필수적입니다.
* 단순히 `asChild` 속성을 얹는 기계적인 해결책을 넘어, **TypeScript 타입 정의의 복잡도와 안전성, DX(개발자 경험), 번들 가벼움**을 모두 고려했을 때 최고의 다형성 지원 방법이 무엇인지 기술 탐색이 필요합니다.
* 탐색 후보 패턴:
  * Radix UI의 `@radix-ui/react-slot` 패키지를 이용한 `asChild` 방식 ([recruitment-wisebirds-20260505: button.tsx](file:///C:/Users/forwo/WebstormProjects/recruitment/recruitment-wisebirds-20260505/packages/ui/src/components/ui/button.tsx) 참고)
  * generic parameter를 이용해 `as` Prop에 태그명/컴포넌트를 직접 넘기는 전통적인 Polymorphic Component 타입 정의 방식
  * 다형성을 제공하지 않고 Next.js `Link` 전용 `ButtonLink` 컴포넌트를 분리하여 개별 제공하는 방식

#### 임시 구현 현황 (이 결정에 따라 바뀔 수 있음)

* 위 다형성 방식을 아직 확정하지 않은 상태에서, 우선 **`@radix-ui/react-slot`의 `asChild` 방식**으로 MP `Button`(`packages/design-system/src/components/Button.tsx`)에 임시 적용해 둠.
  * `asChild?: boolean` prop을 추가하고, true이면 루트를 `Slot.Root`로 교체. radix `@radix-ui/themes` BaseButton 구현과 동일한 패턴(완전 제네릭 다형성이 아니라 boolean + 루트 교체).
  * spinner+children 2자식 문제는 `Slot.Slottable`로 children을 slot 대상으로 지정해 해결.
* 위 "탐색 후보 패턴" 중 다른 방식(전통 Polymorphic `as`, `ButtonLink` 분리 등)으로 최종 결정되면 이 임시 구현은 교체 대상.
