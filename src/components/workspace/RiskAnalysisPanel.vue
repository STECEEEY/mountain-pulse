<template>
  <div class="risk-analysis">
    <div class="section-title">风险统计概览</div>

    <div v-if="stats" class="global-summary">
      <span>评估总面积 {{ stats.total_area_km2.toFixed(2) }} km²</span>
      <span>最高风险指数 {{ stats.max_risk.toFixed(4) }}</span>
      <span>平均风险 {{ stats.mean_risk.toFixed(4) }}</span>
    </div>

    <div v-if="stats" class="metric-grid">
      <div class="metric-card high">
        <div class="metric-label">高风险占比</div>
        <div class="metric-value">{{ stats.high_risk.percentage.toFixed(2) }}%</div>
      </div>
      <div class="metric-card medium">
        <div class="metric-label">中风险占比</div>
        <div class="metric-value">{{ stats.medium_risk.percentage.toFixed(2) }}%</div>
      </div>
      <div class="metric-card low">
        <div class="metric-label">低风险占比</div>
        <div class="metric-value">{{ stats.low_risk.percentage.toFixed(2) }}%</div>
      </div>
      <div class="metric-card neutral">
        <div class="metric-label">平均风险指数</div>
        <div class="metric-value">{{ stats.mean_risk.toFixed(4) }}</div>
      </div>
    </div>
    <div v-else class="empty-state">风险统计数据加载中...</div>

    <div class="section-title">风险因子解释</div>
    <div class="explain-tip">形变速率是主要风险驱动因子</div>

    <div class="chart-wrap">
      <div ref="chartRef" class="chart"></div>
    </div>

    <div v-if="topFeatureDesc" class="top-feature">
      关键因子说明：{{ topFeatureDesc }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import * as echarts from 'echarts'
import { riskService } from '@/services/riskService'
import type { FeatureImportance, RiskStatistics } from '@/types/risk'

const stats = ref<RiskStatistics | null>(null)
const importance = ref<FeatureImportance | null>(null)
const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null

const orderedFeatures = computed(() => {
  if (!importance.value) return []
  return Object.entries(importance.value.features)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => ({
      key,
      value,
      label: importance.value?.description[key] || key,
    }))
})

const topFeatureDesc = computed(() => {
  if (!importance.value) return ''
  return importance.value.description[importance.value.top_feature] || ''
})

const initChart = () => {
  if (!chartRef.value) return
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }

  const labels = orderedFeatures.value.map((item) => item.label)
  const values = orderedFeatures.value.map((item) => item.value)

  chart.setOption({
    grid: {
      left: 140,
      right: 20,
      top: 10,
      bottom: 10,
      containLabel: false,
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 0.35,
      axisLine: { lineStyle: { color: '#2b4a6a' } },
      axisLabel: { color: '#88a0b0' },
      splitLine: { lineStyle: { color: 'rgba(0, 120, 180, 0.18)' } },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#d2ebff', fontSize: 12, width: 120, overflow: 'truncate' },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : [params]
        const item = (list[0] || {}) as { dataIndex?: number; value?: number }
        const idx = typeof item.dataIndex === 'number' ? item.dataIndex : 0
        const value = typeof item.value === 'number' ? item.value : Number(item.value || 0)
        const raw = orderedFeatures.value[idx]
        return `${raw?.key || ''}<br/>重要性：${value.toFixed(2)}`
      },
    },
    series: [
      {
        type: 'bar',
        data: values,
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: '#00f0ff' },
            { offset: 1, color: '#0066ff' },
          ]),
        },
      },
    ],
    backgroundColor: 'transparent',
  })
}

const loadData = async () => {
  try {
    const [statsRes, importanceRes] = await Promise.all([
      riskService.loadRiskStatistics(),
      riskService.loadFeatureImportance(),
    ])
    stats.value = statsRes
    importance.value = importanceRes
    initChart()
  } catch (error) {
    console.error('Risk analysis panel load failed:', error)
  }
}

const handleResize = () => chart?.resize()

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.risk-analysis {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
}

.global-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 12px;
  color: #9ec0d8;
  background: rgba(8, 23, 37, 0.64);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
}

.metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.metric-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 200, 255, 0.2);
  background: rgba(8, 27, 44, 0.75);
}

.metric-card.high {
  border-color: rgba(255, 68, 68, 0.6);
}

.metric-card.medium {
  border-color: rgba(255, 160, 68, 0.6);
}

.metric-card.low {
  border-color: rgba(68, 176, 255, 0.6);
}

.metric-card.neutral {
  border-color: rgba(0, 200, 255, 0.45);
}

.metric-label {
  color: #9ec0d8;
  font-size: 12px;
  margin-bottom: 6px;
}

.metric-value {
  color: #e8f5ff;
  font-size: 20px;
  font-weight: 700;
}

.explain-tip {
  border-left: 3px solid #ff7b2f;
  background: rgba(255, 123, 47, 0.1);
  color: #ffd7bd;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 13px;
}

.chart-wrap {
  height: 260px;
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 10px;
  background: rgba(8, 23, 37, 0.7);
  padding: 8px;
}

.chart {
  width: 100%;
  height: 100%;
}

.top-feature {
  color: #9ec0d8;
  font-size: 12px;
  line-height: 1.5;
}

.empty-state {
  color: #88a0b0;
  font-size: 12px;
}
</style>
