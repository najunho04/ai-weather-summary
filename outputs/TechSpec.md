# AI 날씨 요약 Tech Spec

## Overview

"AI 날씨 요약"은 정적 웹 프론트엔드와 단일 Node.js(Express) 백엔드로 구성된 클라이언트-서버 웹 애플리케이션이다. 브라우저는 도시 선택 UI와 결과 표시만 담당하고, 실제 외부 API 호출과 추론은 모두 백엔드에서 처리한다. 백엔드는 단일 엔드포인트(`/api/weather-summary`)를 가진 모놀리식 서버로, 기상청 단기예보 API로 원본 날씨 데이터를 받아 Anthropic Claude API로 자연어 요약을 생성한 뒤 클라이언트에 반환한다.

기술 스택은 의도적으로 최소화한다. 프론트엔드는 빌드 도구나 프레임워크 없이 순수 HTML/CSS/Vanilla JS로 작성하고, 데이터베이스는 사용하지 않으며 모든 조회는 실시간으로 수행한다. 도시→격자좌표 매핑은 서버 코드 내 정적 상수로 관리한다.

## Components

| ID     | Name           | Responsibility                                         | Implements (FR-ID) |
|--------|----------------|--------------------------------------------------------|--------------------|
| CMP-001 | WebUI          | 도시 드롭다운 렌더링, 조회 요청, 요약 결과·로딩·오류 표시 | FR-001, FR-004     |
| CMP-002 | WeatherClient  | 기상청 단기예보 API 호출 및 핵심 항목 파싱              | FR-002             |
| CMP-003 | SummaryService | Claude API 프롬프트 구성 및 자연어 요약 생성            | FR-003             |
| CMP-004 | ApiServer      | 단일 요약 엔드포인트에서 조회·요약 오케스트레이션 및 응답 | FR-002, FR-003, FR-004 |

### CMP-001: WebUI

**책임:**
- 주요 도시 드롭다운 렌더링 및 선택값 관리
- 조회 버튼 클릭 시 백엔드 엔드포인트 호출
- 로딩 상태, 요약 텍스트, 오류 메시지 표시

**의존성:** CMP-004 (백엔드 엔드포인트 호출)

### CMP-002: WeatherClient

**책임:**
- 전달받은 nx, ny와 최신 발표시각으로 단기예보 API 호출
- 응답에서 TMP, SKY, PTY, POP 등 핵심 항목 추출
- 응답 오류·빈 데이터 시 오류 반환

**의존성:** DEP-001 (기상청 단기예보 API)

### CMP-003: SummaryService

**책임:**
- 파싱된 날씨 데이터를 프롬프트로 구성
- Claude API 호출로 한국어 자연어 요약(행동 권고 포함) 생성
- 호출 실패 시 오류 반환

**의존성:** DEP-002 (Anthropic Claude API)

### CMP-004: ApiServer

**책임:**
- `/api/weather-summary` 엔드포인트 제공
- 도시명 → 격자좌표 매핑 후 CMP-002 호출, 결과를 CMP-003에 전달
- 최종 요약 결과를 JSON으로 클라이언트에 반환, 단계별 오류 처리

**의존성:** CMP-002, CMP-003

### Component Interfaces

| Component | Method               | Inputs            | Outputs                          |
|-----------|----------------------|-------------------|----------------------------------|
| CMP-001   | requestSummary()     | city              | rendered summary, error message  |
| CMP-002   | fetchForecast()      | nx, ny            | WeatherData                      |
| CMP-003   | summarize()          | WeatherData       | summaryText                      |
| CMP-004   | getWeatherSummary()  | city              | SummaryResult, error             |

## Data Models

| ID     | Name          | Key Fields                                                         |
|--------|---------------|--------------------------------------------------------------------|
| DM-001 | WeatherData   | city, nx, ny, baseDate, baseTime, temperature, sky, precipitationType, precipitationProbability, forecastTime |
| DM-002 | SummaryResult | city, summaryText, generatedAt                                     |
| DM-003 | CityGrid      | cityName, nx, ny                                                   |

### DM-001: WeatherData

| Field                    | Type   | Required | Description                       |
|--------------------------|--------|----------|-----------------------------------|
| city                     | string | yes      | 조회 대상 도시명                   |
| nx                       | number | yes      | 기상청 격자 X 좌표                 |
| ny                       | number | yes      | 기상청 격자 Y 좌표                 |
| baseDate                 | string | yes      | 예보 발표 일자 (YYYYMMDD)          |
| baseTime                 | string | yes      | 예보 발표 시각 (HHmm)              |
| temperature              | number | yes      | 기온(TMP, °C)                      |
| sky                      | string | yes      | 하늘상태(SKY 코드 해석값)          |
| precipitationType        | string | yes      | 강수형태(PTY 코드 해석값)          |
| precipitationProbability | number | yes      | 강수확률(POP, %)                   |
| forecastTime             | string | yes      | 예보 대상 시각                     |

### DM-002: SummaryResult

| Field       | Type      | Required | Description                  |
|-------------|-----------|----------|------------------------------|
| city        | string    | yes      | 요약 대상 도시명              |
| summaryText | string    | yes      | Claude가 생성한 자연어 요약   |
| generatedAt | timestamp | yes      | 요약 생성 시각                |

## External Dependencies

| ID      | Service                                      | Purpose                          | Used by (CMP-ID) |
|---------|----------------------------------------------|----------------------------------|------------------|
| DEP-001 | 기상청 단기예보 API (VilageFcstInfoService_2.0) | 선택 도시 단기 날씨 데이터 조회   | CMP-002          |
| DEP-002 | Anthropic Claude API                          | 날씨 데이터 추론·자연어 요약 생성 | CMP-003          |

## Technology Stack

### Frontend
- 순수 HTML5 + CSS + Vanilla JavaScript (빌드 도구·프레임워크 없음)
- 단일 페이지: 도시 드롭다운, 조회 버튼, 요약 표시 영역

### Backend
- 언어/런타임: Node.js 20 LTS
- 프레임워크: Express (단일 서버, 정적 파일 서빙 겸용)
- Anthropic 공식 SDK(`@anthropic-ai/sdk`)로 Claude API 호출 (모델: claude-haiku-4-5)
- 환경변수 관리: dotenv (`.env`)

### Data
- 데이터베이스 없음 — 모든 날씨 조회는 매 요청 시 실시간 수행
- 도시→격자좌표(nx, ny) 매핑은 서버 코드 내 정적 상수(JSON 객체)로 관리

### Performance
- 외부 API 호출에 타임아웃을 적용하여 도시 선택~요약 출력 전체 응답을 95-percentile 10초 이내로 유지

## Constraints

- 회원가입·로그인 기능을 구현하지 않는다 — 인증/세션 컴포넌트 없음 (PRD Out of Scope 준수)
- 다국어 지원을 하지 않는다 — UI와 요약은 한국어만 제공 (PRD Out of Scope 준수)
- 중기예보·주간예보를 호출하지 않는다 — 단기예보(VilageFcstInfoService_2.0)만 사용 (PRD Out of Scope 준수, NFR-005)
- 날씨 데이터 DB 저장 및 이력 조회를 하지 않는다 — 데이터베이스 미사용, 실시간 조회만 (PRD Out of Scope 준수)
- 모든 API 키(공공데이터 인증키, Claude API 키)는 서버 환경변수로만 보관하며 클라이언트 번들에 포함하지 않는다 (NFR-003)
- 외부 의존성은 기상청 단기예보 API와 Anthropic Claude API로 제한한다 (NFR-002)
- 프론트엔드는 빌드 단계 없이 정적 파일로 제공한다 (NFR-001)
