# Team Random Selector

Next.js + Tailwind CSS로 만든 팀 랜덤 선택기입니다.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

정적 결과물은 `out/` 디렉터리에 생성됩니다.

## Cloudflare Pages

- Framework preset: `Next.js (Static HTML Export)` 또는 `None`
- Build command: `npm run build`
- Build output directory: `out`

이 프로젝트는 `next.config.mjs`에서 `output: "export"`를 사용하므로 Cloudflare Pages에 정적 사이트로 배포할 수 있습니다.

## URL Sharing

- 예시: `/?names=민지,지훈,서연`
- 항목은 콤마로 구분됩니다.
- 항목 자체에 콤마가 포함된 경우 초기 버전에서는 권장하지 않습니다.
