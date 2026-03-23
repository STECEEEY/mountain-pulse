<template>
  <div class="deformation-analysis">
    <!-- 选中点信息 -->
    <div class="point-info" v-if="point">
      <h3 class="point-name">{{ point.name }}</h3>
      <div class="point-meta">
        <span class="level-badge" :class="point.level || ''">{{ getLevelText(point.level || '') }}</span>
        <span class="coords">{{ point.lng }}°E, {{ point.lat }}°N</span>
      </div>
    </div>
    <div class="no-selection" v-else>
      <div class="empty-hint">
        <span class="empty-icon">NO DATA</span>
        <span>请在地图上选择监测点</span>
      </div>
    </div>

    <!-- 时序曲线 -->
    <div class="chart-section">
      <div class="section-header">
        <h4>InSAR 时序形变</h4>
        <el-radio-group v-model="timeRange" size="small">
          <el-radio-button label="3m">3月</el-radio-button>
          <el-radio-button label="6m">6月</el-radio-button>
          <el-radio-button label="1y">1年</el-radio-button>
        </el-radio-group>
      </div>
      <div class="chart-wrap">
        <div class="chart-container" ref="chartRef"></div>
        <div v-if="loading" class="chart-state">加载中...</div>
        <div v-else-if="errorMessage" class="chart-state error">{{ errorMessage }}</div>
        <div v-else-if="point && filteredSeries.length === 0" class="chart-state">暂无数据</div>
      </div>
    </div>

    <!-- 统计指标 -->
    <div class="stats-section">
      <div class="stat-card">
        <span class="stat-label">累计形变</span>
        <span class="stat-value" :class="warningClass">{{ formatMetric(stats.cumulative, 'mm') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">年均速率</span>
        <span class="stat-value">{{ formatMetric(stats.rate, 'mm/yr') }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">最大形变</span>
        <span class="stat-value">{{ formatMetric(stats.max, 'mm') }}</span>
      </div>
      <div class="stat-card warning-card">
        <span class="stat-label">预警状态</span>
        <span class="stat-value warning">{{ warningText }}</span>
      </div>
    </div>

    <!-- AI 分析 -->
    <div class="ai-analysis">
      <div class="ai-header">
        <span class="ai-icon">MODEL</span>
        <span>模型趋势分析</span>
      </div>
      <p class="ai-content">
        预警等级直接使用风险点 level 原始字段；时序曲线与统计值均来自实时形变接口，
        时间窗切换仅做前端过滤，不生成任何占位数据。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { riskService } from '@/services/riskService'
import type { DeformationRecord } from '@/types/risk'
import { getRiskLevelClass, normalizeRiskLevel } from '@/utils/riskLevel'

const props = defineProps<{
  point: {
    name?: string
    lng?: number
    lat?: number
    level?: string
  } | null
}>()

// 添加这个调试 watch
watch(
  () => [props.point?.lat, props.point?.lng],
  (newVal, oldVal) => {
    console.log('watch 触发 - 新值:', newVal, '旧值:', oldVal)
    console.log('准备调用 fetchDeformationData')
    fetchDeformationData()
  },
  { immediate: true, deep: true }  // 添加 immediate 和 deep
)


const timeRange = ref('6m')
const chartRef = ref<HTMLElement>()
const loading = ref(false)
const errorMessage = ref('')
const rawSeries = shallowRef<DeformationRecord[]>([])
let chart: echarts.ECharts | null = null
let resizeHandler: (() => void) | null = null

const warningText = computed(() => normalizeRiskLevel(props.point?.level))

const warningClass = computed(() => {
  const levelClass = getRiskLevelClass(props.point?.level)
  return {
    danger: levelClass === 'danger',
    warning: levelClass === 'warning',
  }
})

const parseDate = (value: string) => {
  if (/^\d{8}$/.test(value)) {
    const year = Number(value.slice(0, 4))
    const month = Number(value.slice(4, 6)) - 1
    const day = Number(value.slice(6, 8))
    return new Date(year, month, day)
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const formatDateLabel = (value: string) => {
  const date = parseDate(value)
  if (!date) return value
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

const filteredSeries = computed(() => {
  if (rawSeries.value.length === 0) return []
  const sorted = [...rawSeries.value].sort((a: DeformationRecord, b: DeformationRecord) => a.date.localeCompare(b.date))
  const latestItem = sorted[sorted.length - 1]
  if (!latestItem) return []
  const latestDate = parseDate(latestItem.date)
  if (!latestDate) return sorted

  const monthMap: Record<string, number> = { '3m': 3, '6m': 6, '1y': 12 }
  const months = monthMap[timeRange.value] ?? 6
  const startDate = new Date(latestDate)
  startDate.setMonth(startDate.getMonth() - months)

  return sorted.filter((item: DeformationRecord) => {
    const date = parseDate(item.date)
    return !!date && date >= startDate && date <= latestDate
  })
})

const stats = computed(() => {
  if (filteredSeries.value.length === 0) {
    return {
      cumulative: null,
      rate: null,
      max: null,
    }
  }

  const values = filteredSeries.value.map((item: DeformationRecord) => item.displacement)
  const first = filteredSeries.value[0]
  const last = filteredSeries.value[filteredSeries.value.length - 1]
  
  if (!first || !last) {
    return {
      cumulative: null,
      rate: null,
      max: null,
    }
  }
  
  const startDate = parseDate(first.date)
  const endDate = parseDate(last.date)
  
  if (!startDate || !endDate) {
    return {
      cumulative: last.displacement,
      rate: null,
      max: Math.max(...values.map((value: number) => Math.abs(value))),
    }
  }
  
  const years = Math.max((endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 3600 * 1000), 1 / 365)

  return {
    cumulative: last.displacement,
    rate: (last.displacement - first.displacement) / years,
    max: Math.max(...values.map((value: number) => Math.abs(value))),
  }
})

const formatMetric = (value: number | null, unit: string) => {
  if (value === null || Number.isNaN(value)) return '--'
  return `${value.toFixed(2)} ${unit}`
}

const getLevelText = (level: string) => {
  const texts: Record<string, string> = {
    danger: '极高风险',
    warning: '高风险',
    medium: '中风险',
    safe: '低风险',
    极高: '极高风险',
    高: '高风险',
    中: '中风险',
    低: '低风险',
  }
  return texts[level] || level
}

const buildChartOption = () => ({
  animation: false,
  grid: { left: 40, right: 20, top: 20, bottom: 56 },
  xAxis: {
    type: 'category',
    data: filteredSeries.value.map((item: DeformationRecord) => formatDateLabel(item.date)),
    axisLine: { lineStyle: { color: '#2b4a6a' } },
    axisLabel: { color: '#88a0b0', fontSize: 11, hideOverlap: true },
  },
  yAxis: {
    type: 'value',
    name: 'mm',
    nameTextStyle: { color: '#88a0b0', fontSize: 11 },
    axisLine: { show: false },
    axisLabel: { color: '#88a0b0', fontSize: 11 },
    splitLine: { lineStyle: { color: '#1a3a5a', type: 'dashed' } },
  },
  dataZoom: [
    { type: 'inside', throttle: 80 },
    { type: 'slider', height: 18, bottom: 8 },
  ],
  series: [
    {
      type: 'line',
      data: filteredSeries.value.map((item: DeformationRecord) => item.displacement),
      smooth: false,
      showSymbol: false,
      sampling: 'lttb',
      progressive: 2000,
      progressiveThreshold: 5000,
      lineStyle: { color: '#00f0ff', width: 2, shadowColor: 'rgba(0, 240, 255, 0.5)', shadowBlur: 10 },
      itemStyle: { color: '#00f0ff', borderColor: '#00f0ff' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(0, 240, 255, 0.3)' },
          { offset: 1, color: 'rgba(0, 240, 255, 0)' },
        ]),
      },
    },
  ],
  backgroundColor: 'transparent',
})

const updateChart = () => {
  if (!chart) return
  chart.setOption(buildChartOption(), true)
}

const initChart = () => {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value)
  updateChart()
}

// 在 fetchDeformationData 函数开头也添加日志
const fetchDeformationData = async () => {
  console.log('fetchDeformationData 被调用了')
  console.log('当前 props.point:', props.point)
  if (!props.point || typeof props.point.lat !== 'number' || typeof props.point.lng !== 'number') {
    rawSeries.value = []
    errorMessage.value = ''
    updateChart()
    return
  }

  console.log('开始请求形变数据，坐标:', props.point.lat, props.point.lng)
  loading.value = true
  errorMessage.value = ''

  try {
    console.log('请求形变数据:', {
      lat: props.point.lat,
      lng: props.point.lng
    })
    
    const response = await riskService.loadDeformationData(props.point.lat, props.point.lng)
    
    console.log('形变接口返回:', response)
    
    // 添加更严格的数据验证和转换
    if (!response.deformation_data || !Array.isArray(response.deformation_data)) {
      throw new Error('接口返回数据格式错误')
    }
    
    if (response.deformation_data.length === 0) {
      errorMessage.value = '该点位暂无形变数据'
      rawSeries.value = []
      return
    }
    
    // 验证数据有效性
    const validData = response.deformation_data
      .filter((item) => {
        const isValid = typeof item.date === 'string' && 
                       item.date.length > 0 && 
                       Number.isFinite(item.displacement) &&
                       !Number.isNaN(item.displacement)
        if (!isValid) {
          console.warn('无效数据项:', item)
        }
        return isValid
      })
      .map((item) => ({ 
        date: item.date, 
        displacement: Number(item.displacement) 
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    if (validData.length === 0) {
    errorMessage.value = '数据格式无效，请检查接口返回'
    rawSeries.value = []
    return
    }

    rawSeries.value = validData
    errorMessage.value = ''

    console.log('处理后的数据:', {
    总数: validData.length,
    时间范围: `${validData[0]?.date ?? '未知'} ~ ${validData[validData.length - 1]?.date ?? '未知'}`,
    位移范围: `${Math.min(...validData.map(d => d.displacement))} ~ ${Math.max(...validData.map(d => d.displacement))}`
    })
    
  } catch (error) {
    console.error('加载形变数据失败:', error)
    rawSeries.value = []
    
    if (error instanceof Error) {
      // 提供更友好的错误提示
      if (error.message.includes('Failed to fetch')) {
        errorMessage.value = '无法连接形变数据服务，请检查网络'
      } else if (error.message.includes('超时')) {
        errorMessage.value = '请求超时，请稍后重试'
      } else {
        errorMessage.value = error.message
      }
    } else {
      errorMessage.value = '形变数据加载失败'
    }
  } finally {
    loading.value = false
    updateChart()
  }
}

// 添加重试机制
const retryFetch = () => {
  errorMessage.value = ''
  fetchDeformationData()
}
</script>

<style scoped>
/* 添加重试按钮样式 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.retry-btn {
  background: rgba(0, 150, 255, 0.2);
  border-color: #00f0ff;
  color: #00f0ff;
}

.retry-btn:hover {
  background: rgba(0, 150, 255, 0.4);
  border-color: #00f0ff;
  color: #fff;
}


.point-info {
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 200, 255, 0.2);
}

.point-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #00f0ff;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
}

.point-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-badge {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.level-badge.danger { background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid rgba(255, 68, 68, 0.5); }
.level-badge.warning { background: rgba(255, 136, 68, 0.2); color: #ff8844; border: 1px solid rgba(255, 136, 68, 0.5); }
.level-badge.medium { background: rgba(255, 204, 68, 0.2); color: #ffcc44; border: 1px solid rgba(255, 204, 68, 0.5); }
.level-badge.safe { background: rgba(68, 255, 68, 0.2); color: #44ff44; border: 1px solid rgba(68, 255, 68, 0.5); }

.coords {
  font-size: 13px;
  color: #88a0b0;
}

.no-selection {
  padding: 40px 0;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #88a0b0;
}

.empty-icon {
  font-size: 11px;
  letter-spacing: 1px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  background: rgba(0, 76, 112, 0.22);
  border-radius: 8px;
  padding: 4px 8px;
  opacity: 0.9;
}

.chart-section {
  background: rgba(0, 30, 50, 0.5);
  border: 1px solid rgba(0, 200, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
}

.chart-container {
  height: 200px;
}

.chart-wrap {
  position: relative;
}

.chart-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #9bc2db;
  background: rgba(2, 12, 24, 0.35);
}

.chart-state.error {
  color: #ff9d9d;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-card {
  background: rgba(0, 30, 50, 0.5);
  border: 1px solid rgba(0, 200, 255, 0.15);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.3s;
}

.stat-card:hover {
  border-color: rgba(0, 200, 255, 0.3);
  background: rgba(0, 50, 80, 0.5);
}

.stat-card.warning-card {
  animation: pulseWarning 2s infinite;
}

@keyframes pulseWarning {
  0%, 100% { border-color: rgba(255, 136, 68, 0.3); }
  50% { border-color: rgba(255, 136, 68, 0.6); }
}

.stat-label {
  font-size: 12px;
  color: #88a0b0;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #00f0ff;
}

.stat-value.danger { color: #ff4444; text-shadow: 0 0 10px rgba(255, 68, 68, 0.5); }
.stat-value.warning { color: #ffaa00; }

.ai-analysis {
  background: linear-gradient(135deg, rgba(0, 50, 100, 0.4) 0%, rgba(0, 80, 60, 0.3) 100%);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #00f0ff;
  margin-bottom: 10px;
}

.ai-icon {
  font-size: 10px;
  border: 1px solid rgba(0, 180, 255, 0.28);
  border-radius: 8px;
  padding: 2px 6px;
  color: #9ad4f2;
}

.ai-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #a0d0ff;
}

/* Element Plus 深色样式 */
:deep(.el-radio-group) {
  --el-radio-button-checked-bg-color: rgba(0, 150, 255, 0.3);
  --el-radio-button-checked-border-color: #00f0ff;
  --el-radio-button-checked-text-color: #00f0ff;
}

:deep(.el-radio-button__inner) {
  background: rgba(0, 30, 50, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
  color: #88a0b0;
}

:deep(.el-radio-button__inner:hover) {
  color: #00f0ff;
}
</style>
