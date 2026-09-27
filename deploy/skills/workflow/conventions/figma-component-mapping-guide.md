# 피그마 컴포넌트 매칭표 생성 가이드

> 피그마 MCP가 제공하지 않는 variant props(styleType, size 등)를 디자인시스템 원본 소스에서 역추론하여 매칭표를 만든다.

## 생성 절차

Markup Implementer spawn 직전에 Lead가 수행한다.

1. 사용자에게 **디자인시스템 원본 레포 경로** 요청
2. 매칭표를 `/plan/background/consumable/figma-component-mapping.md`에 저장 ([템플릿](../template/figma-component-mapping.md) 참조)

## 검증

생성된 매칭표를 디자인시스템 원본 소스와 대조한다.
