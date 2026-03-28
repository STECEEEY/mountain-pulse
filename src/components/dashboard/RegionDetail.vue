<template>
  <div class="detail-card">
    <div class="card-header">
      <h3 class="card-title">区域详情</h3>
    </div>
    <div class="region-info">
      <div class="region-name">
        <span class="region-icon">REGION</span>
        <span>{{ selectedRegion.name || '暂无数据' }}</span>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">面积</span>
          <span class="info-value" v-if="selectedRegion.area >= 0"><AnimatedNumber :value="selectedRegion.area" :decimals="1" /> km²</span>
          <span class="info-value" v-else>暂无数据</span>
        </div>
        <div class="info-item">
          <span class="info-label">人口</span>
          <span class="info-value"><AnimatedNumber :value="1469" :decimals="1" /> 万</span>
        </div>
        <div class="info-item">
          <span class="info-label">风险点</span>
          <span class="info-value danger"><AnimatedNumber :value="selectedRegion.riskPoints" /> 处</span>
        </div>
        <div class="info-item">
          <span class="info-label">预警等级</span>
          <span class="info-value warning">{{ selectedRegion.warningLevel || '暂无数据' }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="selectedRiskPoint" class="selected-risk">
      <div class="risk-title">
        <span class="risk-icon">⚠️</span>
        <span>当前风险点：{{ selectedRiskPoint.name }}</span>
      </div>
      <div class="risk-detail">
        <span>威胁人口：{{ selectedRiskPoint.threat }}</span>
        <span>风险等级：{{ selectedRiskPoint.level }}</span>
      </div>
    </div>
    
    <div class="facilities-section">
      <h4>
        关键设施
        <span v-if="selectedRiskPoint" class="facility-tip">（{{ selectedRiskPoint.name }} 周边2km）</span>
        <span v-if="apiError" class="api-error-tip">⚠️ {{ apiError }}</span>
      </h4>
      <div v-if="loadingFacilities" class="loading-facility">
        <span>加载关键设施数据中...</span>
      </div>
      <div v-else-if="facilities.length > 0" class="facility-list">
        <div 
          v-for="facility in facilities" 
          :key="facility.id" 
          class="facility-item"
          @click="onFacilityClick(facility)"
        >
          <span class="facility-icon">{{ facility.icon }}</span>
          <div class="facility-info">
            <span class="facility-name">{{ facility.name }}</span>
            <span class="facility-detail">{{ facility.detail }}</span>
            <span class="facility-distance">距离: {{ facility.distance }}m</span>
          </div>
          <span class="facility-risk" :class="facility.riskClass">{{ facility.risk }}</span>
        </div>
      </div>
      <div v-else-if="!loadingFacilities && selectedRiskPoint" class="empty-facility">
        该风险点周边2km内暂无关键设施
      </div>
      <div v-else-if="!loadingFacilities" class="empty-facility">
        请点击地图上的风险点查看周边关键设施
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import { riskService } from '@/services/riskService'
import { normalizeRiskLevel } from '@/utils/riskLevel'
import type { CanonicalRiskLevel } from '@/utils/riskLevel'

// 高德地图配置
const AMAP_KEY = 'f327ec13024b397dba6cb28432442b58'  // 替换为你申请的 Key
const AMAP_SECURITY_CODE = '5480cc63aad861ec5e973decc75d6b17'  // 替换为你的安全密钥

interface Facility {
  id: string
  icon: string
  name: string
  detail: string
  risk: string
  riskClass: string
  distance: number
  lat: number
  lng: number
  type: string
}

interface RiskPoint {
  id: string
  name: string
  lat: number
  lng: number
  threat: string
  level: string
}

// 设施类型映射
const FACILITY_TYPES = [
  { type: '医院', keyword: '医院', icon: '🏥', priority: 1 },
  { type: '学校', keyword: '学校|小学|中学|大学', icon: '🏫', priority: 2 },
  { type: '消防站', keyword: '消防|消防队', icon: '🚒', priority: 3 },
  { type: '派出所', keyword: '派出所|公安局', icon: '👮', priority: 4 },
  { type: '应急避难所', keyword: '避难所|应急场所', icon: '🛡️', priority: 5 },
  { type: '加油站', keyword: '加油站', icon: '⛽', priority: 6 },
  { type: '化工厂', keyword: '化工|化工厂', icon: '🏭', priority: 7 },
  { type: '水库', keyword: '水库', icon: '💧', priority: 8 },
  { type: '交通枢纽', keyword: '车站|客运站|高铁站', icon: '🚉', priority: 9 },
  { type: '桥梁', keyword: '大桥|桥梁', icon: '🌉', priority: 10 },
]

const props = defineProps<{
  selectedRiskPoint?: RiskPoint | null
}>()

const emit = defineEmits<{
  (e: 'facilitiesUpdate', facilities: Facility[]): void
  (e: 'facilityClick', facility: { name: string; lat: number; lng: number; type: string }): void
}>()

const selectedRegion = ref({
  name: '',
  area: -1,
  population: -1,
  riskPoints: 0,
  warningLevel: '',
})

const facilities = ref<Facility[]>([])
const loadingFacilities = ref(false)
const apiError = ref('')

// 获取设施图标
const getFacilityIcon = (type: string): string => {
  const mapping: Record<string, string> = {
    '医院': '🏥',
    '学校': '🏫',
    '消防站': '🚒',
    '派出所': '👮',
    '应急避难所': '🛡️',
    '加油站': '⛽',
    '化工厂': '🏭',
    '水库': '💧',
    '交通枢纽': '🚉',
    '桥梁': '🌉'
  }
  return mapping[type] || '📍'
}

// 根据距离计算风险等级
const calculateRiskByDistance = (distance: number): { risk: string; riskClass: string } => {
  if (distance < 500) return { risk: '极高风险', riskClass: 'critical' }
  if (distance < 1000) return { risk: '高风险', riskClass: 'high' }
  if (distance < 2000) return { risk: '中风险', riskClass: 'medium' }
  return { risk: '低风险', riskClass: 'low' }
}

// 判断设施类型
const getFacilityType = (name: string, type: string): string => {
  const fullText = `${name} ${type}`
  for (const ft of FACILITY_TYPES) {
    const pattern = new RegExp(ft.keyword, 'i')
    if (pattern.test(fullText)) {
      return ft.type
    }
  }
  return '其他'
}

// 调用高德地图 API 搜索周边设施
const searchNearbyFacilities = async (lng: number, lat: number, radius: number = 5000) => {
  const results: Facility[] = []
  
  // 并发搜索多种类型的设施
  const searchPromises = FACILITY_TYPES.map(async (facilityType) => {
    try {
      const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${lng},${lat}&keywords=${encodeURIComponent(facilityType.keyword)}&radius=${radius}&types=&offset=20&page=1&output=JSON`
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.status === '1' && data.pois && data.pois.length > 0) {
        return data.pois.map((poi: any) => ({
          id: poi.id,
          name: poi.name,
          type: facilityType.type,
          icon: facilityType.icon,
          address: poi.address || '',
          distance: Math.round(poi.distance || 0),
          lat: parseFloat(poi.location.split(',')[1]),
          lng: parseFloat(poi.location.split(',')[0]),
          detail: poi.address || `${facilityType.type}设施`
        }))
      }
      return []
    } catch (error) {
      console.error(`搜索${facilityType.type}失败:`, error)
      return []
    }
  })
  
  const allResults = await Promise.all(searchPromises)
  
  // 合并所有结果
  for (const pois of allResults) {
    results.push(...pois)
  }
  
  // 去重（按名称和距离）
  const uniqueMap = new Map()
  for (const facility of results) {
    const key = `${facility.name}_${Math.round(facility.distance / 100)}`
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, facility)
    }
  }
  
  let uniqueResults = Array.from(uniqueMap.values())
  
  // 计算风险等级
  uniqueResults = uniqueResults.map(item => {
    const { risk, riskClass } = calculateRiskByDistance(item.distance)
    return { ...item, risk, riskClass }
  })
  
  // 按距离排序
  uniqueResults.sort((a, b) => a.distance - b.distance)
  
  // 限制最多返回 20 条
  return uniqueResults.slice(0, 20)
}

// 加载周边设施
const loadFacilities = async (riskPoint: RiskPoint) => {
  if (!riskPoint.lat || !riskPoint.lng) {
    console.warn('风险点缺少坐标')
    facilities.value = []
    emit('facilitiesUpdate', [])
    return
  }
  
  loadingFacilities.value = true
  apiError.value = ''
  
  try {
    console.log(`搜索周边设施: ${riskPoint.name} (${riskPoint.lng}, ${riskPoint.lat})`)
    
    const results = await searchNearbyFacilities(riskPoint.lng, riskPoint.lat, 2000)
    
    if (results.length > 0) {
      facilities.value = results
      emit('facilitiesUpdate', results)
      console.log(`找到 ${results.length} 个周边设施`)
    } else {
      facilities.value = []
      emit('facilitiesUpdate', [])
      console.log('周边2km内无关键设施')
    }
  } catch (error) {
    console.error('加载设施失败:', error)
    apiError.value = 'API调用失败，请检查网络'
    facilities.value = []
    emit('facilitiesUpdate', [])
  } finally {
    loadingFacilities.value = false
  }
}

// 本地模拟数据（作为 API 失败时的降级方案）
const loadMockFacilities = async (riskPoint: RiskPoint) => {
  loadingFacilities.value = true
  apiError.value = ''
  
  setTimeout(() => {
    const mockData: Facility[] = [
      {
        id: 'mock_1',
        icon: getFacilityIcon('医院'),
        name: '汤山街道卫生院',
        type: '医院',
        detail: '汤山街道汤泉路88号',
        risk: '',
        riskClass: '',
        distance: 450,
        lat: riskPoint.lat + 0.003,
        lng: riskPoint.lng - 0.002
      },
      {
        id: 'mock_2',
        icon: getFacilityIcon('学校'),
        name: '汤山中心小学',
        type: '学校',
        detail: '汤山街道汤泉路99号',
        risk: '',
        riskClass: '',
        distance: 680,
        lat: riskPoint.lat - 0.004,
        lng: riskPoint.lng + 0.001
      },
      {
        id: 'mock_3',
        icon: getFacilityIcon('派出所'),
        name: '汤山派出所',
        type: '派出所',
        detail: '汤山街道汤泉路66号',
        risk: '',
        riskClass: '',
        distance: 820,
        lat: riskPoint.lat + 0.001,
        lng: riskPoint.lng - 0.003
      },
      {
        id: 'mock_4',
        icon: getFacilityIcon('加油站'),
        name: '中国石化汤山加油站',
        type: '加油站',
        detail: 'G312国道汤山段',
        risk: '',
        riskClass: '',
        distance: 1250,
        lat: riskPoint.lat + 0.005,
        lng: riskPoint.lng + 0.004
      }
    ]
    
    const finalResult = mockData.map(item => {
      const { risk, riskClass } = calculateRiskByDistance(item.distance)
      return { ...item, risk, riskClass }
    })
    
    finalResult.sort((a, b) => a.distance - b.distance)
    
    facilities.value = finalResult
    emit('facilitiesUpdate', finalResult)
    loadingFacilities.value = false
    apiError.value = '使用模拟数据（API不可用）'
  }, 300)
}

const parseThreatPopulation = (value: string) => {
  const matched = value.match(/-?\d+(\.\d+)?/)
  if (!matched) return 0
  return Number(matched[0])
}

const loadRegion = async () => {
  try {
    const [config, pointsPayload] = await Promise.all([
      riskService.loadMapConfig(),
      riskService.loadRiskPoints(),
    ])

    const widthKm = Math.abs(config.bounds.east - config.bounds.west) * 95
    const heightKm = Math.abs(config.bounds.north - config.bounds.south) * 111
    const areaKm2 = widthKm * heightKm

    const rank: Record<CanonicalRiskLevel, number> = { 极高: 4, 高: 3, 中: 2, 低: 1, 未知: 0 }
    const maxLevel = pointsPayload.points.reduce<CanonicalRiskLevel>((current, point) => {
      const level = normalizeRiskLevel(point.level)
      return rank[level] > rank[current] ? level : current
    }, '未知')

    selectedRegion.value = {
      name: '宁镇山脉监测区',
      area: Number(areaKm2.toFixed(1)),
      population: 1469,
      riskPoints: pointsPayload.points.length,
      warningLevel: maxLevel === '未知' ? '' : `${maxLevel}预警`,
    }
  } catch (error) {
    console.error('加载区域数据失败:', error)
  }
}

// 监听选中的风险点变化
watch(() => props.selectedRiskPoint, async (newRiskPoint) => {
  if (newRiskPoint && newRiskPoint.lat && newRiskPoint.lng) {
    // 先尝试真实 API
    await loadFacilities(newRiskPoint)
    // 如果 API 失败且没有结果，可以使用模拟数据作为降级
    // if (facilities.value.length === 0 && !loadingFacilities.value) {
    //   await loadMockFacilities(newRiskPoint)
    // }
  } else {
    facilities.value = []
    emit('facilitiesUpdate', [])
    apiError.value = ''
  }
}, { immediate: true })

const onFacilityClick = (facility: Facility) => {
  emit('facilityClick', {
    name: facility.name,
    lat: facility.lat,
    lng: facility.lng,
    type: facility.icon
  })
}

onMounted(() => {
  loadRegion()
})
</script>

<style scoped>
/* 原有样式保持不变，添加以下新样式 */
.api-error-tip {
  font-size: 11px;
  color: #ffaa66;
  margin-left: 8px;
  font-weight: normal;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.facility-item:hover {
  background: rgba(0, 100, 150, 0.4);
  transform: translateX(4px);
}

/* 其他样式保持原样 */
.detail-card {
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 16px;
  margin-bottom: 16px;
}

.detail-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 8px 30px rgba(0, 200, 255, 0.15);
}

.card-header {
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #00f0ff;
}

.region-info {
  margin-bottom: 16px;
}

.region-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #e0f0ff;
  margin-bottom: 12px;
}

.region-icon {
  font-size: 10px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  border-radius: 8px;
  padding: 3px 7px;
  color: #9ad4f2;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  background: rgba(0, 30, 50, 0.6);
  border-radius: 8px;
  padding: 10px;
}

.info-label {
  display: block;
  font-size: 11px;
  color: #88a0b0;
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #e0f0ff;
}

.info-value.danger {
  color: #ff4444;
}

.info-value.warning {
  color: #ffaa00;
}

.selected-risk {
  background: rgba(255, 100, 0, 0.15);
  border-left: 3px solid #ffaa00;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 16px;
}

.risk-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #ffaa00;
  margin-bottom: 6px;
}

.risk-icon {
  font-size: 14px;
}

.risk-detail {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #a0c0d0;
}

.facilities-section {
  border-top: 1px solid rgba(0, 150, 255, 0.1);
  padding-top: 16px;
}

.facilities-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #a0d0ff;
}

.facility-tip {
  font-size: 11px;
  color: #88a0b0;
  font-weight: normal;
}

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.facility-icon {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  background: rgba(0, 76, 112, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.facility-info {
  flex: 1;
}

.facility-name {
  display: block;
  font-size: 13px;
  color: #e0f0ff;
}

.facility-detail {
  display: block;
  font-size: 11px;
  color: #88a0b0;
}

.facility-distance {
  display: block;
  font-size: 10px;
  color: #66c0ff;
  margin-top: 2px;
}

.facility-risk {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.facility-risk.critical {
  background: rgba(255, 0, 0, 0.3);
  color: #ff6666;
}

.facility-risk.high {
  background: rgba(255, 68, 68, 0.2);
  color: #ff8888;
}

.facility-risk.medium {
  background: rgba(255, 204, 68, 0.2);
  color: #ffcc88;
}

.facility-risk.low {
  background: rgba(100, 200, 100, 0.2);
  color: #88ff88;
}

.empty-facility, .loading-facility {
  color: #88a0b0;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

.facility-list::-webkit-scrollbar {
  width: 4px;
}

.facility-list::-webkit-scrollbar-track {
  background: rgba(0, 50, 70, 0.5);
  border-radius: 4px;
}

.facility-list::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.5);
  border-radius: 4px;
}
</style>
