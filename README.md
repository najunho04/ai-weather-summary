# 🌤️ AI 날씨 요약

공공데이터 기상청 단기예보 API에서 날씨 데이터를 가져와 **Anthropic Claude(`claude-haiku-4-5`)** 로 추론·요약하여, 읽기 쉬운 자연어 날씨 요약을 보여주는 간단한 웹사이트입니다.

## 구조

```
.
├── api/weather-summary.js   # 조회+요약 오케스트레이션 (Vercel 서버리스 함수)
├── lib/
│   ├── cities.js            # 도시 → 격자좌표(nx, ny) 매핑
│   ├── weather.js           # 기상청 단기예보 호출·파싱
│   └── summary.js           # Claude 자연어 요약
├── public/                  # 정적 프론트엔드 (HTML/CSS/JS)
├── server.js                # 로컬 개발 서버 (Express, /api 핸들러 재사용)
└── vercel.json
```

- 프론트엔드는 빌드 도구 없는 순수 HTML/CSS/JS
- 백엔드는 단일 엔드포인트 `GET /api/weather-summary?city=서울`
- DB 없음 — 매 요청 실시간 조회
- API 키는 서버 환경변수로만 보관(브라우저 미노출)

## 사전 준비 — API 키 2개

1. **공공데이터포털 기상청 단기예보**
   `https://www.data.go.kr` → "기상청_단기예보 ((구)동네예보) 조회서비스" 활용신청
   → 발급된 **일반 인증키(Decoding)** 값을 사용
2. **Anthropic API 키** — `https://console.anthropic.com`

`.env.example`을 `.env`로 복사 후 두 키를 채웁니다.

```bash
cp .env.example .env
```

## 로컬 실행

```bash
npm install
node --env-file=.env server.js   # http://localhost:3000
```

(Node 20+ 의 `--env-file` 로 `.env`를 로드합니다.)

## GitHub & Vercel 배포 자동화

이 저장소를 GitHub에 올리고 Vercel 프로젝트에 연결하면, **이후 `git push`마다 Vercel이 자동으로 빌드·배포**합니다.

1. GitHub 저장소 생성 후 push
2. `https://vercel.com/new` 에서 해당 GitHub 저장소 Import (Framework Preset: **Other**)
3. Vercel 프로젝트 **Settings → Environment Variables** 에 `WEATHER_API_KEY`, `ANTHROPIC_API_KEY` 추가
4. Deploy — 이후 main 브랜치 push 시 자동 재배포

> Vercel은 `/public`을 정적 호스팅, `/api/*.js`를 서버리스 함수로 자동 인식합니다(zero-config).
