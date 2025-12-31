// server/utils/kma.ts
import { latLonToGrid } from "../../utils/kmaGrid";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * KST 일시 변환
 * @param d 
 * @returns 
 */
function toKstDateTime(d = new Date()) {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = pad2(kst.getUTCMonth() + 1);
  const dd = pad2(kst.getUTCDate());
  const hh = pad2(kst.getUTCHours());
  return { yyyy, mm, dd, hh };
}

/**
 * KMA API용 기준 일시 선택
 * @param d 
 * @returns 
 */
function pickBase(d = new Date()) {
  const { yyyy, mm, dd, hh } = toKstDateTime(d);
  return { base_date: `${yyyy}${mm}${dd}`, base_time: `${hh}00` };
}

/**
 * KMA 초단기예보용 기준 일시 선택
 * @param d 
 * @returns 
 */
function pickUltraFcstBase(d = new Date()) {
  const { yyyy, mm, dd, hh } = toKstDateTime(d);
  // 기본은 HH30. (현실적으로 가장 덜 실패)
  return { base_date: `${yyyy}${mm}${dd}`, base_time: `${hh}30` };
}


/**
 * 초단기실황 파싱 결과 타입
 */
export type UltraNcstParsed = {
  tempC: number | null;
  humidityPct: number | null;
  windMs: number | null;
  precipMm: number;
};

/**
 * 초단기예보(시간) 파싱 결과 타입
 */
export type UltraFcstHourly = {
  at: string;           // ISO(KST) 또는 "YYYYMMDDHHmm"
  fcstDate: string;     // YYYYMMDD
  fcstTime: string;     // HHmm
  tempC: number | null; // TMP
  humidityPct: number | null; // REH
  windMs: number | null; // WSD
  popPct: number | null; // POP (강수확률)
  precipMm: number | null; // PCP (강수량; "강수없음" 같은 문자열이 올 수 있음)
};

/**
 * 초단기실황 조회
 * @param params
 * @returns 
 */
export async function fetchUltraNcst(params: {
  serviceKey: string;
  lat: number;
  lon: number;
}): Promise<{
  nx: number;
  ny: number;
  base_date: string;
  base_time: string;
  parsed: UltraNcstParsed;
}> {
  const { serviceKey, lat, lon } = params;
  const { nx, ny } = latLonToGrid(lat, lon);
  const { base_date, base_time } = pickBase(new Date());

  const url = new URL(
    "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtNcst"
  );
  url.searchParams.set("authKey", serviceKey);
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("dataType", "JSON");
  url.searchParams.set("base_date", base_date);
  url.searchParams.set("base_time", base_time);
  url.searchParams.set("nx", String(nx));
  url.searchParams.set("ny", String(ny));

  const res: any = await $fetch(url.toString(), {
    // 타임아웃 걸어서 “쌓이는 요청” 방지
    timeout: 8000,
  });

  const items = res?.response?.body?.items?.item ?? [];

  // 필요한 카테고리만 집계 (전체 raw 반환 금지)
  let T1H: number | null = null;
  let REH: number | null = null;
  let WSD: number | null = null;
  let RN1: number = 0;

  for (const it of items) {
    const v = it?.obsrValue;
    switch (it?.category) {
      case "T1H":
        T1H = v != null ? Number(v) : null;
        break;
      case "REH":
        REH = v != null ? Number(v) : null;
        break;
      case "WSD":
        WSD = v != null ? Number(v) : null;
        break;
      case "RN1":
        RN1 = v != null ? Number(v) : 0;
        break;
    }
  }

  return {
    nx,
    ny,
    base_date,
    base_time,
    parsed: {
      tempC: T1H,
      humidityPct: REH,
      windMs: WSD,
      precipMm: RN1,
    },
  };
}

/**
 * 강수량 파싱
 * @param v 
 * @returns 
 */
function parsePrecip(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.includes("강수없음")) return 0;
  // "1mm 미만" 같은 케이스 대응
  if (s.includes("미만")) return 0;
  const n = Number(s.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * KST ISO 일시 변환
 * @param fcstDate 
 * @param fcstTime 
 * @returns 
 */
function toIsoKst(fcstDate: string, fcstTime: string) {
  // fcstDate: YYYYMMDD, fcstTime: HHmm
  const y = Number(fcstDate.slice(0, 4));
  const m = Number(fcstDate.slice(4, 6));
  const d = Number(fcstDate.slice(6, 8));
  const hh = Number(fcstTime.slice(0, 2));
  const mm = Number(fcstTime.slice(2, 4));
  // KST ISO 문자열 만들기
  const dt = new Date(Date.UTC(y, m - 1, d, hh - 9, mm, 0)); // KST -> UTC로 역보정
  return dt.toISOString();
}

/**
 * 초단기예보 조회
 * @param params 
 * @returns 
 */
export async function fetchUltraFcst(params: {
  serviceKey: string;
  lat: number;
  lon: number;
}): Promise<{
  nx: number;
  ny: number;
  base_date: string;
  base_time: string;
  hourly: UltraFcstHourly[];
}> {
  const { serviceKey, lat, lon } = params;
  const { nx, ny } = latLonToGrid(lat, lon);

  async function call(base_date: string, base_time: string) {
    const url = new URL(
      "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getUltraSrtFcst"
    );
    url.searchParams.set("authKey", serviceKey);
    url.searchParams.set("pageNo", "1");
    url.searchParams.set("numOfRows", "1000");
    url.searchParams.set("dataType", "JSON");
    url.searchParams.set("base_date", base_date);
    url.searchParams.set("base_time", base_time);
    url.searchParams.set("nx", String(nx));
    url.searchParams.set("ny", String(ny));

    console.log(`KMA UltraFcst API Call: base_date=${base_date}, base_time=${base_time}, nx=${nx}, ny=${ny}`);
    console.log(url.toString());
    const res: any = await $fetch(url.toString(), { timeout: 8000 });
    return res?.response?.body?.items?.item ?? [];
  }

  // 1차: 현재시각 HH30
  let { base_date, base_time } = pickUltraFcstBase(new Date());
  let items = await call(base_date, base_time);

  // 실패하면 1시간 전 HH30으로 한 번 더
  if (!items || items.length === 0) {
    const now = new Date();
    const prev = new Date(now.getTime() - 60 * 60 * 1000);
    const base2 = pickUltraFcstBase(prev);
    base_date = base2.base_date;
    base_time = base2.base_time;
    items = await call(base_date, base_time);
  }

  // 시간대별 집계: fcstDate+fcstTime -> {TMP, REH, WSD, POP, PCP}
  const map: Record<string, Partial<UltraFcstHourly>> = {};

  for (const it of items) {
    const fcstDate = String(it.fcstDate ?? "");
    const fcstTime = String(it.fcstTime ?? "");
    const key = `${fcstDate}${fcstTime}`;
    if (!map[key]) {
      map[key] = {
        fcstDate,
        fcstTime,
        at: toIsoKst(fcstDate, fcstTime),
      };
    }

    const cat = it.category;
    const v = it.fcstValue;

    switch (cat) {
      case "TMP":
        map[key].tempC = v != null ? Number(v) : null;
        break;
      case "REH":
        map[key].humidityPct = v != null ? Number(v) : null;
        break;
      case "WSD":
        map[key].windMs = v != null ? Number(v) : null;
        break;
      case "POP":
        map[key].popPct = v != null ? Number(v) : null;
        break;
      case "PCP":
        map[key].precipMm = parsePrecip(v);
        break;
    }
  }

  const hourly = Object.values(map)
    .filter((x) => x.fcstDate && x.fcstTime)
    .sort((a, b) => String(a.fcstDate + a.fcstTime).localeCompare(String(b.fcstDate + b.fcstTime)))
    .map((x) => ({
      at: x.at!,
      fcstDate: x.fcstDate!,
      fcstTime: x.fcstTime!,
      tempC: x.tempC ?? null,
      humidityPct: x.humidityPct ?? null,
      windMs: x.windMs ?? null,
      popPct: x.popPct ?? null,
      precipMm: x.precipMm ?? null,
    }));

  return { nx, ny, base_date, base_time, hourly };
}