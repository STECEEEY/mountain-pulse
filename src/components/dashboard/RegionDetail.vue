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
    <div class="facilities-section">
      <h4>关键设施</h4>
      <div v-if="loadingFacilities" class="loading-facility">
        <span>加载关键设施数据中...</span>
      </div>
      <div v-else-if="facilities.length > 0" class="facility-list">
        <div v-for="facility in facilities" :key="facility.id" class="facility-item">
          <span class="facility-icon">{{ facility.icon }}</span>
          <div class="facility-info">
            <span class="facility-name">{{ facility.name }}</span>
            <span class="facility-detail">{{ facility.detail }}</span>
          </div>
          <span class="facility-risk" :class="facility.riskClass">{{ facility.risk }}</span>
        </div>
      </div>
      <div v-else class="empty-facility">暂无关键设施数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'
import { riskService } from '@/services/riskService'
import { normalizeRiskLevel } from '@/utils/riskLevel'
import type { CanonicalRiskLevel } from '@/utils/riskLevel'
import { tencentPOIService } from '@/services/tencentPOIService'

interface Facility {
  id: string
  icon: string
  name: string
  detail: string
  risk: string
  riskClass: string
}

const selectedRegion = ref({
  name: '',
  area: -1,
  population: -1,
  riskPoints: 0,
  warningLevel: '',
})

const facilities = ref<Facility[]>([])
const loadingFacilities = ref(false)

// 设施类型对应的图标映射 - 添加默认类型
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
    '交通枢纽': '🚉',
    '大坝': '🌊'
  }
  // 确保type存在，如果不存在返回默认图标
  return iconMap[type] || '📍'
}

// 计算设施风险等级（基于与地质灾害点的距离）
const calculateRiskLevel = (facility: any, riskPoints: any[]): { risk: string; riskClass: string } => {
  if (!riskPoints || riskPoints.length === 0) {
    return { risk: '待评估', riskClass: 'medium' }
  }
  
  // 计算设施到最近风险点的距离
  let minDistance = Infinity
  riskPoints.forEach((point: any) => {
    if (point.lng && point.lat && facility.lng && facility.lat) {
      const distance = Math.sqrt(
        Math.pow(facility.lng - point.lng, 2) + 
        Math.pow(facility.lat - point.lat, 2)
      ) * 111000 // 粗略转换为米（1度≈111km）
      
      if (distance < minDistance) {
        minDistance = distance
      }
    }
  })
  
  if (minDistance < 500) {
    return { risk: '极高风险', riskClass: 'critical' }
  } else if (minDistance < 1000) {
    return { risk: '高风险', riskClass: 'high' }
  } else if (minDistance < 2000) {
    return { risk: '中风险', riskClass: 'medium' }
  } else if (minDistance < 5000) {
    return { risk: '低风险', riskClass: 'low' }
  }
  return { risk: '关注', riskClass: 'low' }
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

    const totalPopulation = pointsPayload.points.reduce((sum, point) => sum + parseThreatPopulation(point.threat), 0)
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
    
    // 加载腾讯POI关键设施数据
    await loadFacilitiesFromTencent(pointsPayload.points)
    
  } catch (error) {
    console.error('加载区域数据失败:', error)
    selectedRegion.value = {
      name: '',
      area: -1,
      population: -1,
      riskPoints: 0,
      warningLevel: '',
    }
    // 降级方案：使用模拟数据
    facilities.value = getMockFacilities()
  }
}

// 从腾讯POI API加载关键设施
const loadFacilitiesFromTencent = async (riskPoints: any[]) => {
  loadingFacilities.value = true
  
  try {
    // 宁镇山脉区域边界（南京+镇江区域）
    const ningzhenBounds = {
      south: 31.5,
      north: 32.3,
      west: 118.5,
      east: 119.5
    }
    
    // 需要提取的关键设施类型
    const facilityTypes = ['水库', '学校', '医院', '化工厂', '加油站', '桥梁', '隧道', '变电站']
    
    const allFacilities: any[] = []
    
    // 并行请求各类设施
    const promises = facilityTypes.map(type => 
      tencentPOIService.searchByPolygon(type, ningzhenBounds)
    )
    
    const results = await Promise.all(promises)
    
    // 合并去重（基于名称和坐标）
    const facilityMap = new Map()
    results.forEach((result, index) => {
      // 修复：确保type有值，如果index超出范围则使用默认值
      const type = index < facilityTypes.length ? facilityTypes[index] : '其他'
      
      if (result.success && result.data && result.data.length > 0) {
        result.data.forEach((poi: any) => {
          // 修复：确保id不为undefined
          const poiId = poi.id || `${poi.title}_${poi.location.lat}_${poi.location.lng}`
          const key = `${poi.title}_${poi.location.lat}_${poi.location.lng}`
          if (!facilityMap.has(key)) {
            facilityMap.set(key, {
              id: poiId,
              name: poi.title,
              type: type, // 现在type保证是string
              detail: poi.address || `${type}设施`,
              lat: poi.location.lat,
              lng: poi.location.lng,
              icon: getFacilityIcon(type) // 现在type保证是string
            })
          }
        })
      }
    })
    
    // 转换为设施列表并计算风险等级
    const facilityList: Facility[] = Array.from(facilityMap.values()).map(facility => {
      const { risk, riskClass } = calculateRiskLevel(facility, riskPoints)
      return {
        id: String(facility.id),
        icon: facility.icon,
        name: facility.name,
        detail: facility.detail,
        risk: risk,
        riskClass: riskClass
      }
    })
    
    // 按风险等级排序（极高风险优先显示）
    const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
    facilityList.sort((a, b) => (riskOrder[a.riskClass] || 4) - (riskOrder[b.riskClass] || 4))
    
    facilities.value = facilityList.slice(0, 8) // 最多显示8个关键设施
    
  } catch (error) {
    console.error('加载关键设施失败:', error)
    // 降级方案：使用模拟数据
    facilities.value = getMockFacilities()
  } finally {
    loadingFacilities.value = false
  }
}

// 模拟数据（作为API调用失败的降级方案）
const getMockFacilities = (): Facility[] => {
  return [
    { id: '1', icon: '💧', name: '句容水库', detail: '句容市北部，库容1200万m³', risk: '高风险', riskClass: 'high' },
    { id: '2', icon: '🏫', name: '南京师范大学', detail: '仙林校区，师生约3万人', risk: '中风险', riskClass: 'medium' },
    { id: '3', icon: '🏥', name: '镇江市第一人民医院', detail: '新区分院，床位500张', risk: '低风险', riskClass: 'low' },
    { id: '4', icon: '🏭', name: '镇江化工园区', detail: '镇江新区，重点监管企业', risk: '极高风险', riskClass: 'critical' },
    { id: '5', icon: '⛽', name: '宁镇加油站', detail: 'G312国道旁，日均服务300车次', risk: '中风险', riskClass: 'medium' },
    { id: '6', icon: '🌉', name: '润扬大桥', detail: '跨江通道，日均车流5万辆', risk: '高风险', riskClass: 'high' },
  ]
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
  cursor: pointer;
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
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 10px;
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
  font-weight: 700;
  color: #9ad4f2;
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

.facility-risk {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
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

.empty-facility {
  color: #88a0b0;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}

.loading-facility {
  color: #88a0b0;
  font-size: 12px;
  text-align: center;
  padding: 20px;
}
</style>