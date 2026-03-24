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
            <span v-if="geologyData.fromCloud" style="color: #3b82f6;">✓ 地质云</span>
            <span v-else style="color: #f59e0b;">⚠ 本地数据</span>
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
        <span>正在从地质云获取数据...</span>
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
        <div class="info-row">
          <span class="info-label">稳定性</span>
          <span class="info-value" :class="{ danger: geologyData.stability === '不稳定' }">
            {{ geologyData.stability || (point?.level ? `${point.level}风险` : '暂无') }}
          </span>
        </div>
        <div class="info-row" v-if="geologyData.description">
          <span class="info-label">详细描述</span>
          <span class="info-value">{{ geologyData.description }}</span>
        </div>
      </div>
      <div v-if="!geologyData.fromCloud && !geologyLoading && point?.lng && point?.lat" class="retry-tip">
        <span>⚠️ 地质云连接失败，正在使用本地数据</span>
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
  baseUrl: '/geology-cloud/igs/rest/ogc/qg50w_20210416_F7qGy9A7/MapServer',
  layerName: 't0'
}

// 地质数据响应式变量
const geologyData = ref({
  unit: '',
  code: '',
  lithology: '',
  structure: '',
  scale: '',
  stability: '',
  description: '',
  fromCloud: false
})

const geologyLoading = ref(false)

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

  geologyLoading.value = true

  try {
    // 宁镇山脉区域范围
    const bounds = {
      minLng: 118.0,
      maxLng: 119.5,
      minLat: 31.5,
      maxLat: 32.5
    }
    
    // 检查点是否在范围内
    if (lng < bounds.minLng || lng > bounds.maxLng || 
        lat < bounds.minLat || lat > bounds.maxLat) {
      console.warn(`点坐标(${lng}, ${lat})不在宁镇山脉范围内`)
      return null
    }
    
    const width = 1000
    const height = 1000
    
    // 计算像素坐标
    let x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width
    let y = height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height
    
    // 边界保护
    x = Math.max(0, Math.min(width - 1, x))
    y = Math.max(0, Math.min(height - 1, y))
    
    const xInt = Math.floor(x)
    const yInt = Math.floor(y)
    
    // 构建请求参数
    const params = new URLSearchParams({
      service: 'WMS',
      request: 'GetFeatureInfo',
      version: '1.1.1',
      layers: GEOLOGY_CLOUD_CONFIG.layerName,
      query_layers: GEOLOGY_CLOUD_CONFIG.layerName,
      info_format: 'application/json',
      x: xInt.toString(),
      y: yInt.toString(),
      width: width.toString(),
      height: height.toString(),
      srs: 'EPSG:4326',
      bbox: `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`,
      tk: GEOLOGY_CLOUD_CONFIG.token
    })
    
    // 使用代理路径
    const url = `${GEOLOGY_CLOUD_CONFIG.baseUrl}/WMSServer?${params.toString()}`
    
    console.log('========== 地质云请求详情 ==========')
    console.log('请求URL:', url)
    console.log('点坐标:', { lng, lat })
    console.log('像素坐标:', { x: xInt, y: yInt })
    console.log('边界范围:', bounds)
    console.log('===================================')
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    console.log('响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const text = await response.text()
    console.log('原始响应内容长度:', text.length)
    console.log('响应前500字符:', text.substring(0, 500))
    
    // 检查返回的是否是HTML
    if (text.trim().startsWith('<')) {
      console.error('返回的是HTML页面，可能Token失效或服务不可用')
      throw new Error('服务返回HTML页面，请检查Token是否有效')
    }
    
    // 尝试解析JSON
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error('JSON解析失败:', e)
      throw new Error('响应不是有效的JSON格式')
    }
    
    console.log('解析后的数据:', data)
    
    if (data && data.features && data.features.length > 0) {
      const featureProps = data.features[0].properties
      console.log('地质属性:', featureProps)
      
      return {
        unit: featureProps['地质单元'] || featureProps['地质名称'] || '',
        code: featureProps['地质代号'] || '',
        lithology: extractLithology(featureProps),
        structure: extractStructure(featureProps),
        scale: featureProps['规模'] || '',
        stability: evaluateStability(featureProps),
        description: featureProps['描述'] || '',
        fromCloud: true
      }
    }
    
    console.warn('未找到地质信息')
    return null
  } catch (error) {
    console.error('获取地质云数据失败:', error)
    ElMessage.error(`地质云查询失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return null
  } finally {
    geologyLoading.value = false
  }
}

// 提取岩性
function extractLithology(featureProps: any): string {
  if (featureProps['岩性']) return featureProps['岩性']
  if (featureProps['描述']) {
    const desc = featureProps['描述']
    const keywords = ['砂岩', '泥岩', '灰岩', '页岩', '花岗岩', '闪长岩', '玄武岩', '白云岩', '石英岩']
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
    const keywords = ['节理', '裂隙', '断层', '褶皱', '顺向坡', '逆向坡', '单斜']
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
  if (desc.includes('不稳定') || desc.includes('崩塌') || desc.includes('滑坡') || desc.includes('易滑')) {
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
  console.log('使用本地地质数据')
  geologyData.value = {
    unit: '宁镇山脉褶皱带',
    code: 'Pz',
    lithology: '砂岩、页岩、灰岩',
    structure: '北东向褶皱，节理发育',
    scale: '区域尺度',
    stability: props.point?.level === '高' ? '不稳定' : (props.point?.level === '中' ? '基本稳定' : '稳定'),
    description: '该区域为古生代地层，岩性以碎屑岩和碳酸盐岩为主，构造活动中等',
    fromCloud: false
  }
}

// 重试
async function retryFetch() {
  if (props.point?.lng && props.point?.lat) {
    ElMessage.info('正在重试连接地质云...')
    await loadGeologyInfo()
    if (geologyData.value.fromCloud) {
      ElMessage.success('成功连接到地质云！')
    } else {
      ElMessage.warning('仍然无法连接地质云，请检查网络或Token')
    }
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