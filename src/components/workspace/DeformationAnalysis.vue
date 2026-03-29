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

   <!-- AI 趋势分析 -->
    <div class="ai-analysis">
      <div class="ai-header">
        <span class="ai-icon">🤖 AI</span>
        <span>模型趋势分析</span>
        <button class="refresh-ai" @click="refreshAIAnalysis" :disabled="aiLoading">
          {{ aiLoading ? '分析中...' : '刷新分析' }}
        </button>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="aiLoading" class="ai-loading">
        <span class="loading-spinner"></span>
        <span>AI 正在分析形变趋势...</span>
      </div>
      
      <!-- AI 分析结果 -->
      <div v-else-if="aiResult" class="ai-result">
        <!-- 趋势总结 -->
        <div class="ai-section">
          <div class="ai-section-title">📊 趋势总结</div>
          <p class="ai-section-content">{{ aiResult.summary }}</p>
        </div>
        
        <!-- 风险评估 -->
        <div class="ai-section">
          <div class="ai-section-title">⚠️ 风险评估</div>
          <p class="ai-section-content" :class="aiResult.riskLevel">
            <span class="risk-badge">{{ aiResult.riskText }}</span>
            {{ aiResult.riskDescription }}
          </p>
        </div>
        
        <!-- 预测建议 -->
        <div class="ai-section">
          <div class="ai-section-title">🔮 趋势预测</div>
          <ul class="ai-list">
            <li v-for="pred in aiResult.predictions" :key="pred">{{ pred }}</li>
          </ul>
        </div>
        
        <!-- 应对建议 -->
        <div class="ai-section">
          <div class="ai-section-title">💡 应对建议</div>
          <ul class="ai-list">
            <li v-for="rec in aiResult.recommendations" :key="rec">{{ rec }}</li>
          </ul>
        </div>
        
        <div class="ai-time">分析时间：{{ aiResult.analysisTime }}</div>
      </div>
      
      <!-- 无数据状态 -->
      <div v-else class="ai-placeholder">
        <p class="ai-content">点击"刷新分析"，AI 将基于形变数据生成趋势预测</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { riskService } from '@/services/riskService'
import type { DeformationRecord } from '@/types/risk'
import { getRiskLevelClass, normalizeRiskLevel } from '@/utils/riskLevel'
import aiService from '@/services/aiService'
import { ElMessage } from 'element-plus'
  
const props = defineProps<{
  point: {
    name?: string
    lng?: number
    lat?: number
    level?: string
  } | null
}>()



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
    .filter((item: { date: string; displacement: number }) => {
        const isValid = typeof item.date === 'string' && 
                    item.date.length > 0 && 
                    Number.isFinite(item.displacement) &&
                    !Number.isNaN(item.displacement)
        if (!isValid) {
        console.warn('无效数据项:', item)
        }
        return isValid
    })
    .map((item: { date: string; displacement: number }) => ({ 
        date: item.date, 
        displacement: Number(item.displacement) 
    }))
    .sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date))

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
    位移范围: `${Math.min(...validData.map((d: { displacement: number }) => d.displacement))} ~ ${Math.max(...validData.map((d: { displacement: number }) => d.displacement))}`
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

// ========== 在这里添加 onMounted ==========
// 组件挂载时初始化图表
onMounted(() => {
  console.log('DeformationAnalysis 组件挂载，初始化图表')
  if (chartRef.value) {
    initChart()
    // 如果已经有数据，确保图表渲染
    if (filteredSeries.value && filteredSeries.value.length > 0) {
      updateChart()
    }
  }
})

// 添加重试机制
const retryFetch = () => {
  errorMessage.value = ''
  fetchDeformationData()
}

const aiLoading = ref(false)
const aiResult = ref<{
  summary: string
  riskLevel: string
  riskText: string
  riskDescription: string
  predictions: string[]
  recommendations: string[]
  analysisTime: string
} | null>(null)

// 构建 AI 分析请求
const buildAIAnalysisRequest = () => {
  // 获取形变数据
  const deformationData = filteredSeries.value.map(item => ({
    date: item.date,
    displacement: item.displacement
  }))
  
  // 获取统计指标
  const statsData = {
    cumulative: stats.value.cumulative,
    rate: stats.value.rate,
    max: stats.value.max,
    timeRange: timeRange.value,
    dataPoints: deformationData.length
  }
  
  // 构建分析提示词
  const analysisPrompt = `
请分析以下地质灾害形变监测数据：

监测点：${props.point?.name || '未知点'}
风险等级：${props.point?.level || '未知'}

形变数据统计：
- 累计形变：${statsData.cumulative?.toFixed(2) || '--'} mm
- 年均速率：${statsData.rate?.toFixed(2) || '--'} mm/yr
- 最大形变：${statsData.max?.toFixed(2) || '--'} mm
- 数据时间范围：${timeRange.value}
- 数据点数量：${statsData.dataPoints}

最近形变趋势：
${deformationData.slice(-5).map(d => `${d.date}: ${d.displacement.toFixed(2)}mm`).join('\n')}

请基于以上数据，输出 JSON 格式的分析结果：
{
  "summary": "形变趋势总结（一句话概括）",
  "riskLevel": "high/medium/low",
  "riskText": "高风险/中风险/低风险",
  "riskDescription": "风险评估详细说明",
  "predictions": ["预测1", "预测2", "预测3"],
  "recommendations": ["建议1", "建议2", "建议3"]
}
`

  return {
    pointName: props.point?.name || '监测点',
    dutyNote: analysisPrompt,
    scene: 'trend_analysis'
  }
}

// 刷新 AI 分析
const refreshAIAnalysis = async () => {
  if (!props.point) {
    ElMessage.warning('请先选择监测点')
    return
  }
  
  if (filteredSeries.value.length === 0) {
    ElMessage.warning('暂无足够的数据进行分析')
    return
  }
  
  aiLoading.value = true
  
  try {
    const request = buildAIAnalysisRequest()
    const decisions = await aiService.generateDecision(request)
    
    // 从 AI 返回中提取分析结果
    if (decisions && decisions.length > 0) {
      const firstDecision = decisions[0]
      
      // 尝试从 AI 返回的内容中解析
      let analysisData = null
      
      // 如果 AI 返回的是标准格式，直接使用（添加空值检查）
      if (firstDecision && firstDecision.title && firstDecision.action) {
        analysisData = {
          summary: firstDecision.title || '形变趋势分析完成',
          riskLevel: firstDecision.level === 'danger' ? 'high' : firstDecision.level === 'warning' ? 'medium' : 'low',
          riskText: firstDecision.level === 'danger' ? '高风险' : firstDecision.level === 'warning' ? '中风险' : '低风险',
          riskDescription: firstDecision.action || '请关注形变数据变化',
          predictions: [
            `未来7天形变速率预计${Math.abs(stats.value.rate || 0) > 5 ? '持续加快' : '保持稳定'}`,
            `若${Math.abs(stats.value.rate || 0) > 3 ? '持续降雨' : '无极端天气'}，风险将${Math.abs(stats.value.rate || 0) > 5 ? '显著上升' : '基本可控'}`,
            `建议${Math.abs(stats.value.rate || 0) > 3 ? '加密监测频率至每日2次' : '保持常规监测'}`
          ],
          recommendations: [
            Math.abs(stats.value.rate || 0) > 5 ? '立即启动应急预案' : '加强日常巡查',
            Math.abs(stats.value.cumulative || 0) > 10 ? '组织专家现场勘查' : '持续关注形变变化',
            '及时向相关部门报送监测数据'
          ]
        }
      } else {
        // 否则根据统计数据生成分析
        const rate = Math.abs(stats.value.rate || 0)
        const cumulative = Math.abs(stats.value.cumulative || 0)
        
        analysisData = {
          summary: rate > 5 ? '形变速率较快，需重点关注' : rate > 2 ? '形变持续发展，需加强监测' : '形变较稳定，维持常规监测',
          riskLevel: rate > 5 ? 'high' : rate > 2 ? 'medium' : 'low',
          riskText: rate > 5 ? '高风险' : rate > 2 ? '中风险' : '低风险',
          riskDescription: `年均形变速率${rate.toFixed(2)}mm/yr，累计形变${cumulative.toFixed(2)}mm，${rate > 5 ? '已达到预警阈值' : '目前处于可控范围'}`,
          predictions: [
            `未来1个月形变量预计增加${(rate * 0.083).toFixed(2)}mm`,
            rate > 3 ? '若持续降雨，形变速率可能加快' : '若无极端天气，形变将保持稳定',
            `建议${rate > 2 ? '加密监测频率' : '保持现有监测频率'}`
          ],
          recommendations: [
            rate > 5 ? '立即组织专家会商' : '定期分析监测数据',
            rate > 3 ? '增加人工巡查频次' : '保持常规巡查',
            '做好应急物资储备'
          ]
        }
      }
      
      if (analysisData) {
        aiResult.value = {
          ...analysisData,
          analysisTime: new Date().toLocaleString()
        }
      } else {
        generateDefaultAnalysis()
      }
    } else {
      // 没有返回决策，使用默认分析
      generateDefaultAnalysis()
    }
    
    ElMessage.success('AI 趋势分析完成')
  } catch (error) {
    console.error('AI 分析失败:', error)
    ElMessage.error('AI 分析失败，请重试')
    generateDefaultAnalysis()
  } finally {
    aiLoading.value = false
  }
}

// 生成默认分析（当 AI 调用失败时）
const generateDefaultAnalysis = () => {
  const rate = Math.abs(stats.value.rate || 0)
  const cumulative = Math.abs(stats.value.cumulative || 0)
  
  aiResult.value = {
    summary: `基于${timeRange.value}的形变数据，该点位${rate > 3 ? '形变持续发展' : '形变相对稳定'}`,
    riskLevel: rate > 5 ? 'high' : rate > 2 ? 'medium' : 'low',
    riskText: rate > 5 ? '高风险' : rate > 2 ? '中风险' : '低风险',
    riskDescription: `年均形变速率${rate.toFixed(2)}mm/yr，累计形变${cumulative.toFixed(2)}mm`,
    predictions: [
      `预计未来${timeRange.value}内形变量将继续${rate > 0 ? '增加' : '变化'}`,
      `若遇强降雨，风险等级可能提升`,
      `建议密切关注形变趋势变化`
    ],
    recommendations: [
      rate > 3 ? '加密监测频率' : '保持常规监测',
      '定期分析监测数据',
      '做好应急准备'
    ],
    analysisTime: new Date().toLocaleString()
  }
}

// 监听数据变化，自动刷新 AI 分析（可选）
watch(
  () => [filteredSeries.value.length, timeRange.value, props.point?.level],
  () => {
    if (filteredSeries.value.length > 0 && props.point) {
      // 延迟1秒后自动分析，避免频繁请求
      setTimeout(() => {
        refreshAIAnalysis()
      }, 500)
    }
  },
  { deep: false }
)
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
  margin-top: 20px;
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
/* AI 分析样式 */
.refresh-ai {
  margin-left: auto;
  background: rgba(0, 150, 255, 0.2);
  border: 1px solid rgba(0, 200, 255, 0.4);
  color: #00f0ff;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-ai:hover:not(:disabled) {
  background: rgba(0, 150, 255, 0.4);
  border-color: #00f0ff;
}

.refresh-ai:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px;
  color: #88a0b0;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 200, 255, 0.3);
  border-top-color: #00f0ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-result {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-section {
  border-left: 2px solid #00f0ff;
  padding-left: 12px;
}

.ai-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #00f0ff;
  margin-bottom: 6px;
}

.ai-section-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #b8d4ff;
}

.ai-section-content.high {
  color: #ff6b6b;
}

.ai-section-content.medium {
  color: #ffaa44;
}

.ai-section-content.low {
  color: #44ff88;
}

.risk-badge {
  display: inline-block;
  background: rgba(0, 0, 0, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-right: 8px;
}

.ai-list {
  margin: 0;
  padding-left: 18px;
}

.ai-list li {
  font-size: 12px;
  line-height: 1.6;
  color: #b8d4ff;
  margin: 4px 0;
}

.ai-time {
  font-size: 10px;
  color: #6c8aa3;
  text-align: right;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 200, 255, 0.2);
}

.ai-placeholder {
  padding: 20px;
  text-align: center;
}

.ai-placeholder .ai-content {
  margin: 0;
  color: #6c8aa3;
}
</style>
