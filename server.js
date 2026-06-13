// 로컬 개발 서버: 정적 프론트(public/) 서빙 + /api/weather-summary 를
// Vercel 서버리스 핸들러와 동일한 파일로 라우팅한다. (배포는 Vercel이 /api 를 자동 처리)
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import handler from "./api/weather-summary.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(join(__dirname, "public")));
app.all("/api/weather-summary", (req, res) => handler(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`로컬 서버 실행 중: http://localhost:${PORT}`);
});
