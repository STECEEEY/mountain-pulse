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
          <span class="info-value">地质云 + 本地监测</span>
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
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">地质单元</span>
          <span class="info-value">{{ geologyData.unit || '暂无' }}</span>
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
        <div class="info-row">
          <span class="info-label">稳定性</span>
          <span class="info-value" :class="{ danger: geologyData.stability === '不稳定' }">
            {{ geologyData.stability || (point?.level ? `${point.level}风险` : '暂无') }}
          </span>
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
import { ElMessage } from 'element-plus'

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

// 地质云配置
const GEOLOGY_CLOUD_CONFIG = {
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2ZGY2NGJhOS1mOTVkLTQxYTctYWE5Zi05MzNhMDlkNTc0Y2EifQ.EyhGVC8iqgZRuUrcABDv2JYgZbv4MbAqIOLQIN7EvPo',
  wmsUrl: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg50w_20210416_F7qGy9A7/MapServer/WMSServer',
  layerName: 't0'
}

// 地质数据响应式变量
const geologyData = ref({
  unit: '',
  lithology: '',
  structure: '',
  scale: '',
  stability: ''
})

// 最后更新时间
const lastUpdateTime = computed(() => {
  return new Date().toLocaleString('zh-CN')
})

// 从地质云获取地质信息
async function fetchGeologyFromCloud(lng: number, lat: number) {
  if (!lng || !lat) {
    console.warn('缺少经纬度坐标，无法查询地质云')
    return null
  }

  try {
    // 宁镇山脉区域范围
    const bbox = '118.5,31.5,119.5,32.5'
    const width = 1000
    const height = 1000
    
    // 计算像素坐标
    const x = ((lng - 118.5) / (119.5 - 118.5)) * width
    const y = height - ((lat - 31.5) / (32.5 - 31.5)) * height

    const params = new URLSearchParams({
      service: 'WMS',
      request: 'GetFeatureInfo',
      version: '1.1.1',
      layers: GEOLOGY_CLOUD_CONFIG.layerName,
      query_layers: GEOLOGY_CLOUD_CONFIG.layerName,
      info_format: 'application/json',
      x: Math.floor(x).toString(),
      y: Math.floor(y).toString(),
      width: width.toString(),
      height: height.toString(),
      srs: 'EPSG:4326',
      bbox: bbox,
      tk: GEOLOGY_CLOUD_CONFIG.token
    })

    const url = `/geology-cloud/igs/rest/ogc/qg50w_20210416_F7qGy9A7/MapServer/WMSServer?${params.toString()}`
    
    const response = await fetch(url)
    const data = await response.json()
    
    if (data && data.features && data.features.length > 0) {
      const featureProps = data.features[0].properties
      
      return {
        unit: featureProps['地质单元'] || featureProps['地质名称'] || '',
        lithology: extractLithology(featureProps),
        structure: extractStructure(featureProps),
        scale: featureProps['规模'] || '',
        stability: evaluateStability(featureProps)
      }
    }
    
    return null
  } catch (error) {
    console.error('获取地质云数据失败:', error)
    return null
  }
}

// 提取岩性
function extractLithology(featureProps: any): string {
  if (featureProps['岩性']) return featureProps['岩性']
  if (featureProps['描述']) {
    const desc = featureProps['描述']
    const keywords = ['砂岩', '泥岩', '灰岩', '页岩', '花岗岩', '闪长岩', '玄武岩']
    for (const kw of keywords) {
      if (desc.includes(kw)) return kw
    }
  }
  return ''
}

// 提取构造
function extractStructure(featureProps: any): string {
  if (featureProps['构造']) return featureProps['构造']
  if (featureProps['描述']) {
    const desc = featureProps['描述']
    const keywords = ['节理', '裂隙', '断层', '褶皱', '顺向坡']
    for (const kw of keywords) {
      if (desc.includes(kw)) return kw
    }
  }
  return ''
}

// 评估稳定性
function evaluateStability(featureProps: any): string {
  if (featureProps['稳定性']) return featureProps['稳定性']
  const desc = (featureProps['描述'] || '').toLowerCase()
  if (desc.includes('不稳定') || desc.includes('崩塌') || desc.includes('滑坡')) {
    return '不稳定'
  } else if (desc.includes('基本稳定')) {
    return '基本稳定'
  } else if (desc.includes('稳定')) {
    return '稳定'
  }
  return '待评估'
}

// 加载地质信息
async function loadGeologyInfo() {
  if (!props.point) {
    return
  }
  
  const lng = props.point.lng
  const lat = props.point.lat
  
  // 如果有经纬度，从地质云获取
  if (lng && lat) {
    const cloudData = await fetchGeologyFromCloud(lng, lat)
    if (cloudData) {
      geologyData.value = cloudData
      return
    }
  }
  
  // 降级使用本地数据
  geologyData.value = {
    unit: '宁镇山脉褶皱带',
    lithology: '砂岩、页岩、灰岩',
    structure: '北东向褶皱，节理发育',
    scale: '区域尺度',
    stability: props.point?.level === '高' ? '不稳定' : '基本稳定'
  }
}

// 监听 point 变化
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    await loadGeologyInfo()
  }
}, { immediate: true })
</script>

<style scoped>
.point-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
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
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.info-value.danger {
  color: #dc2626;
  font-weight: 600;
}

.disaster-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disaster-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
}

.disaster-date {
  color: #3b82f6;
  font-weight: 600;
  white-space: nowrap;
}

.disaster-desc {
  color: #64748b;
  line-height: 1.4;
}

.empty-history {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
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