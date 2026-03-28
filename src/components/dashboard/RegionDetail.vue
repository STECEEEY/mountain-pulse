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
      
      <!-- 直接显示设施数量 -->
      <div style="background: rgba(0,100,0,0.3); padding: 8px; margin-bottom: 10px; border-radius: 4px;">
        当前设施数量: {{ testFacilities.length }}
      </div>
      
      <!-- 测试：直接显示设施列表 -->
      <div v-if="testFacilities.length > 0" style="background: rgba(0,0,0,0.5); padding: 10px; margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 5px;">设施列表（测试显示）:</div>
        <div v-for="(f, idx) in testFacilities.slice(0, 5)" :key="idx" style="font-size: 12px; padding: 4px; border-bottom: 1px solid #333;">
          {{ f.name }} - {{ f.distance }}m
        </div>
      </div>
      
      <!-- 原始设施列表 -->
      <div v-if="facilities && facilities.length > 0" class="facility-list">
        <div 
          v-for="(facility, index) in facilities" 
          :key="index" 
          class="facility-item"
          @click="onFacilityClick(facility)"
        >
          <span class="facility-icon">{{ facility.icon }}</span>
          <div class="facility-info">
            <div class="facility-name">{{ facility.name }}</div>
            <div class="facility-distance">距离: {{ facility.distance }}m</div>
          </div>
          <span class="facility-risk" :class="facility.riskClass">{{ facility.risk }}</span>
        </div>
      </div>
      
      <div v-else-if="!loadingFacilities && selectedRiskPoint" class="empty-facility">
        暂无设施数据
        <button @click="loadDataDirectly" style="margin-left: 10px; padding: 4px 12px;">手动加载</button>
      </div>
      
      <div v-if="loadingFacilities" class="loading-facility">
        加载中...
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

const AMAP_KEY = 'd8af8724a9dd15ca3f117b7d0adaab8a'

interface Facility {
  id: string
  icon: string
  name: string
  distance: number
  lat: number
  lng: number
  risk: string
  riskClass: string
  category: string
  typeName: string
  detail: string
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
const testFacilities = ref<Facility[]>([]) // 测试用
const loadingFacilities = ref(false)

// 简化的设施搜索
const searchFacilities = async (lng: number, lat: number) => {
  loadingFacilities.value = true
  
  return new Promise((resolve) => {
    const callbackName = `callback_${Date.now()}`
    
    const script = document.createElement('script')
    script.src = `https://restapi.amap.com/v3/place/around?key=${AMAP_KEY}&location=${lng},${lat}&radius=5000&output=JSON&callback=${callbackName}`
    
    ;(window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName]
      document.body.removeChild(script)
      
      if (data.status === '1' && data.pois) {
        const results = data.pois.slice(0, 15).map((poi: any) => ({
          id: poi.id,
          name: poi.name,
          icon: '📍',
          distance: Math.round(poi.distance || 0),
          lat: parseFloat(poi.location.split(',')[1]),
          lng: parseFloat(poi.location.split(',')[0]),
          risk: poi.distance < 1000 ? '高风险' : '中风险',
          riskClass: poi.distance < 1000 ? 'high' : 'medium',
          category: 'life',
          typeName: '设施',
          detail: poi.address || '',
          type: poi.type
        }))
        
        console.log('✅ 搜索到设施:', results.length)
        resolve(results)
      } else {
        resolve([])
      }
      
      loadingFacilities.value = false
    }
    
    document.body.appendChild(script)
  })
}

// 手动加载数据
const loadDataDirectly = async () => {
  if (!props.selectedRiskPoint) {
    console.log('没有选中的风险点')
    return
  }
  
  console.log('手动加载数据:', props.selectedRiskPoint.name)
  const results = await searchFacilities(props.selectedRiskPoint.lng, props.selectedRiskPoint.lat)
  facilities.value = results as Facility[]
  testFacilities.value = results as Facility[]
  console.log('手动加载完成，设施数量:', facilities.value.length)
}

// 监听风险点变化
watch(() => props.selectedRiskPoint, async (newPoint) => {
  console.log('风险点变化:', newPoint?.name)
  
  if (newPoint && newPoint.lat && newPoint.lng) {
    loadingFacilities.value = true
    
    const results = await searchFacilities(newPoint.lng, newPoint.lat)
    
    facilities.value = results as Facility[]
    testFacilities.value = results as Facility[]
    
    console.log('设施数量:', facilities.value.length)
    console.log('testFacilities数量:', testFacilities.value.length)
    
    loadingFacilities.value = false
  } else {
    facilities.value = []
    testFacilities.value = []
  }
}, { immediate: true })

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

const onFacilityClick = (facility: Facility) => {
  emit('facilityClick', {
    name: facility.name,
    lat: facility.lat,
    lng: facility.lng,
    type: facility.icon
  })
}

onMounted(() => {
  console.log('组件已挂载')
  loadRegion()
})
</script>

<style scoped>
.detail-card {
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  margin-bottom: 16px;
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

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
}

.facility-item:hover {
  background: rgba(0, 100, 150, 0.4);
}

.facility-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(0, 76, 112, 0.3);
  border-radius: 6px;
}

.facility-info {
  flex: 1;
}

.facility-name {
  font-size: 13px;
  font-weight: 500;
  color: #e0f0ff;
  margin-bottom: 4px;
}

.facility-distance {
  font-size: 10px;
  color: #66c0ff;
}

.facility-risk {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 12px;
  white-space: nowrap;
}

.facility-risk.high {
  background: rgba(255, 68, 68, 0.2);
  color: #ff8888;
}

.facility-risk.medium {
  background: rgba(255, 204, 68, 0.2);
  color: #ffcc88;
}

.empty-facility, .loading-facility {
  text-align: center;
  padding: 30px;
  color: #88a0b0;
  font-size: 12px;
}

.facility-list::-webkit-scrollbar {
  width: 4px;
}

.facility-list::-webkit-scrollbar-track {
  background: rgba(0, 50, 70, 0.5);
}

.facility-list::-webkit-scrollbar-thumb {
  background: rgba(0, 200, 255, 0.5);
}
</style>
