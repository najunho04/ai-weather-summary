// CMP-004: ApiServer — 단일 엔드포인트에서 조회·요약 오케스트레이션 (FR-002/003/004)
// Vercel 서버리스 함수이자 로컬 Express 핸들러로 동일하게 동작한다.
import { CITY_GRID } from "../lib/cities.js";
import { fetchForecast } from "../lib/weather.js";
import { summarize } from "../lib/summary.js";

const requestLog = {};

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60000; // 1분
  const maxRequests = 3;

  if (!requestLog[ip]) requestLog[ip] = [];
  requestLog[ip] = requestLog[ip].filter(t => now - t < windowMs);

  if (requestLog[ip].length >= maxRequests) {
    return true;
  }
  requestLog[ip].push(now);
  return false;
}

export default async function handler(req, res) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "요청이 너무 많습니다. 1분 후 다시 시도하세요." });
    return;
  }

  const city = (req.query?.city || "").trim();

  if (!city) {
    res.status(400).json({ error: "도시를 선택해 주세요." });
    return;
  }

  const grid = CITY_GRID[city];
  if (!grid) {
    res.status(400).json({ error: `지원하지 않는 도시입니다: ${city}` });
    return;
  }

  try {
    const { forecasts } = await fetchForecast(grid.nx, grid.ny);
    if (forecasts.length === 0) {
      res.status(502).json({ error: "날씨 데이터를 가져오지 못했습니다." });
      return;
    }

    const summary = await summarize(city, forecasts);
    res.status(200).json({
      city,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("weather-summary error:", err);
    res.status(500).json({
      error: err.message || "요약 생성 중 오류가 발생했습니다.",
    });
  }
}
