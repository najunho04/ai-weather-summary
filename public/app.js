// CMP-001: WebUI — 도시 드롭다운, 조회 요청, 결과·로딩·오류 표시
const CITIES = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "제주"];

const citySelect = document.getElementById("city");
const goButton = document.getElementById("go");
const resultBox = document.getElementById("result");
const resultCity = document.getElementById("result-city");
const summaryEl = document.getElementById("summary");
const statusEl = document.getElementById("status");

for (const c of CITIES) {
  const opt = document.createElement("option");
  opt.value = c;
  opt.textContent = c;
  citySelect.appendChild(opt);
}

async function requestSummary() {
  const city = citySelect.value;
  goButton.disabled = true;
  statusEl.textContent = "";
  resultBox.hidden = true;
  statusEl.style.color = "#5b6478";
  statusEl.textContent = `${city} 날씨를 분석하고 있어요...`;

  try {
    const res = await fetch(
      `/api/weather-summary?city=${encodeURIComponent(city)}`
    );
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "요청에 실패했습니다.");
    }

    resultCity.textContent = `${data.city} 날씨 요약`;
    summaryEl.textContent = data.summary;
    resultBox.hidden = false;
    statusEl.textContent = "";
  } catch (err) {
    statusEl.style.color = "#c0392b";
    statusEl.textContent = `오류: ${err.message}`;
  } finally {
    goButton.disabled = false;
  }
}

goButton.addEventListener("click", requestSummary);
