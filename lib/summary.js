// CMP-003: SummaryService — Anthropic Claude API로 날씨 데이터를 자연어로 요약
import Anthropic from "@anthropic-ai/sdk";

function formatForecastLines(forecasts) {
  return forecasts
    .map((f) => {
      const t = `${f.time.slice(0, 2)}시`;
      const date = `${f.date.slice(4, 6)}/${f.date.slice(6, 8)}`;
      return `- ${date} ${t}: 기온 ${f.temperature}℃, 하늘 ${
        f.sky ?? "정보없음"
      }, 강수 ${f.precipitationType ?? "정보없음"}, 강수확률 ${
        f.precipitationProbability ?? "?"
      }%`;
    })
    .join("\n");
}

// 파싱된 단기예보를 프롬프트로 구성해 Claude로 자연어 요약을 생성한다.
export async function summarize(city, forecasts) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const client = new Anthropic({ apiKey });
  const forecastText = formatForecastLines(forecasts);

  const prompt = `다음은 기상청 단기예보로 받은 ${city}의 시간대별 날씨 데이터입니다.

${forecastText}

이 데이터를 바탕으로, 일반 사용자가 한눈에 이해할 수 있는 한국어 날씨 요약을 작성하세요.
- 2~3문장으로 간결하게.
- 기온 추이(예: 낮 최고, 밤 최저)와 비/눈 여부를 포함.
- 우산, 겉옷 등 구체적인 행동 권고를 한 가지 이상 포함.
- 숫자 코드나 표는 쓰지 말고 자연스러운 문장으로만.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const summaryText = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!summaryText) {
    throw new Error("요약 생성에 실패했습니다.");
  }
  return summaryText;
}
