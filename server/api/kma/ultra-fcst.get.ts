import { fetchUltraFcst } from "../../utils/kma";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const q = getQuery(event);

  const lat = q.lat ? Number(q.lat) : 37.5665;
  const lon = q.lon ? Number(q.lon) : 126.978;

  const serviceKey = String(config.kmaServiceKey ?? "");
  if (!serviceKey) {
    throw createError({ statusCode: 500, statusMessage: "KMA_SERVICE_KEY missing" });
  }

  return await fetchUltraFcst({ serviceKey, lat, lon });
});
