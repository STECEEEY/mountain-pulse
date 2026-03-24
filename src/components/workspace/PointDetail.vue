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

    <!-- 监测信息 -->
    <div class="info-section">
      <h4>监测信息</h4>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">监测开始</span>
          <span class="info-value">-</span>
        </div>
        <div class="info-row">
          <span class="info-label">数据源</span>
          <span class="info-value">
            <span v-if="geologyData.fromCloud" style="color: #3b82f6;">✓ 推断数据</span>
            <span v-else style="color: #f59e0b;">⚠ 默认数据</span>
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">最近更新</span>
          <span class="info-value">{{ lastUpdateTime }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">监测周期</span>
          <span class="info-value">-</span>
        </div>
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
          <span class="info-value">{{ geologyData.scale || '区域尺度' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">稳定性</span>
          <span class="info-value" :class="{ danger: geologyData.stability === '不稳定' }">
            {{ geologyData.stability || (point?.level ? `${point.level}风险` : '暂无') }}
          </span>
        </div>
        <div class="info-row" v-if="geologyData.confidence !== undefined">
          <span class="info-label">推断置信度</span>
          <span class="info-value">
            {{ (geologyData.confidence * 100).toFixed(1) }}%
            <span class="confidence-tip">(KNN算法)</span>
          </span>
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
      <el-button type="primary" :icon="Download">导出数据</el-button>
      <el-button :icon="Printer">打印报告</el-button>
      <el-button :icon="Share">分享</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Download, Printer, Share } from '@element-plus/icons-vue'

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

// 地质数据响应式变量
const geologyData = ref({
  unit: '',
  code: '',
  lithology: '',
  structure: '',
  scale: '',
  stability: '',
  description: '',
  fromCloud: false,
  confidence: undefined as number | undefined
})

const geologyLoading = ref(false)

// 最后更新时间
const lastUpdateTime = computed(() => {
  return new Date().toLocaleString('zh-CN')
})

// 从本地JSON文件加载地质信息
async function loadGeologyFromLocalFile() {
  if (!props.point) {
    return
  }
  
  geologyLoading.value = true
  
  try {
    // 从 public/data/ 读取地质数据文件
    const response = await fetch('/data/geology_inferred_results.json')
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: 无法加载地质数据文件`)
    }
    
    const data = await response.json()
    
    // 根据点名称或ID查找对应的地质信息
    const pointName = props.point.name
    const pointId = props.point.id
    
    let matchedPoint = null
    
    // 优先按ID匹配
    if (pointId !== undefined && pointId !== null) {
      matchedPoint = data.points?.find((p: any) => p.id === pointId)
    }
    
    // 如果ID没匹配上，按名称匹配
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
        scale: geo.scale || '区域尺度',
        stability: geo.stability || '待评估',
        description: geo.description || '',
        fromCloud: true,
        confidence: geo.confidence
      }
      console.log(`加载地质信息成功: ${geo.unit}`)
    } else {
      console.warn(`未找到点 ${pointName || pointId} 的地质信息，使用默认数据`)
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
    stability: props.point?.level === '极高风险' ? '不稳定' : 
              (props.point?.level === '高风险' ? '基本稳定' : '稳定'),
    description: '宁镇山脉为古生代-中生代地层，构造线方向北东，是地质灾害重点监测区',
    fromCloud: false,
    confidence: undefined
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

// 监听 point 变化
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    await loadGeologyFromLocalFile()
  }
}, { immediate: true })
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
  color: #64748b;
  min-width: 70px;
  flex-shrink: 0;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  text-align: right;
  word-break: break-word;
  flex: 1;
}

.info-value.danger {
  color: #dc2626;
  font-weight: 600;
}

.confidence-tip {
  font-size: 10px;
  color: #94a3b8;
  font-weight: normal;
  margin-left: 4px;
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