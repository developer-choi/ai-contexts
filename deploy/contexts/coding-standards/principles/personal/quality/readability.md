# 읽기 쉬운 코드 (Personal)

## UI와 1대1로 매칭되는 코드
```typescript jsx
// 권장되지 않는 패턴: 데이터 중심의 구조  
function TransferPage() {  
  const { step, data } = useTransfer();  
  return (  
    <Container>  
      {step === 'INPUT' && <InputForm data={data} />}  
      {step === 'CONFIRM' && <ConfirmView data={data} />}  
    </Container>  
  );  
}

// 권장되는 패턴 (토스 스타일): UI 구조가 드러나는 선언적 구조  
function TransferPage() {  
  return (  
    <PageLayout>  
      <PageHeader title="송금하기" />  
      <TransferContent>  
        <Suspense fallback={<AccountSkeleton />}>  
           <SenderAccountSection />  
        </Suspense>  
        <ReceiverInputSection />  
      </TransferContent>  
      <BottomButtonArea />  
    </PageLayout>  
  );  
}
```

후자의 경우, PageLayout 안에 Header, Content, ButtonArea가 존재한다는 시각적 계층 구조가 코드에 그대로 반영되어 있다.

이는 유지보수 시 "버튼 위치를 바꾸라"는 요구사항이 왔을 때 어디를 수정해야 할지 직관적으로 알 수 있게 해준다.

