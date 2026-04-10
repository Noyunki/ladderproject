# Fake Merge Rescue

`prd.txt` 기반으로 만든 정적 플레이어블 광고 프로토타입입니다. 별도 빌드 없이 브라우저에서 바로 실행할 수 있고, 모바일과 PC 화면 모두를 고려해 반응형으로 구성했습니다.

## 실행 방법

1. [index.html](E:\ladderproject\merge\index.html)을 브라우저에서 바로 엽니다.
2. 또는 현재 폴더에서 간단한 정적 서버를 띄워 확인합니다.

```powershell
cd E:\ladderproject\merge
python -m http.server 4173
```

그 다음 브라우저에서 `http://localhost:4173`으로 접속하면 됩니다.

## 파일 구조

- [index.html](E:\ladderproject\merge\index.html): 화면 마크업
- [styles.css](E:\ladderproject\merge\styles.css): 반응형 스타일과 상태별 연출
- [game.js](E:\ladderproject\merge\game.js): 상태 머신, 타임라인, 머지 로직
- [game-data.js](E:\ladderproject\merge\game-data.js): 문구, 타이밍, 아이템 데이터, CTA 설정

## 교체 포인트

`game-data.js`만 수정해도 아래 항목을 손쉽게 바꿀 수 있습니다.

- `meta.brandLabel`: 상단 브랜드 라벨
- `meta.objective`: 상단 목표 문구
- `meta.retryLabel`, `meta.ctaLabel`: 버튼 라벨
- `meta.ctaUrl`: 실제 이동시킬 URL
- `assets.backgroundImage`: 배경 이미지
- `assets.character.idle|success|fail`: 상태별 캐릭터 이미지
- `assets.brandImage`: 브랜드 로고 이미지
- `layout.portraitBreakpointRatio`: 세로형 광고 모드 전환 기준
- `timelineMs`: 프리인트로, 머지, CTA 타이밍
- `items`: 아이템 3종의 이름, 설명, 색상
- `correctPair`: 정답 조합
- `phaseText`: 단계별 헤드라인과 안내 문구

## 이벤트 연동

외부 광고 래퍼나 SDK와 연결할 수 있도록 브라우저 이벤트와 전역 훅을 지원합니다.

- DOM 이벤트: `fake-merge:gameStart`
- DOM 이벤트: `fake-merge:layoutChange`
- DOM 이벤트: `fake-merge:phaseChange`
- DOM 이벤트: `fake-merge:itemSelect`
- DOM 이벤트: `fake-merge:mergeResolved`
- DOM 이벤트: `fake-merge:ctaReveal`
- DOM 이벤트: `fake-merge:retryClick`
- DOM 이벤트: `fake-merge:ctaClick`

전역 훅은 `window.GAME_HOOKS`에 같은 이름의 함수를 넣어 사용할 수 있습니다.

```html
<script>
  window.GAME_HOOKS = {
    ctaClick(detail) {
      console.log("CTA clicked", detail);
    },
    mergeResolved(detail) {
      console.log("merge result", detail);
    }
  };
</script>
```

## 현재 구현 범위

- `PreIntro → Intro → Play → Merge → Result → CTA` 흐름
- 3개 아이템 중 2회 탭으로 자동 머지
- 정답 1조합, 오답 시 재시도 1회
- 결과 배지와 남은 찬스 표시
- 5초 시점 CTA 노출, 6초 광고 흐름 기준 진행
- 세로형 9:16에 가까운 화면비에서는 portrait 전용 배치 자동 적용
- 에셋 이미지가 있으면 CSS 더미 캐릭터 대신 자동 교체

## 다음 확장 아이디어

- 실제 이미지 리소스 기반 캐릭터/배경 교체
- 광고 SDK 연동용 클릭/결과 이벤트 훅 추가
- 다국어 데이터 세트 분리
- 세로형 9:16 광고 슬롯용 전용 레이아웃 분기
