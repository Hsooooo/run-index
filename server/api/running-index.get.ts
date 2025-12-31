// server/api/running-index.get.ts
import { computeRunningIndex } from "../../utils/scoring";
import { fetchUltraNcst } from "../utils/kma"; 

/**
 * 러닝 지수 계산 API
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const q = getQuery(event);

  const lat = q.lat ? Number(q.lat) : 37.5665;
  const lon = q.lon ? Number(q.lon) : 126.978;

  const serviceKey = String(config.kmaServiceKey ?? "");
  if (!serviceKey) {
    throw createError({ statusCode: 500, statusMessage: "KMA_SERVICE_KEY missing" });
  }

  // 1) 현재(실황)
  const now = await fetchUltraNcst({ serviceKey, lat, lon });

  const nowIndex = computeRunningIndex({
    tempC: now.parsed.tempC ?? 10,
    humidityPct: now.parsed.humidityPct ?? 50,
    windMs: now.parsed.windMs ?? 2,
    precipMm: now.parsed.precipMm ?? 0,
    pm25: null,
  });

  // 2) 초단기예보(시간별)
  const fcst = await fetchUltraFcst({ serviceKey, lat, lon });

  const hourly = fcst.hourly.slice(0, 12).map((h) => {
    const idx = computeRunningIndex({
      tempC: h.tempC ?? (now.parsed.tempC ?? 10),
      humidityPct: h.humidityPct ?? (now.parsed.humidityPct ?? 50),
      windMs: h.windMs ?? (now.parsed.windMs ?? 2),
      precipMm: h.precipMm ?? 0,
      pm25: null,
    });

    return {
      at: h.at,
      fcstDate: h.fcstDate,
      fcstTime: h.fcstTime,
      weather: {
        tempC: h.tempC,
        humidityPct: h.humidityPct,
        windMs: h.windMs,
        popPct: h.popPct,
        precipMm: h.precipMm,
      },
      runningIndex: idx,
    };
  });

  return {
    location: "KMA",
    request: { lat, lon, nx: now.nx, ny: now.ny },
    now: {
      base: { base_date: now.base_date, base_time: now.base_time },
      weather: now.parsed,
      runningIndex: nowIndex,
    },
    forecast: {
      base: { base_date: fcst.base_date, base_time: fcst.base_time },
      hourly,
    },
  };
});
