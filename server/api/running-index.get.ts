// server/api/running-index.get.ts
import { computeRunningIndex } from "../../utils/scoring";

export default defineEventHandler((event) => {
  // MVP: 일단 쿼리는 받아두되, 샘플 데이터로 점수 계산
  const query = getQuery(event);

  // 나중에 실제 날씨 API 붙일 때 쓰려고 그대로 받습니다.
  const lat = query.lat ? Number(query.lat) : null;
  const lon = query.lon ? Number(query.lon) : null;
  const at = query.at ? String(query.at) : null;

  // 샘플(서울 겨울 저녁 느낌)
  const sample = {
    tempC: 6.5,
    humidityPct: 52,
    windMs: 2.8,
    precipMm: 0,
    pm25: 18,
  };

  const result = computeRunningIndex(sample);

  return {
    location: "서울(샘플)",
    at: at ?? new Date().toISOString(),
    request: { lat, lon },
    ...result,
    raw: {
      provider: "SAMPLE",
      updatedAt: new Date().toISOString(),
    },
  };
});
