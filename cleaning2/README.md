# Grooming & Clean-up Playable

`docs/prd.txt` 기준으로 만든 모바일 세로형 플레이어블 게임입니다. 터치와 마우스 드래그를 모두 지원하고, 에셋이 비어 있어도 바로 플레이할 수 있도록 SVG 플레이스홀더가 함께 포함되어 있습니다.

## 실행 방법

가장 간단하게는 프로젝트 루트에서 정적 서버를 띄우면 됩니다.

```powershell
python -m http.server 4173
```

그다음 브라우저에서 `http://localhost:4173` 를 열면 됩니다.

정적 파일만 사용하므로, 서버 없이 `index.html` 을 직접 열어도 대부분 동작하지만 로컬 서버 실행을 권장합니다.

## 파일 구조

- `index.html`: 게임 UI와 캔버스 진입점
- `styles.css`: 반응형 레이아웃과 HUD 스타일
- `src/game.js`: 3단계 게임 로직, 드래그 처리, 성공 연출
- `docs/prd.txt`: 원본 요구사항
- `assets/`: 배경, 로고, 캐릭터, 도구 에셋

## 에셋 교체 규칙

현재는 SVG 플레이스홀더가 들어 있으며, 같은 이름의 PNG를 넣으면 PNG를 우선 사용합니다.

- `assets/model/background.png`
- `assets/model/logo_game.png`
- `assets/model/logo_success.png`
- `assets/model/dirty&wrapped.png`
- `assets/model/clean&wrapped.png`
- `assets/model/clean.png`
- `assets/model/hair_messy.png`
- `assets/model/hair_clean.png`
- `assets/model/finger.png`
- `assets/model/success.png`
- `assets/tools/ui_towel.png`
- `assets/tools/ui_needle.png`
- `assets/tools/ui_comb.png`

PNG가 없으면 같은 경로의 `.svg` 파일을 자동으로 사용합니다.

## 구현 포인트

- 1단계: 캐릭터 위를 드래그해 진흙 제거
- 2단계: 수선 가이드를 따라 드래그해 옷 수선
- 3단계: 머리 영역을 빗질해 헤어 정리
- 진행도 UI, 현재 목표 텍스트, 도구 플로팅 표시
- 시작 화면과 성공 로고, 성공 연출 포함
- 모바일 세로형 기준으로 구성하고, PC에서는 중앙에 맞춰 스케일
