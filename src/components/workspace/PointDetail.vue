<template>
  <div class="point-detail">
    <!-- 基本信息 -->
    <div class="info-section">
      <h4>基本信息</h4>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">编号</span>
          <span class="info-value">{{ point?.id ?? '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">名称</span>
          <span class="info-value">{{ point?.name || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">类型</span>
          <span class="info-value">{{ point?.type || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">经度</span>
          <span class="info-value">{{ point?.lng ? `${Number(point.lng).toFixed(6)}°E` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">纬度</span>
          <span class="info-value">{{ point?.lat ? `${Number(point.lat).toFixed(6)}°N` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">高程</span>
          <span class="info-value">{{ point?.elevation !== undefined ? `${Number(point.elevation).toFixed(2)} m` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">坡度</span>
          <span class="info-value">{{ point?.slope !== undefined ? `${Number(point.slope).toFixed(2)}°` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">威胁人口</span>
          <span class="info-value">{{ point?.threat || '暂无' }}</span>
        </div>
      </div>
    </div>

    <!-- 降雨量分析 -->
    <div class="info-section rainfall-section">
      <h4>📊 降雨量分析</h4>
      
      <div v-if="rainfallLoading" class="loading-text">
        <span class="loading-spinner"></span>
        <span>正在加载降雨数据...</span>
      </div>
      
      <div v-else-if="rainfallData" class="rainfall-content">
        <!-- 统计卡片 -->
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-value">{{ rainfallData.statistics.avg_annual }}</div>
            <div class="stat-label">年均降雨量 (mm)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ rainfallData.statistics.max_monthly }}</div>
            <div class="stat-label">最大月雨量 (mm)</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ rainfallData.statistics.min_monthly }}</div>
            <div class="stat-label">最小月雨量 (mm)</div>
          </div>
        </div>
        
        <!-- 极值信息（一行一个） -->
        <div class="extreme-info">
          <div class="extreme-row">
            <span class="extreme-label">🌧️ 最湿月份：</span>
            <span class="extreme-value">{{ rainfallData.statistics.max_month?.date }} ({{ rainfallData.statistics.max_month?.precip_mm }} mm)</span>
          </div>
          <div class="extreme-row">
            <span class="extreme-label">☀️ 最干月份：</span>
            <span class="extreme-value">{{ rainfallData.statistics.min_month?.date }} ({{ rainfallData.statistics.min_month?.precip_mm }} mm)</span>
          </div>
        </div>
        
        <!-- 降雨图表 -->
        <div class="rainfall-chart">
          <div class="chart-header">
            <span class="chart-title">{{ showFullHistory ? '全部降雨历史' : '月降雨趋势' }}</span>
            <el-button type="primary" link size="small" @click="toggleChartView">
              {{ showFullHistory ? '收起' : '查看全部' }}
            </el-button>
          </div>
          <div ref="chartRef" class="chart-container"></div>
        </div>
        
        <div class="data-source">
          <span>📡 数据来源: 彭守璋. (2020). 中国1km分辨率逐月降水量数据集（1901-2024）. 国家青藏高原科学数据中心.</span>
        </div>
      </div>
      
      <div v-else-if="rainfallError" class="error-tip">
        <span>⚠️ {{ rainfallError }}</span>
        <button @click="fetchRainfallData" class="retry-btn">重试</button>
      </div>
      
      <div v-else class="empty-tip">
        <span>📍 请选择监测点查看降雨数据</span>
      </div>
    </div>

    <!-- 地质信息 -->
    <div class="info-section">
      <h4>地质特征</h4>
      <div v-if="geologyLoading" class="loading-text">
        <span class="loading-spinner"></span>
        <span>正在加载地质数据...</span>
      </div>
      <div v-else class="info-grid">
        <div class="info-row">
          <span class="info-label">地质单元</span>
          <span class="info-value">{{ geologyData.unit || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">地质代号</span>
          <span class="info-value">{{ geologyData.code || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">岩性</span>
          <span class="info-value">{{ geologyData.lithology || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">构造</span>
          <span class="info-value">{{ geologyData.structure || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">规模</span>
          <span class="info-value">{{ geologyData.scale || '暂无' }}</span>
        </div>
        <div class="info-row" v-if="geologyData.description">
          <span class="info-label">详细描述</span>
          <span class="info-value">{{ geologyData.description }}</span>
        </div>
      </div>
    </div>

    <!-- 历史灾害 -->
    <div class="info-section">
      <h4>历史灾害记录</h4>
      <div class="empty-history">暂无历史记录</div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button type="primary" :icon="Download" @click="exportData">导出数据</el-button>
      <el-button :icon="Printer" @click="printReport">打印报告</el-button>
      <el-button :icon="Share" @click="shareData">分享</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Download, Printer, Share } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

const props = defineProps<{
  point: {
    id?: number
    name?: string
    type?: string
    lng?: number
    lat?: number
    elevation?: number
    slope?: number
    threat?: string
    level?: string
  } | null
}>()

// 降雨数据
const rainfallLoading = ref(false)
const rainfallError = ref('')
const rainfallData = ref<any>(null)
const showFullHistory = ref(false)
const chartRef = ref(null)
let chart: echarts.ECharts | null = null

// 地质数据
const geologyData = ref({
  unit: '',
  code: '',
  lithology: '',
  structure: '',
  scale: '',
  description: '',
  fromCloud: false
})
const geologyLoading = ref(false)

// API 配置
const RAINFALL_API = '/api/rainfall'

const lastUpdateTime = computed(() => {
  return new Date().toLocaleString('zh-CN')
})

// 获取降雨数据
async function fetchRainfallData() {
  if (!props.point?.lng || !props.point?.lat) {
    rainfallError.value = '监测点缺少经纬度信息'
    return
  }
  
  rainfallLoading.value = true
  rainfallError.value = ''
  
  try {
    const url = `${RAINFALL_API}/point?lon=${props.point.lng}&lat=${props.point.lat}`
    console.log('降雨请求URL:', url)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const result = await response.json()
    
    if (result.status === 'success') {
      rainfallData.value = result.data
      console.log('降雨数据:', rainfallData.value)
      
      // 等待 DOM 更新后渲染图表
      await nextTick()
      renderChart()
    } else {
      throw new Error(result.message || '数据加载失败')
    }
  } catch (error: any) {
    console.error('加载降雨数据失败:', error)
    rainfallError.value = error.message || '无法连接降雨数据服务'
    rainfallData.value = null
  } finally {
    rainfallLoading.value = false
  }
}

// 渲染图表
function renderChart() {
  if (!chartRef.value || !rainfallData.value) {
    console.warn('无法渲染图表: chartRef或rainfallData为空')
    return
  }
  
  // 销毁旧图表实例
  if (chart) {
    chart.dispose()
    chart = null
  }
  
  // 创建新图表实例
  chart = echarts.init(chartRef.value)
  
  const timeseries = rainfallData.value.timeseries
  if (!timeseries || timeseries.length === 0) {
    console.warn('无时序数据')
    return
  }
  
  // 选择显示的数据
  const displayData = showFullHistory.value ? timeseries : timeseries.slice(-12)
  const dates = displayData.map((item: any) => item.date)
  const precip = displayData.map((item: any) => item.precip_mm)
  
  // 计算纵轴最大值（留一些空间）
  const maxPrecip = Math.max(...precip)
  const yAxisMax = Math.ceil(maxPrecip / 50) * 50 + 50
  
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const data = params[0]
        return `${data.axisValue}<br/>降雨量: ${data.value} mm`
      }
    },
    grid: {
      left: '15%',
      right: '5%',
      top: 40,
      bottom: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45,
        interval: Math.max(1, Math.floor(dates.length / 8)),
        fontSize: 10,
        margin: 15
      },
      axisLine: { lineStyle: { color: '#64748b' } }
    },
    yAxis: {
      type: 'value',
      name: '降水量 (mm)',
      nameStyle: { fontSize: 12, fontWeight: 500 },
      nameLocation: 'middle',
      nameGap: 55,
      min: 0,
      max: yAxisMax,
      axisLabel: { fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    series: [{
      name: '降水量',
      type: 'bar',
      data: precip,
      itemStyle: {
        color: '#3b82f6',
        borderRadius: [6, 6, 0, 0],
        shadowColor: 'rgba(59, 130, 246, 0.3)',
        shadowBlur: 8
      },
      barWidth: '50%',
      label: {
        show: false
      }
    }],
    title: {
      show: false
    }
  })
  
  // 调整图表大小
  setTimeout(() => {
    if (chart) chart.resize()
  }, 100)
}

// 切换图表视图
function toggleChartView() {
  showFullHistory.value = !showFullHistory.value
  renderChart()
}

// 地质数据加载
async function loadGeologyFromLocalFile() {
  if (!props.point) return
  
  geologyLoading.value = true
  
  try {
    const response = await fetch('/data/geology_inferred_results.json')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    const pointName = props.point.name
    const pointId = props.point.id
    
    let matchedPoint = null
    
    if (pointId !== undefined && pointId !== null) {
      matchedPoint = data.points?.find((p: any) => p.id === pointId)
    }
    
    if (!matchedPoint && pointName) {
      matchedPoint = data.points?.find((p: any) => p.name === pointName)
    }
    
    if (matchedPoint?.geology) {
      const geo = matchedPoint.geology
      geologyData.value = {
        unit: geo.unit || '',
        code: geo.code || '',
        lithology: geo.lithology || '',
        structure: geo.structure || '',
        scale: geo.scale || '',
        description: geo.description || '',
        fromCloud: true
      }
    } else {
      setDefaultGeology()
    }
  } catch (error) {
    console.error('加载地质数据失败:', error)
    setDefaultGeology()
  } finally {
    geologyLoading.value = false
  }
}

function setDefaultGeology() {
  geologyData.value = {
    unit: '宁镇山脉褶皱带',
    code: 'Pz-Mz',
    lithology: '砂岩、页岩、灰岩组合',
    structure: '北东向褶皱束，断裂发育',
    scale: '区域尺度',
    description: '宁镇山脉为古生代-中生代地层，构造线方向北东，是地质灾害重点监测区',
    fromCloud: false
  }
}

function exportData() {
  if (rainfallData.value) {
    const dataStr = JSON.stringify(rainfallData.value, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rainfall_${props.point?.name || props.point?.id}_${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } else {
    ElMessage.warning('暂无数据可导出')
  }
}

function printReport() {
  window.print()
}

function shareData() {
  if (navigator.share) {
    navigator.share({
      title: `监测点 ${props.point?.name} 降雨数据`,
      text: `年均降雨量: ${rainfallData.value?.statistics.avg_annual} mm`,
      url: window.location.href
    }).catch(() => {
      ElMessage.info('分享已取消')
    })
  } else {
    ElMessage.info('当前浏览器不支持分享功能')
  }
}

// 监听 point 变化
watch(() => props.point, async (newPoint, oldPoint) => {
  if (newPoint && newPoint.lng && newPoint.lat) {
    // 重置显示状态
    showFullHistory.value = false
    
    // 重新加载数据
    await loadGeologyFromLocalFile()
    await fetchRainfallData()
  }
}, { immediate: true })

// 监听窗口大小变化
const handleResize = () => {
  if (chart) {
    chart.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped>
.point-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  color: #3b82f6;
  font-size: 13px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.info-label {
  font-size: 13px;
  color: #cbd5e1;
  min-width: 70px;
  flex-shrink: 0;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
  text-align: right;
  word-break: break-word;
  flex: 1;
}

/* 降雨量分析样式 */
.rainfall-section {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
}

.rainfall-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
}

.stat-label {
  font-size: 11px;
  opacity: 0.9;
  margin-top: 4px;
}

/* 极值信息样式 - 一行一个 */
.extreme-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fef3c7;
  border-radius: 8px;
  padding: 12px;
}

.extreme-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding: 4px 0;
}

.extreme-label {
  color: #92400e;
  font-weight: 600;
  font-size: 13px;
}

.extreme-value {
  color: #b45309;
  font-weight: 500;
  font-size: 13px;
}

.rainfall-chart {
  margin-top: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.chart-container {
  height: 240px;
  width: 100%;
  min-height: 200px;
}

.data-source {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
  padding-top: 8px;
  border-top: 1px solid #e2e8f0;
}

.error-tip, .empty-tip {
  padding: 24px;
  text-align: center;
  color: #ef4444;
  font-size: 13px;
  background: #fef2f2;
  border-radius: 8px;
}

.empty-tip {
  color: #64748b;
  background: #f8fafc;
}

.empty-history {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.action-buttons .el-button {
  flex: 1;
}

.retry-btn {
  padding: 4px 12px;
  background: #d97706;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  margin-left: 12px;
}

.retry-btn:hover {
  background: #b45309;
}
</style>