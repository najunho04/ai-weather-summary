// CMP-002: WeatherClient — 기상청 단기예보 API(VilageFcstInfoService_2.0) 호출 및 파싱
const ENDPOINT =
  "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

const pad = (n) => String(n).padStart(2, "0");

// 단기예보 발표 시각(02,05,08,11,14,17,20,23시). 발표 후 약 10분 뒤 제공.
// 현재(KST) 기준 가장 최근에 이용 가능한 base_date / base_time을 계산한다.
export function getBaseDateTime(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000); // UTC → KST
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth();
  const d = kst.getUTCDate();
  const hour = kst.getUTCHours();
  const min = kst.getUTCMinutes();

  const baseTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  const available = baseTimes.filter((t) => hour > t || (hour === t && min >= 10));

  let baseHour;
  let dateMs = Date.UTC(y, m, d);
  if (available.length === 0) {
    // 02:10 이전 → 전날 23시 발표 사용
    baseHour = 23;
    dateMs -= 24 * 3600 * 1000;
  } else {
    baseHour = available[available.length - 1];
  }

  const date = new Date(dateMs);
  const base_date = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate()
  )}`;
  const base_time = `${pad(baseHour)}00`;
  return { base_date, base_time };
}

const SKY_TEXT = { 1: "맑음", 3: "구름많음", 4: "흐림" };
const PTY_TEXT = {
  0: "없음",
  1: "비",
  2: "비/눈",
  3: "눈",
  4: "소나기",
  5: "빗방울",
  6: "빗방울눈날림",
  7: "눈날림",
};

// 선택 도시의 격자좌표로 단기예보를 조회하고 시간대별 핵심 항목을 추출한다.
// 반환: { baseDate, baseTime, forecasts: [{ date, time, temperature, sky, precipitationType, precipitationProbability }] }
export async function fetchForecast(nx, ny) {
  const serviceKey = process.env.WEATHER_API_KEY;
  if (!serviceKey) {
    throw new Error("WEATHER_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const { base_date, base_time } = getBaseDateTime();
  const url = new URL(ENDPOINT);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", base_date);
  url.searchParams.set("base_time", base_time);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`기상청 API 응답 오류 (HTTP ${res.status})`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    // 인증키 오류 등으로 XML 에러가 내려오는 경우
    throw new Error("기상청 API 응답을 해석할 수 없습니다. 인증키를 확인하세요.");
  }

  const header = data?.response?.header;
  if (!header || header.resultCode !== "00") {
    throw new Error(
      `기상청 API 오류: ${header?.resultMsg || "알 수 없는 오류"}`
    );
  }

  const items = data?.response?.body?.items?.item;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("기상청 API가 빈 데이터를 반환했습니다.");
  }

  // (fcstDate, fcstTime) 슬롯별로 핵심 카테고리 누적
  const slots = new Map();
  for (const it of items) {
    const key = `${it.fcstDate}${it.fcstTime}`;
    if (!slots.has(key)) {
      slots.set(key, { date: it.fcstDate, time: it.fcstTime });
    }
    const slot = slots.get(key);
    switch (it.category) {
      case "TMP":
        slot.temperature = Number(it.fcstValue);
        break;
      case "SKY":
        slot.sky = SKY_TEXT[it.fcstValue] || "알수없음";
        break;
      case "PTY":
        slot.precipitationType = PTY_TEXT[it.fcstValue] || "알수없음";
        break;
      case "POP":
        slot.precipitationProbability = Number(it.fcstValue);
        break;
    }
  }

  const forecasts = [...slots.values()]
    .filter((s) => s.temperature !== undefined) // TMP가 있는 정시 슬롯만
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 16); // 향후 약 16시간

  return { baseDate: base_date, baseTime: base_time, forecasts };
}
