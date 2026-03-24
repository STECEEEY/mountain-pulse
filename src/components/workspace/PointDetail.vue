<template>
  <div class="point-detail">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在获取地质信息...</span>
    </div>

    <template v-else>
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
            <span class="info-value">{{ point?.monitor_start || '-' }}</span>
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
            <span class="info-value">实时</span>
          </div>
        </div>
      </div>

      <!-- 地质信息（从地质云获取） -->
      <div class="info-section">
        <h4>地质特征 <span class="data-source" v-if="geologyData.fromCloud">(数据来源: 地质云)</span></h4>
        <div class="info-grid">
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
          <div class="info-row">
            <span class="info-label">稳定性</span>
            <span class="info-value" :class="{ danger: geologyData.stability === '不稳定' }">
              {{ geologyData.stability || point?.level ? `${point.level}风险` : '暂无' }}
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
        <div class="empty-history" v-if="!disasterHistory.length">暂无历史记录</div>
        <div class="disaster-list" v-else>
          <div class="disaster-item" v-for="item in disasterHistory" :key="item.date">
            <div class="disaster-date">{{ item.date }}</div>
            <div class="disaster-desc">{{ item.description }}</div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button type="primary" :icon="Download" @click="exportData">导出数据</el-button>
        <el-button :icon="Printer" @click="printReport">打印报告</el-button>
        <el-button :icon="Share" @click="shareInfo">分享</el-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Download, Printer, Share, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 地质云配置
const GEOLOGY_CLOUD_CONFIG = {
  // 你的token
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI2ZGY2NGJhOS1mOTVkLTQxYTctYWE5Zi05MzNhMDlkNTc0Y2EifQ.EyhGVC8iqgZRuUrcABDv2JYgZbv4MbAqIOLQIN7EvPo',
  // WMS GetFeatureInfo 服务地址
  wmsUrl: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg50w_20210416_F7qGy9A7/MapServer/WMSServer',
  // 图层名称
  layerName: 't0'
}

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
    monitor_start?: string
  } | null
}>()

// 状态
const loading = ref(false)
const geologyData = ref({
  unit: '',           // 地质单元
  code: '',           // 地质代号
  lithology: '',      // 岩性
  structure: '',      // 构造
  scale: '',          // 规模
  stability: '',      // 稳定性
  description: '',    // 详细描述
  fromCloud: false    // 是否从地质云获取
})
const disasterHistory = ref<Array<{ date: string; description: string }>>([])

// 最后更新时间
const lastUpdateTime = computed(() => {
  return new Date().toLocaleString('zh-CN')
})

/**
 * 从地质云获取指定坐标的地质信息
 * @param lng 经度
 * @param lat 纬度
 */
async function fetchGeologyFromCloud(lng: number, lat: number) {
  if (!lng || !lat) {
    console.warn('缺少经纬度坐标，无法查询地质云')
    return null
  }

  loading.value = true

  try {
    // 构造 GetFeatureInfo 请求参数
    // 注意：需要获取当前地图视图范围，这里使用一个较大的默认范围（宁镇山脉区域）
    const bbox = '118.5,31.5,119.5,32.5' // 经度范围,纬度范围
    const width = 1000
    const height = 1000
    
    // 将经纬度转换为像素坐标（近似计算）
    // 实际使用时，应该根据地图当前视图精确计算
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

    const url = `${GEOLOGY_CLOUD_CONFIG.wmsUrl}?${params.toString()}`
    
    console.log('请求地质云:', url)
    
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('地质云返回数据:', data)
    
    // 解析返回的数据
    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0]
      const props = feature.properties
      
      return {
        unit: props['地质单元'] || props['地质名称'] || '',
        code: props['地质代号'] || '',
        lithology: extractLithology(props),
        structure: props['构造'] || extractStructure(props),
        scale: props['规模'] || '',
        stability: evaluateStability(props),
        description: props['描述'] || props['岩性描述'] || '',
        fromCloud: true
      }
    }
    
    return null
  } catch (error) {
    console.error('获取地质云数据失败:', error)
    ElMessage.warning('地质云服务请求失败，使用本地数据')
    return null
  } finally {
    loading.value = false
  }
}

/**
 * 从属性中提取岩性信息
 */
function extractLithology(props: any): string {
  if (props['岩性']) return props['岩性']
  if (props['描述']) {
    const desc = props['描述']
    // 尝试从描述中提取岩性关键词
    const lithologyKeywords = ['砂岩', '泥岩', '灰岩', '页岩', '花岗岩', '闪长岩', '玄武岩']
    for (const keyword of lithologyKeywords) {
      if (desc.includes(keyword)) return keyword
    }
  }
  return ''
}

/**
 * 从属性中提取构造信息
 */
function extractStructure(props: any): string {
  if (props['构造']) return props['构造']
  if (props['描述']) {
    const desc = props['描述']
    const structureKeywords = ['节理', '裂隙', '断层', '褶皱', '顺向坡', '逆向坡']
    for (const keyword of structureKeywords) {
      if (desc.includes(keyword)) return keyword
    }
  }
  return ''
}

/**
 * 评估稳定性
 */
function evaluateStability(props: any): string {
  if (props['稳定性']) return props['稳定性']
  
  const desc = (props['描述'] || '').toLowerCase()
  
  if (desc.includes('不稳定') || desc.includes('崩塌') || desc.includes('滑坡')) {
    return '不稳定'
  } else if (desc.includes('基本稳定')) {
    return '基本稳定'
  } else if (desc.includes('稳定')) {
    return '稳定'
  }
  
  return '待评估'
}

/**
 * 加载完整的地质信息
 */
async function loadGeologyInfo() {
  if (!props.point?.lng || !props.point?.lat) {
    // 没有经纬度时使用模拟数据
    geologyData.value = {
      unit: '宁镇山脉褶皱带',
      code: 'Pz',
      lithology: '砂岩、页岩、灰岩',
      structure: '北东向褶皱，节理发育',
      scale: '区域尺度',
      stability: props.point?.level === '高' ? '不稳定' : '基本稳定',
      description: '该区域为古生代地层，岩性以碎屑岩和碳酸盐岩为主，构造活动中等',
      fromCloud: false
    }
    return
  }
  
  // 从地质云获取数据
  const cloudData = await fetchGeologyFromCloud(props.point.lng, props.point.lat)
  
  if (cloudData) {
    geologyData.value = cloudData as any
  } else {
    // 降级使用本地数据
    geologyData.value = {
      unit: '宁镇山脉褶皱带',
      code: 'Pz',
      lithology: '砂岩、页岩、灰岩',
      structure: '北东向褶皱，节理发育',
      scale: '区域尺度',
      stability: props.point?.level === '高' ? '不稳定' : '基本稳定',
      description: '该区域为古生代地层，岩性以碎屑岩和碳酸盐岩为主，构造活动中等',
      fromCloud: false
    }
  }
}

/**
 * 加载历史灾害记录（模拟数据，后续可对接真实API）
 */
async function loadDisasterHistory() {
  // 这里可以对接你的历史灾害数据API
  disasterHistory.value = [
    // 示例数据
    // { date: '2023-08-15', description: '小型滑坡，无人员伤亡' },
    // { date: '2022-07-20', description: '局部崩塌，道路中断2小时' }
  ]
}

// 导出数据
function exportData() {
  const exportContent = {
    point: props.point,
    geology: geologyData.value,
    disasterHistory: disasterHistory.value,
    exportTime: new Date().toISOString()
  }
  
  const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `监测点_${props.point?.id || 'unknown'}_数据.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('数据导出成功')
}

// 打印报告
function printReport() {
  window.print()
}

// 分享信息
function shareInfo() {
  const shareText = `【灾害监测点】${props.point?.name || '监测点'}\n位置: ${props.point?.lng?.toFixed(4)}, ${props.point?.lat?.toFixed(4)}\n地质单元: ${geologyData.value.unit}\n岩性: ${geologyData.value.lithology}\n稳定性: ${geologyData.value.stability}`
  
  if (navigator.share) {
    navigator.share({
      title: '灾害监测点信息',
      text: shareText
    })
  } else {
    navigator.clipboard.writeText(shareText)
    ElMessage.success('信息已复制到剪贴板')
  }
}

// 监听point变化，重新加载地质信息
watch(() => props.point, async (newPoint) => {
  if (newPoint) {
    await loadGeologyInfo()
    await loadDisasterHistory()
  }
}, { immediate: true, deep: true })
</script>

<style scoped>
.point-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: #64748b;
}

.loading-state .el-icon {
  font-size: 32px;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
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

.data-source {
  font-size: 11px;
  font-weight: normal;
  color: #3b82f6;
  margin-left: 8px;
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