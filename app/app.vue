<template>
  <div style="max-width: 720px; margin: 40px auto; padding: 0 16px;">
    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">
      달리기 지수 (MVP)
    </h1>

    <button @click="load" style="padding: 10px 12px; border: 1px solid #ddd; border-radius: 10px;">
      새로고침
    </button>

    <div v-if="pending" style="margin-top: 16px;">불러오는 중...</div>
    <div v-else-if="error" style="margin-top: 16px; color: #c00;">
      오류: {{ error.message }}
    </div>

    <div v-else-if="data" style="margin-top: 16px; border: 1px solid #eee; border-radius: 16px; padding: 16px;">
      <div style="display:flex; align-items: baseline; gap: 12px;">
        <div style="font-size: 48px; font-weight: 800;">
          {{ data.now.runningIndex.score }}
        </div>
        <div style="font-size: 18px; font-weight: 700;">
          {{ data.now.runningIndex.grade }}
        </div>
      </div>

      <div style="margin-top: 8px; font-size: 16px;">
        {{ data.now.runningIndex.summary }}
      </div>

      <div v-if="data.now.runningIndex.advice?.length" style="margin-top: 10px; display:flex; gap: 8px; flex-wrap: wrap;">
        <span v-for="(a, i) in data.now.runningIndex.advice" :key="i"
              style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 999px; font-size: 12px;">
          {{ a }}
        </span>
      </div>

      <hr style="margin: 16px 0; border: none; border-top: 1px solid #eee;" />

      <h2 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">요소별</h2>
      <div v-for="(v, k) in data.now.runningIndex.factors" :key="k" style="display:flex; justify-content: space-between; padding: 6px 0;">
        <div>{{ k }}</div>
        <div>{{ v.value }} ({{ v.score }}점)</div>
      </div>

      <div style="margin-top: 12px; font-size: 12px; color: #666;">
        데이터: {{ data.now.runningIndex.raw?.provider }} · 갱신: {{ data.now.runningIndex.raw?.updatedAt }}
      </div>
    </div>
  </div>
  <div v-if="data?.forecast?.hourly?.length" style="margin-top: 16px;">
  <h2 style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">앞으로</h2>

  <div style="display:flex; gap: 8px; overflow:auto; padding-bottom: 8px;">
    <div v-for="h in data.forecast.hourly" :key="h.at"
         style="min-width: 140px; border: 1px solid #eee; border-radius: 12px; padding: 10px;">
      <div style="font-size: 12px; color:#666;">
        {{ new Date(h.at).toLocaleString('ko-KR', { hour:'2-digit', minute:'2-digit' }) }}
      </div>
      <div style="font-size: 22px; font-weight: 800;">
        {{ h.runningIndex.score }}
      </div>
      <div style="font-size: 12px;">
        {{ h.weather.tempC ?? '-' }}°C · 바람 {{ h.weather.windMs ?? '-' }}m/s
      </div>
    </div>
  </div>
</div>

</template>

<script setup lang="ts">
const { data, pending, error, refresh } = await useFetch("/api/running-index");

function load() {
  refresh();
}
</script>
