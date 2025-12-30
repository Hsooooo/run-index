// utils/scoring.ts

export type RunningIndexInput = {
    tempC: number;        // 기온
    humidityPct: number;  // 습도
    windMs: number;       // 풍속
    precipMm: number;     // 강수량(또는 강수 강도)
    pm25: number | null;  // 초미세먼지(없으면 null)
  };
  
  export type RunningIndexResult = {
    score: number; // 0-100
    grade: "GREAT" | "GOOD" | "OK" | "BAD" | "AWFUL";
    summary: string;
    advice: string[];
    factors: Record<string, { value: number | null; score: number }>;
  };
  
  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }
  
  function scoreTemp(tempC: number): number {
    // 간단 구간점수 (40점 만점)
    // 최적: 10-15℃
    if (tempC >= 10 && tempC <= 15) return 40;
    if ((tempC >= 5 && tempC < 10) || (tempC > 15 && tempC <= 20)) return 32;
    if ((tempC >= 0 && tempC < 5) || (tempC > 20 && tempC <= 25)) return 24;
    if ((tempC >= -5 && tempC < 0) || (tempC > 25 && tempC <= 28)) return 14;
    if ((tempC >= -10 && tempC < -5) || (tempC > 28 && tempC <= 30)) return 6;
    return 0;
  }
  
  function scoreHumidity(h: number): number {
    // 20점 만점
    if (h >= 40 && h <= 60) return 20;
    if ((h >= 30 && h < 40) || (h > 60 && h <= 70)) return 15;
    if ((h >= 20 && h < 30) || (h > 70 && h <= 80)) return 10;
    return 5;
  }
  
  function scoreWind(w: number): number {
    // 15점 만점
    if (w >= 2 && w <= 4) return 15;
    if (w >= 0 && w < 2) return 10;
    if (w > 4 && w <= 6) return 8;
    if (w > 6 && w <= 8) return 5;
    return 0;
  }
  
  function scorePrecip(p: number): number {
    // 15점 만점
    if (p <= 0) return 15;
    if (p > 0 && p <= 1) return 8;
    return 0;
  }
  
  function scorePm25(pm25: number | null): number {
    // 10점 만점 (대충)
    if (pm25 === null) return 8; // 데이터 없으면 중립
    if (pm25 <= 15) return 10;
    if (pm25 <= 35) return 8;
    if (pm25 <= 75) return 4;
    return 0;
  }
  
  function gradeByScore(score: number): RunningIndexResult["grade"] {
    if (score >= 85) return "GREAT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "OK";
    if (score >= 30) return "BAD";
    return "AWFUL";
  }
  
  function summaryByGrade(g: RunningIndexResult["grade"]): string {
    switch (g) {
      case "GREAT": return "러닝 최적 조건입니다. 템포/인터벌도 무난합니다.";
      case "GOOD": return "데일리 조깅/LSD에 좋습니다.";
      case "OK": return "가볍게 뛰기엔 무난하지만 강훈련은 비추입니다.";
      case "BAD": return "야외 러닝은 부담될 수 있습니다. 강도 낮추거나 실내 권장입니다.";
      case "AWFUL": return "야외 러닝 비권장입니다. 컨디션/체온/호흡기 리스크가 큽니다.";
    }
  }
  
  export function computeRunningIndex(input: RunningIndexInput): RunningIndexResult {
    const t = scoreTemp(input.tempC);
    const h = scoreHumidity(input.humidityPct);
    const w = scoreWind(input.windMs);
    const p = scorePrecip(input.precipMm);
    const a = scorePm25(input.pm25);
  
    const total = clamp(t + h + w + p + a, 0, 100);
    const grade = gradeByScore(total);
  
    const advice: string[] = [];
    if (input.precipMm > 0) advice.push("강수 주의");
    if (input.windMs >= 6) advice.push("바람 강함");
    if (input.tempC <= 0) advice.push("노면 결빙/보온 주의");
    if (input.tempC >= 25) advice.push("열 스트레스 주의");
    if (input.pm25 !== null && input.pm25 >= 36) advice.push("공기질 나쁨(실내 고려)");
  
    return {
      score: total,
      grade,
      summary: summaryByGrade(grade),
      advice,
      factors: {
        tempC: { value: input.tempC, score: t },
        humidityPct: { value: input.humidityPct, score: h },
        windMs: { value: input.windMs, score: w },
        precipMm: { value: input.precipMm, score: p },
        pm25: { value: input.pm25, score: a },
      },
    };
  }
  