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
      <h4>关键设施</h4>
      
      <!-- 未选择风险点时显示提示 -->
      <div v-if="!selectedRiskPoint" class="facility-placeholder">
        <div class="placeholder-icon">📍</div>
        <div class="placeholder-text">请点击地图上的风险点</div>
        <div class="placeholder-sub">查看周边5km范围内的关键设施</div>
      </div>
      
      <!-- 已选择风险点，加载中 -->
      <div v-else-if="loadingFacilities" class="loading-facility">
        <div class="loading-spinner"></div>
        <div>正在搜索 {{ selectedRiskPoint.name }} 周边关键设施...</div>
      </div>
      
      <!-- 已选择风险点，有设施数据 -->
      <div v-else-if="facilities.length > 0" class="facility-list-wrapper">
        <div class="facility-header">
          <span>{{ selectedRiskPoint.name }} 周边5km关键设施</span>
          <span class="facility-count">共 {{ facilities.length }} 个</span>
        </div>
        <div class="facility-list">
          <div 
            v-for="facility in facilities" 
            :key="facility.id" 
            class="facility-item"
            @click="onFacilityClick(facility)"
          >
            <span class="facility-icon">{{ facility.icon }}</span>
            <div class="facility-info">
              <div class="facility-name-row">
                <span class="facility-name">{{ facility.name }}</span>
                <span class="facility-type" :class="facility.category">{{ facility.typeName }}</span>
              </div>
              <span class="facility-detail">{{ facility.detail }}</span>
              <span class="facility-distance">距离: {{ facility.distance }}m</span>
            </div>
            <span class="facility-risk" :class="facility.riskClass">{{ facility.risk }}</span>
          </div>
        </div>
      </div>
      
      <!-- 已选择风险点，无设施数据 -->
      <div v-else class="empty-facility">
        <div class="empty-icon">🏗️</div>
        <div class="empty-text">该风险点周边5km内暂无关键设施</div>
        <div class="empty-sub">请尝试选择其他风险点</div>
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
  typeName: string
  detail: string
  risk: string
  riskClass: string
  distance: number
  lat: number
  lng: number
  type: string
  category: 'public' | 'life'
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

// 公共设施关键词
const PUBLIC_KEYWORDS = [
  '医院', '卫生院', '诊所', '医疗',
  '学校', '小学', '中学', '幼儿园', '大学',
  '村委会', '村委', '镇政府', '街道办事处', '政府', '党群服务中心',
  '派出所', '公安局', '警务站',
  '消防', '消防站', '应急', '避难所',
  '邮局', '邮政',
  '养老院', '居家养老',
  '便民服务中心', '服务中心',
  '社区', '居委会'
]

// 根据 POI 类型获取图标
const getFacilityIcon = (type: string, name: string, category: string): string => {
  const lowerName = name.toLowerCase()
  const lowerType = type.toLowerCase()
  
  if (lowerName.includes('医院') || lowerType.includes('医院')) return '🏥'
  if (lowerName.includes('学校') || lowerName.includes('小学') || lowerName.includes('中学')) return '🏫'
  if (lowerName.includes('村委会') || lowerName.includes('村委')) return '🏛️'
  if (lowerName.includes('政府') || lowerName.includes('镇')) return '🏢'
  if (lowerName.includes('派出所') || lowerName.includes('公安')) return '👮'
  if (lowerName.includes('消防') || lowerName.includes('应急')) return '🚒'
  if (lowerName.includes('邮局') || lowerName.includes('邮政')) return '📮'
  if (lowerName.includes('养老') || lowerName.includes('居家')) return '👴'
  if (lowerName.includes('服务中心')) return '🏪'
  if (lowerName.includes('社区') || lowerName.includes('居委会')) return '🏘️'
  if (lowerName.includes('加油站')) return '⛽'
  if (lowerName.includes('超市') || lowerName.includes('商店') || lowerName.includes('便利店')) return '🏪'
  if (lowerName.includes('药店') || lowerName.includes('药房')) return '💊'
  if (lowerName.includes('银行') || lowerName.includes('信用社')) return '🏦'
  if (lowerName.includes('公交') || lowerName.includes('车站')) return '🚏'
  if (lowerName.includes('餐饮') || lowerName.includes('饭店') || lowerName.includes('餐厅')) return '🍽️'
  
  return '📍'
}

// 判断设施类别
const getFacilityCategory = (name: string, type: string): 'public' | 'life' => {
  const fullText = `${name} ${type}`
  for (const kw of PUBLIC_KEYWORDS) {
    if (fullText.includes(kw)) return 'public'
  }
  return 'life'
}

// 获取设施类型名称
const getTypeName = (poi: any, category: string): string => {
  if (category === 'public') {
    const name = poi.name
    const type = poi.type
    if (name.includes('医院') || type.includes('医院')) return '医院'
    if (name.includes('卫生院')) return '卫生院'
    if (name.includes('学校') || name.includes('小学') || name.includes('中学')) return '学校'
    if (name.includes('幼儿园')) return '幼儿园'
    if (name.includes('村委会') || name.includes('村委')) return '村委会'
    if (name.includes('政府') || name.includes('镇政府')) return '政府机构'
    if (name.includes('派出所') || name.includes('公安')) return '派出所'
    if (name.includes('消防')) return '消防站'
    if (name.includes('邮局') || name.includes('邮政')) return '邮局'
    if (name.includes('养老')) return '养老院'
    if (name.includes('服务中心')) return '服务中心'
    if (name.includes('社区')) return '社区服务中心'
    return '公共设施'
  }
  
  const name = poi.name
  const type = poi.type
  if (name.includes('加油站') || type.includes('加油')) return '加油站'
  if (name.includes('超市') || name.includes('商店') || name.includes('便利店')) return '超市/商店'
  if (name.includes('药店') || name.includes('药房')) return '药店'
  if (name.includes('银行') || type.includes('银行')) return '银行'
  if (name.includes('公交') || name.includes('车站')) return '公交站'
  if (name.includes('餐饮') || name.includes('饭店') || name.includes('餐厅')) return '餐饮'
  return '生活服务'
}

// 获取设施详情描述
const getFacilityDetail = (poi: any, category: string): string => {
  if (category === 'public') {
    return poi.address || '公共设施'
  }
  return poi.address || '生活服务'
}

// 根据距离计算风险等级
const calculateRiskByDistance = (distance: number): { risk: string; riskClass: string } => {
  if (distance < 500) return { risk: '极高风险', riskClass: 'critical' }
  if (distance < 1000) return { risk: '高风险', riskClass: 'high' }
  if (distance < 2000) return { risk: '中风险', riskClass: 'medium' }
  return { risk: '低风险', riskClass: 'low' }
}

// 使用 JSONP 方式调用高德地图 API
const searchNearbyFacilities = async (lng: number, lat: number, radius: number = 5000) => {
  return new Promise<Facility[]>((resolve, reject) => {
    try {
      const callbackName = `AMAP_CALLBACK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const script = document.createElement('script')
      const url = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${lng},${lat}&radius=${radius}&offset=50&page=1&output=JSON&callback=${callbackName}`
      
      ;(window as any)[callbackName] = (data: any) => {
        console.log('📡 高德API返回数据:', data)
        
        delete (window as any)[callbackName]
        document.body.removeChild(script)
        
        if (data.status === '1' && data.pois && data.pois.length > 0) {
          console.log(`✅ 找到 ${data.pois.length} 个 POI`)
          
          const publicResults: Facility[] = []
          const lifeResults: Facility[] = []
          const seenNames = new Set()
          
          for (const poi of data.pois) {
            if (seenNames.has(poi.name)) continue
            seenNames.add(poi.name)
            
            const category = getFacilityCategory(poi.name, poi.type)
            const distance = Math.round(poi.distance || 0)
            const { risk, riskClass } = calculateRiskByDistance(distance)
            
            if (distance <= radius) {
              const facility: Facility = {
                id: poi.id,
                name: poi.name,
                type: poi.type.split(';')[0] || '其他',
                typeName: getTypeName(poi, category),
                icon: getFacilityIcon(poi.type, poi.name, category),
                detail: getFacilityDetail(poi, category),
                distance: distance,
                lat: parseFloat(poi.location.split(',')[1]),
                lng: parseFloat(poi.location.split(',')[0]),
                risk: risk,
                riskClass: riskClass,
                category: category
              }
              
              if (category === 'public') {
                publicResults.push(facility)
              } else {
                lifeResults.push(facility)
              }
            }
          }
          
          publicResults.sort((a, b) => a.distance - b.distance)
          lifeResults.sort((a, b) => a.distance - b.distance)
          
          const finalResults = [...publicResults]
          const remainingSlots = 15 - finalResults.length
          if (remainingSlots > 0 && lifeResults.length > 0) {
            finalResults.push(...lifeResults.slice(0, remainingSlots))
          }
          
          console.log(`📋 公共设施: ${publicResults.length} 个, 生活服务: ${lifeResults.length} 个, 最终显示: ${finalResults.length} 个`)
          
          resolve(finalResults)
        } else {
          console.log('⚠️ API 返回无数据, status:', data.status, 'info:', data.info)
          resolve([])
        }
      }
      
      const timeout = setTimeout(() => {
        if ((window as any)[callbackName]) {
          console.error('❌ 高德API请求超时')
          delete (window as any)[callbackName]
          document.body.removeChild(script)
          resolve([])
        }
      }, 10000)
      
      script.onerror = (error) => {
        console.error('❌ 加载高德API失败:', error)
        clearTimeout(timeout)
        if ((window as any)[callbackName]) {
          delete (window as any)[callbackName]
        }
        document.body.removeChild(script)
        resolve([])
      }
      
      script.src = url
      document.body.appendChild(script)
      
    } catch (error) {
      console.error('❌ 搜索设施失败:', error)
      reject(error)
    }
  })
}

// 加载周边设施
const loadFacilities = async (riskPoint: RiskPoint) => {
  if (!riskPoint.lat || !riskPoint.lng) {
    console.warn('⚠️ 风险点缺少坐标')
    facilities.value = []
    return
  }
  
  loadingFacilities.value = true
  facilities.value = []
  
  try {
    console.log(`🔍 搜索周边设施: ${riskPoint.name} (经度: ${riskPoint.lng}, 纬度: ${riskPoint.lat})`)
    
    const results = await searchNearbyFacilities(riskPoint.lng, riskPoint.lat, 5000)
    
    facilities.value = results
    emit('facilitiesUpdate', results)
    
    if (results.length > 0) {
      console.log(`✅ 显示 ${results.length} 个设施`)
    } else {
      console.log('⚠️ 未找到设施')
    }
  } catch (error) {
    console.error('❌ 加载设施失败:', error)
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
    await loadFacilities(newRiskPoint)
  } else {
    facilities.value = []
    emit('facilitiesUpdate', [])
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

/* 未选择风险点时的提示样式 */
.facility-placeholder {
  text-align: center;
  padding: 40px 20px;
  background: rgba(0, 40, 60, 0.3);
  border-radius: 12px;
  border: 1px dashed rgba(0, 180, 255, 0.3);
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.placeholder-text {
  font-size: 14px;
  color: #a0d0ff;
  margin-bottom: 8px;
  font-weight: 500;
}

.placeholder-sub {
  font-size: 11px;
  color: #88a0b0;
}

/* 加载样式 */
.loading-facility {
  text-align: center;
  padding: 40px 20px;
  color: #88a0b0;
  font-size: 12px;
}

.loading-spinner {
  display: inline-block;
  width: 30px;
  height: 30px;
  border: 2px solid rgba(0, 200, 255, 0.3);
  border-top-color: #00f0ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 设施列表样式 */
.facility-list-wrapper {
  margin-top: 8px;
}

.facility-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(0, 80, 120, 0.3);
  border-radius: 8px;
  font-size: 12px;
  color: #a0d0ff;
}

.facility-count {
  background: rgba(0, 200, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  color: #00f0ff;
}

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 40, 60, 0.4);
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.facility-item:hover {
  background: rgba(0, 100, 150, 0.4);
  transform: translateX(4px);
}

.facility-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(0, 180, 255, 0.3);
  background: rgba(0, 76, 112, 0.3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.facility-info {
  flex: 1;
  min-width: 0;
}

.facility-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.facility-name {
  font-size: 13px;
  font-weight: 500;
  color: #e0f0ff;
}

.facility-type {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(0, 100, 150, 0.3);
  color: #88ccff;
}

.facility-type.public {
  background: rgba(0, 150, 255, 0.25);
  color: #66ccff;
}

.facility-type.life {
  background: rgba(100, 200, 100, 0.2);
  color: #88ff88;
}

.facility-detail {
  display: block;
  font-size: 11px;
  color: #88a0b0;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.facility-distance {
  display: block;
  font-size: 10px;
  color: #66c0ff;
}

.facility-risk {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 12px;
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

/* 空状态样式 */
.empty-facility {
  text-align: center;
  padding: 40px 20px;
  background: rgba(0, 40, 60, 0.3);
  border-radius: 12px;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 13px;
  color: #88a0b0;
  margin-bottom: 6px;
}

.empty-sub {
  font-size: 11px;
  color: #6688a0;
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
