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
        <span v-if="selectedRiskPoint" class="facility-tip">（{{ selectedRiskPoint.name }} 周边5km）</span>
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
const AMAP_KEY = 'd8af8724a9dd15ca3f117b7d0adaab8a'

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

// 关键设施类型关键词（医院、学校、政府、应急设施等）
const IMPORTANT_KEYWORDS = [
  '医院', '卫生院', '诊所', '医疗',
  '学校', '小学', '中学', '幼儿园', '大学',
  '村委会', '村委', '镇政府', '街道办事处', '政府',
  '派出所', '公安局', '警务站',
  '消防', '消防站', '应急', '避难所',
  '加油站',
  '超市', '商店',
  '公交站', '车站', '交通枢纽'
]

// 根据 POI 类型获取图标
const getFacilityIcon = (type: string, name: string): string => {
  const lowerName = name.toLowerCase()
  const lowerType = type.toLowerCase()
  
  if (lowerName.includes('医院') || lowerType.includes('医院') || lowerType.includes('诊所')) return '🏥'
  if (lowerName.includes('学校') || lowerName.includes('小学') || lowerName.includes('中学') || lowerType.includes('学校')) return '🏫'
  if (lowerName.includes('村委会') || lowerName.includes('村委')) return '🏛️'
  if (lowerName.includes('政府') || lowerName.includes('镇') || lowerType.includes('政府')) return '🏢'
  if (lowerName.includes('派出所') || lowerName.includes('公安')) return '👮'
  if (lowerName.includes('消防') || lowerName.includes('应急')) return '🚒'
  if (lowerName.includes('加油站') || lowerType.includes('加油')) return '⛽'
  if (lowerName.includes('超市') || lowerName.includes('商店') || lowerName.includes('便利店')) return '🏪'
  if (lowerName.includes('公交') || lowerName.includes('车站')) return '🚏'
  if (lowerName.includes('银行') || lowerName.includes('信用社')) return '🏦'
  
  return '📍'
}

// 根据距离计算风险等级
const calculateRiskByDistance = (distance: number): { risk: string; riskClass: string } => {
  if (distance < 500) return { risk: '极高风险', riskClass: 'critical' }
  if (distance < 1000) return { risk: '高风险', riskClass: 'high' }
  if (distance < 2000) return { risk: '中风险', riskClass: 'medium' }
  return { risk: '低风险', riskClass: 'low' }
}

// 调用高德地图 API 搜索周边设施
const searchNearbyFacilities = async (lng: number, lat: number, radius: number = 2000) => {
  try {
    const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${lng},${lat}&radius=${radius}&offset=50&page=1&output=JSON`
    
    console.log('🔍 搜索周边设施:', url)
    const response = await fetch(url)
    const data = await response.json()
    
    console.log('📡 API 返回数据:', data)
    
    if (data.status === '1' && data.pois && data.pois.length > 0) {
      console.log(`✅ 找到 ${data.pois.length} 个 POI`)
      
      const results: Facility[] = []
      const seenNames = new Set()
      
      for (const poi of data.pois) {
        // 检查是否是关键设施
        const isImportant = IMPORTANT_KEYWORDS.some(kw => 
          poi.name.includes(kw) || poi.type.includes(kw)
        )
        
        // 只保留关键设施
        if (!isImportant) continue
        
        if (seenNames.has(poi.name)) continue
        seenNames.add(poi.name)
        
        const distance = Math.round(poi.distance || 0)
        const { risk, riskClass } = calculateRiskByDistance(distance)
        
        if (distance <= radius) {
          results.push({
            id: poi.id,
            name: poi.name,
            type: poi.type.split(';')[0] || '其他',
            icon: getFacilityIcon(poi.type, poi.name),
            detail: poi.address || `${poi.name}`,
            distance: distance,
            lat: parseFloat(poi.location.split(',')[1]),
            lng: parseFloat(poi.location.split(',')[0]),
            risk: risk,
            riskClass: riskClass
          })
        }
      }
      
      console.log(`📋 过滤后关键设施: ${results.length} 个`)
      
      // 按距离排序
      results.sort((a, b) => a.distance - b.distance)
      
      return results.slice(0, 15)
    } else {
      console.log('⚠️ API 返回无数据, status:', data.status, 'info:', data.info)
      return []
    }
  } catch (error) {
    console.error('❌ 搜索设施失败:', error)
    return []
  }
}

// 加载周边设施
const loadFacilities = async (riskPoint: RiskPoint) => {
  if (!riskPoint.lat || !riskPoint.lng) {
    console.warn('⚠️ 风险点缺少坐标')
    facilities.value = []
    emit('facilitiesUpdate', [])
    return
  }
  
  loadingFacilities.value = true
  apiError.value = ''
  
  try {
    console.log(`🔍 搜索周边设施: ${riskPoint.name} (经度: ${riskPoint.lng}, 纬度: ${riskPoint.lat})`)
    
    const results = await searchNearbyFacilities(riskPoint.lng, riskPoint.lat, 5000)
    
    if (results.length > 0) {
      facilities.value = results
      emit('facilitiesUpdate', results)
      console.log(`✅ 显示 ${results.length} 个关键设施:`, results.map(f => `${f.name}(${f.distance}m)`))
    } else {
      facilities.value = []
      emit('facilitiesUpdate', [])
      apiError.value = '周边2km内暂无关键设施'
      console.log('⚠️ 周边2km内暂无关键设施')
    }
  } catch (error) {
    console.error('❌ 加载设施失败:', error)
    apiError.value = '加载失败，请重试'
    facilities.value = []
    emit('facilitiesUpdate', [])
  } finally {
    loadingFacilities.value = false
  }
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
  console.log('📍 selectedRiskPoint 变化:', newRiskPoint)
  if (newRiskPoint && newRiskPoint.lat && newRiskPoint.lng) {
    console.log('✅ 有坐标，开始加载设施...')
    await loadFacilities(newRiskPoint)
  } else {
    console.log('⚠️ 无风险点或无坐标')
    facilities.value = []
    emit('facilitiesUpdate', [])
    apiError.value = ''
  }
}, { immediate: true, deep: true })

const onFacilityClick = (facility: Facility) => {
  console.log('点击设施:', facility.name)
  emit('facilityClick', {
    name: facility.name,
    lat: facility.lat,
    lng: facility.lng,
    type: facility.icon
  })
}

onMounted(() => {
  console.log('关键设施组件已挂载')
  loadRegion()
})
</script>

<style scoped>
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

.api-error-tip {
  font-size: 11px;
  color: #ffaa66;
  margin-left: 8px;
  font-weight: normal;
}

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
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
