// 도시 → 기상청 단기예보 격자좌표(nx, ny) 정적 매핑 (TechSpec DM-003: CityGrid)
// 데이터베이스 없이 코드 내 상수로 관리한다.
export const CITY_GRID = {
  서울: { nx: 60, ny: 127 },
  부산: { nx: 98, ny: 76 },
  대구: { nx: 89, ny: 90 },
  인천: { nx: 55, ny: 124 },
  광주: { nx: 58, ny: 74 },
  대전: { nx: 67, ny: 100 },
  울산: { nx: 102, ny: 84 },
  제주: { nx: 52, ny: 38 },
};

export const CITY_NAMES = Object.keys(CITY_GRID);
