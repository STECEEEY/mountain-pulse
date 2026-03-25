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
}

interface RiskPoint {
  id: string
  name: string
  lat: number
  lng: number
  threat: string
  level: string
}

interface MockFacilityItem {
  name: string
  type: string
  detail: string
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

const getFacilityIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    '水库': '💧',
    '学校': '🏫',
    '医院': '🏥',
    '化工厂': '🏭',
    '加油站': '⛽',
    '桥梁': '🌉',
    '隧道': '🚇',
    '变电站': '⚡',
    '交通枢纽': '🚉'
  }
  return iconMap[type] || '📍'
}

const calculateRiskByDistance = (distance: number): { risk: string; riskClass: string } => {
  if (distance < 500) return { risk: '极高风险', riskClass: 'critical' }
  if (distance < 1000) return { risk: '高风险', riskClass: 'high' }
  if (distance < 2000) return { risk: '中风险', riskClass: 'medium' }
  return { risk: '低风险', riskClass: 'low' }
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

watch(() => props.selectedRiskPoint, async (newRiskPoint) => {
  if (newRiskPoint && newRiskPoint.lat && newRiskPoint.lng) {
    await loadMockFacilities(newRiskPoint)
  } else {
    facilities.value = []
    emit('facilitiesUpdate', [])
  }
}, { immediate: true })

const loadMockFacilities = async (riskPoint: RiskPoint) => {
  loadingFacilities.value = true
  
  setTimeout(() => {
    const mockData: MockFacilityItem[] = [
      { name: '句容水库', type: '水库', detail: '库容1200万m³，距风险点较近' },
      { name: '南京师范大学', type: '学校', detail: '师生约3万人，需重点关注' },
      { name: '镇江市第一人民医院', type: '医院', detail: '床位500张，应急医疗资源' },
      { name: '镇江化工园区', type: '化工厂', detail: '重点监管企业，风险较高' },
      { name: '宁镇加油站', type: '加油站', detail: 'G312国道旁，日均服务300车次' },
      { name: '润扬大桥', type: '桥梁', detail: '跨江通道，日均车流5万辆' },
      { name: '磨盘山隧道', type: '隧道', detail: '宁镇公路关键通道' },
      { name: '句容变电站', type: '变电站', detail: '区域电力供应关键节点' },
      { name: '句容客运站', type: '交通枢纽', detail: '日均客流5000人次' }
    ]
    
    const result: Facility[] = []
    for (let i = 0; i < mockData.length; i++) {
      const item = mockData[i]
      // 使用非空断言，因为 item 肯定存在
      const distance = Math.floor(Math.random() * 1900 + 100)
      const { risk, riskClass } = calculateRiskByDistance(distance)
      
      result.push({
        id: `${i + 1}`,
        icon: getFacilityIcon(item.type),
        name: item.name,
        detail: item.detail,
        risk: risk,
        riskClass: riskClass,
        distance: distance,
        lat: riskPoint.lat + (Math.random() - 0.5) * 0.02,
        lng: riskPoint.lng + (Math.random() - 0.5) * 0.02
      })
    }
    
    result.sort((a, b) => a.distance - b.distance)
    facilities.value = result
    emit('facilitiesUpdate', result)
    loadingFacilities.value = false
  }, 300)
}

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