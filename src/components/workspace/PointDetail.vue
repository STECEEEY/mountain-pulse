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

    <!-- 降雨量分析（替换原监测信息） -->
    <div class="info-section rainfall-section">
      <h4>📊 降雨量分析</h4>
      
      <!-- 加载状态 -->
      <div v-if="rainfallLoading" class="loading-text">
        <span class="loading-spinner"></span>
        <span>正在加载降雨数据...</span>
      </div>
      
      <!-- 数据内容 -->
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
        
        <!-- 极值信息 -->
        <div class="extreme-info">
          <div class="extreme-item max">
            <span class="extreme-label">🌧️ 最湿月份</span>
            <span class="extreme-value">{{ rainfallData.statistics.max_month?.date }}: {{ rainfallData.statistics.max_month?.precip_mm }} mm</span>
          </div>
          <div class="extreme-item min">
            <span class="extreme-label">☀️ 最干月份</span>
            <span class="extreme-value">{{ rainfallData.statistics.min_month?.date }}: {{ rainfallData.statistics.min_month?.precip_mm }} mm</span>
          </div>
        </div>
        
        <!-- 降雨图表（简化版，显示最近12个月） -->
        <div class="rainfall-chart">
          <div class="chart-header">
            <span class="chart-title">近12个月降雨趋势</span>
            <el-button 
              type="primary" 
              link 
              size="small" 
              @click="showFullHistory = !showFullHistory"
            >
              {{ showFullHistory ? '收起' : '查看全部' }}
            </el-button>
          </div>
          <div ref="chartRef" class="chart-container"></div>
        </div>
        
        <!-- 数据来源信息 -->
        <div class="data-source">
          <span>📡 数据来源: CRU TS 4.09</span>
          <span>🕐 更新时间: {{ lastUpdateTime }}</span>
        </div>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="rainfallError" class="error-tip">
        <span>⚠️ {{ rainfallError }}</span>
        <button @click="fetchRainfallData" class="retry-btn">重试</button>
      </div>
      
      <!-- 无数据提示 -->
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
      <div v-if="!geologyData.fromCloud && !geologyLoading && point?.lng && point?.lat" class="retry-tip">
        <span>⚠️ 无法加载地质数据</span>
        <button @click="retryFetch" class="retry-btn">重试</button>
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
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { Download, Printer, Share } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

// 定义 props
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

// 降雨数据相关
const rainfallLoading = ref(false)
const rainfallError = ref('')
const rainfallData = ref<any>(null)
const showFullHistory = ref(false)
const chartRef = ref(null)
let chart: echarts.ECharts | null = null

// 地质数据相关
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
const API_BASE = 'http://47.102.147.118:5000/api/rainfall'

// 最后更新时间
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
    const url = `${API_BASE}/point?lon=${props.point.lng}&lat=${props.point.lat}`
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.status === 'success') {
      rainfallData.value = result.data
      console.log('降雨数据加载成功:', rainfallData.value)
      
      // 渲染图表
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
  if (!chartRef.value || !rainfallData.value) return
  
  if (!chart) {
    chart = echarts.init(chartRef.value)
  }
  
  // 选择显示的数据（最近12个月或全部）
  const timeseries = rainfallData.value.timeseries
  const displayData = showFullHistory.value ? timeseries : timeseries.slice(-12)
  const dates = displayData.map((item: any) => item.date)
  const precip = displayData.map((item: any) => item.precip_mm)
  
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const data = params[0]
        return `${data.axisValue}<br/>降雨量: ${data.value} mm`
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      top: 20,
      bottom: 30,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        rotate: 45,
        interval: Math.ceil(dates.length / 8),
        fontSize: 10
      }
    },
    yAxis: {
      type: 'value',
      name: '降水量 (mm)',
      nameStyle: { fontSize: 11 }
    },
    series: [{
      type: 'bar',
      data: precip,
      itemStyle: {
        color: '#3b82f6',
        borderRadius: [4, 4, 0, 0]
      },
      barWidth: '60%'
    }]
  })
}

// 监听显示模式变化
watch(showFullHistory, () => {
  renderChart()
})

// 从本地JSON文件加载地质信息
async function loadGeologyFromLocalFile() {
  if (!props.point) return
  
  geologyLoading.value = true
  
  try {
    const response = await fetch('/data/geology_inferred_results.json')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: 无法加载地质数据文件`)
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

// 设置默认地质信息
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

// 重试加载
async function retryFetch() {
  ElMessage.info('正在重新加载地质数据...')
  await loadGeologyFromLocalFile()
  if (geologyData.value.fromCloud) {
    ElMessage.success('地质数据加载成功！')
  } else {
    ElMessage.warning('使用默认地质数据')
  }
}

// 导出数据
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

// 打印报告
function printReport() {
  window.print()
}

// 分享
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
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    await loadGeologyFromLocalFile()
    await fetchRainfallData()
  }
}, { immediate: true })

// 监听窗口大小变化，调整图表
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

// 导入 nextTick
import { nextTick } from 'vue'
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

.extreme-info {
  display: flex;
  gap: 12px;
  background: #fef3c7;
  border-radius: 8px;
  padding: 12px;
}

.extreme-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.extreme-label {
  color: #92400e;
  font-weight: 500;
}

.extreme-value {
  color: #b45309;
}

.rainfall-chart {
  margin-top: 8px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chart-title {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

.chart-container {
  height: 200px;
  width: 100%;
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

.retry-tip {
  margin-top: 12px;
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  font-size: 12px;
  color: #d97706;
  display: flex;
  align-items: center;
  justify-content: space-between;
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
}

.retry-btn:hover {
  background: #b45309;
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
</style>