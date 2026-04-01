<template>
  <div class="chart-card">
    <div class="card-header">
      <h3 class="card-title">👥 人口暴露度</h3>
      <span class="card-badge">威胁人口统计</span>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <span>加载数据中...</span>
    </div>
    <template v-else>
      <div class="chart-container" ref="chartRef"></div>
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">威胁总人口</span>
          <span class="stat-value">
            <AnimatedNumber :value="exposureStats.total / 10000" :decimals="1" />
            <small>万</small>
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">极高风险区</span>
          <span class="stat-value up">
            <AnimatedNumber :value="exposureStats.byLevel['极高风险'] / 10000" :decimals="1" />
            <small>万</small>
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">风险点总数</span>
          <span class="stat-value">
            <AnimatedNumber :value="totalPoints" :decimals="0" />
            <small>个</small>
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { ECBasicOption } from 'echarts/types/dist/shared'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import { normalizeRiskLevel } from '@/utils/riskLevel'

// 类型定义
interface RiskPoint {
  name: string
  type: string
  level: string
  risk_probability: number
  velocity: number
  threat: string
  longitude: number
  latitude: number
  elevation: number
  slope: number
  projection_x: number
  projection_y: number
}

interface ExposureStats {
  total: number
  byLevel: {
    '极高风险': number
    '高风险': number
    '中风险': number
    '低风险': number
  }
  pointCount: {
    '极高风险': number
    '高风险': number
    '中风险': number
    '低风险': number
  }
}

const chartRef = ref<HTMLElement>()
let chart: echarts.ECharts | null = null
const loading = ref(true)
const riskPoints = ref<RiskPoint[]>([])

// 风险等级顺序
const levelOrder = ['极高风险', '高风险', '中风险', '低风险']
const normalizedLevelMap: Record<'极高' | '高' | '中' | '低', keyof ExposureStats['byLevel']> = {
  极高: '极高风险',
  高: '高风险',
  中: '中风险',
  低: '低风险',
}
// 颜色配置
const levelColors: Record<string, string> = {
  '极高风险': '#F44336',
  '高风险': '#FF9800',
  '中风险': '#FFEE58',
  '低风险': '#81C784',
}

// 加载 JSON 数据
const loadRiskData = async () => {
  try {
    const response = await fetch('/data/risk_points.json')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const data = await response.json()
    
    const points = data.points || data
    riskPoints.value = points
    
  } catch (error) {
    console.error('加载风险点数据失败:', error)
    riskPoints.value = []
  } finally {
    loading.value = false
  }
}

// 风险点总数
const totalPoints = computed(() => riskPoints.value.length)

// 聚合威胁人口数据
const exposureStats = computed<ExposureStats>(() => {
  const stats: ExposureStats = {
    total: 0,
    byLevel: {
      '极高风险': 0,
      '高风险': 0,
      '中风险': 0,
      '低风险': 0
    },
    pointCount: {
      '极高风险': 0,
      '高风险': 0,
      '中风险': 0,
      '低风险': 0
    }
  }
  
  riskPoints.value.forEach((point: RiskPoint) => {
    let pop = 0
    if (point.threat) {
      if (typeof point.threat === 'string') {
        const match = point.threat.match(/\d+/)
        if (match) pop = parseInt(match[0])
      } else if (typeof point.threat === 'number') {
        pop = point.threat
      }
    }
    
    const normalized = normalizeRiskLevel(point.level)
    if (normalized !== '未知') {
      const mappedLevel = normalizedLevelMap[normalized]
      stats.byLevel[mappedLevel] += pop
      stats.pointCount[mappedLevel] += 1
    }
    stats.total += pop
  })
  
  return stats
})

// 图表数据
const chartData = computed(() => {
  return {
    levels: levelOrder,
    populations: levelOrder.map(level => exposureStats.value.byLevel[level as keyof typeof exposureStats.value.byLevel]),
    colors: levelOrder.map(level => levelColors[level])
  }
})

const initChart = () => {
  if (!chartRef.value || loading.value) return
  
  if (chart) {
    chart.dispose()
  }
  
  chart = echarts.init(chartRef.value)

  const option: ECBasicOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0]
        const level = data.name
        const pop = data.value
        const pointCount = exposureStats.value.pointCount[level as keyof typeof exposureStats.value.pointCount]
        return `
          <div style="font-weight:600;margin-bottom:4px">${level}</div>
          <div>威胁人口: ${pop.toLocaleString()} 人</div>
          <div>风险点数量: ${pointCount} 个</div>
          <div>平均威胁: ${pointCount > 0 ? Math.round(pop / pointCount) : 0} 人/点</div>
        `
      },
      backgroundColor: 'rgba(10, 20, 30, 0.95)',
      borderColor: '#FF9800',
      borderWidth: 1,
      textStyle: { color: '#e0f0ff', fontSize: 11 }
    },
    grid: {
      left: '10%',
      right: '5%',
      top: '20%',
      bottom: '8%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: chartData.value.levels,
      axisLine: { lineStyle: { color: '#2b4a6a' } },
      axisLabel: {
        color: '#88a0b0',
        fontSize: 10,
        rotate: 0,
        interval: 0
      },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: '威胁人口 (人)',
      nameTextStyle: { color: '#88a0b0', fontSize: 10 },
      axisLine: { show: false },
      axisLabel: {
        color: '#88a0b0',
        fontSize: 9,
        formatter: (value: number) => {
          if (value >= 10000) return (value / 10000).toFixed(0) + '万'
          return value.toLocaleString()
        }
      },
      splitLine: { lineStyle: { color: '#1a3a5a', type: 'dashed' } }
    },
    series: [
      {
        type: 'bar',
        data: chartData.value.populations,
        barWidth: '55%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any) => {
            return chartData.value.colors[params.dataIndex]
          },
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowBlur: 6
        },
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => {
            const val = params.value
            if (val >= 10000) return (val / 10000).toFixed(1) + '万'
            return val.toLocaleString()
          },
          color: '#00f0ff',
          fontSize: 9,
          fontWeight: 'bold'
        }
      }
    ],
    backgroundColor: 'transparent',
    animation: true,
    animationDuration: 800,
    animationEasing: 'cubicOut'
  }

  chart.setOption(option)
}

const handleResize = () => chart?.resize()

watch([exposureStats, loading], () => {
  if (!loading.value && chart) {
    chart.setOption({
      xAxis: { data: chartData.value.levels },
      series: [{ data: chartData.value.populations }]
    })
  } else if (!loading.value && chartRef.value) {
    initChart()
  }
}, { deep: true })

onMounted(async () => {
  await loadRiskData()
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<style scoped>
.chart-card {
  background: rgba(10, 20, 30, 0.75);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  min-height: 260px;
}

.chart-card:hover {
  transform: translateY(-3px);
  border-color: rgba(0, 240, 255, 0.45);
  box-shadow: 0 6px 20px rgba(0, 200, 255, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #88c0ff;
  letter-spacing: 0.5px;
}

.card-badge {
  font-size: 9px;
  padding: 2px 8px;
  background: rgba(0, 200, 255, 0.12);
  border: 1px solid rgba(0, 200, 255, 0.35);
  border-radius: 12px;
  color: #88c0ff;
  font-weight: 500;
}

.chart-container {
  flex: 1;
  min-height: 170px;
  width: 100%;
}

.stats-row {
  display: flex;
  justify-content: space-around;
  padding-top: 10px;
  margin-top: 4px;
  border-top: 1px solid rgba(0, 150, 255, 0.15);
  gap: 8px;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-label {
  display: block;
  font-size: 9px;
  color: #88a0b0;
  margin-bottom: 4px;
  letter-spacing: 0.3px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #e0f0ff;
}

.stat-value small {
  font-size: 10px;
  font-weight: normal;
  color: #88a0b0;
  margin-left: 2px;
}

.stat-value.up {
  color: #F44336;
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 160px;
  color: #88a0b0;
  font-size: 11px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(0, 240, 255, 0.2);
  border-top-color: #00f0ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .chart-card {
    padding: 10px;
    min-height: 220px;
  }
  
  .stat-value {
    font-size: 14px;
  }
  
  .chart-container {
    min-height: 120px;
  }
}
</style>
