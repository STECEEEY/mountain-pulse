<template>
  <div class="map-card">
    <div class="card-header">
      <h3 class="card-title">宁镇山脉区域概况</h3>
      <div class="map-controls center-controls">
        <el-checkbox v-model="layers.riskMap" label="风险底图" />
        <el-checkbox v-model="layers.disasterPoints" label="风险点" />
        <el-checkbox v-model="layers.disasterSites" label="受灾点" />
        <div class="opacity-control">
          <span>透明度 {{ Math.round(riskMapOpacity * 100) }}%</span>
          <el-slider v-model="riskMapOpacity" :min="0.1" :max="0.9" :step="0.05" style="width: 110px" />
        </div>
      </div>
    </div>
    <div class="map-container" ref="mapRef"></div>
    <div v-if="false" class="map-hint">{{ mapHint }}</div>
    <div class="map-legend">
      <div class="legend-item">
        <span class="legend-dot danger"></span>
        <span>极高风险</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot warning"></span>
        <span>高风险</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot medium"></span>
        <span>中风险</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot safe"></span>
        <span>低风险</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot disaster-site"></span>
        <span>受灾点</span>
      </div>
    </div>
  </div>
  <RegionDetail 
    :selectedRiskPoint="selectedRiskPoint"
    @facilitiesUpdate="handleFacilitiesUpdate"
    @facilityClick="handleFacilityClick"
  />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { riskService } from '@/services/riskService'
import type { HighRiskGeoJSON, MapConfig, RiskPoint } from '@/types/risk'
import { createMapboxRiskLevelColorExpression, getRiskLevelClass, getRiskLevelColor } from '@/utils/riskLevel'
import RegionDetail from './RegionDetail.vue'  // 引入 RegionDetail

const mapRef = ref<HTMLElement>()
let map: mapboxgl.Map | null = null
const mapHint = ref('')
const layers = reactive({
  riskMap: true,
  disasterPoints: true,
  disasterSites: true,
})
const riskMapOpacity = ref(0.45)

// 添加选中的风险点状态
const selectedRiskPoint = ref<any>(null)
// 存储设施标记，用于在地图上显示
const facilityMarkers = ref<any[]>([])

const OVERVIEW_RISK_MAP_SOURCE_ID = 'overview-risk-map-source'
const OVERVIEW_RISK_MAP_LAYER_ID = 'overview-risk-map-layer'
const OVERVIEW_HIGH_RISK_SOURCE_ID = 'overview-high-risk-source'
const OVERVIEW_HIGH_RISK_FILL_LAYER_ID = 'overview-high-risk-fill'
const OVERVIEW_HIGH_RISK_LINE_LAYER_ID = 'overview-high-risk-line'
const OVERVIEW_DISASTER_POINTS_SOURCE_ID = 'overview-disaster-points-source'
const OVERVIEW_DISASTER_POINTS_LAYER_ID = 'overview-disaster-points-layer'
const OVERVIEW_DISASTER_SITES_SOURCE_ID = 'overview-disaster-sites-source'
const OVERVIEW_DISASTER_SITES_LAYER_ID = 'overview-disaster-sites-layer'

// 添加存储受灾点数据的变量
let disasterSitesData: any = null

const fallbackMapConfig: MapConfig = {
  bounds: {
    west: 118.2,
    east: 119.5,
    south: 31.5,
    north: 32.5,
  },
  center: [32.0, 118.85],
  zoom: 9,
  risk_thresholds: {
    high: 0.7,
    medium: 0.5,
    low: 0,
  },
  color_scale: {
    low: '#2c7bb6',
    medium: '#fdae61',
    high: '#d7191c',
  },
}

let mapConfig: MapConfig = fallbackMapConfig
let monitoringPoints: RiskPoint[] = []
let highRiskGeoJSON: HighRiskGeoJSON = { type: 'FeatureCollection', features: [] }

// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoidGttNGoiLCJhIjoiY21obXplem8yMDAxNzJscTB0c2o1OHBsYiJ9.u9M-kBhBorWBEb_EAh6I4Q'

const emit = defineEmits(['select-point', 'select-disaster-site'])

const normalizeCenter = (center: [number, number]): [number, number] => {
  const [first, second] = center
  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    return [second, first]
  }
  return [first, second]
}

const withinBounds = (point: RiskPoint, bounds: MapConfig['bounds']) => {
  return (
    Number.isFinite(point.longitude)
    && Number.isFinite(point.latitude)
    && point.longitude >= bounds.west
    && point.longitude <= bounds.east
    && point.latitude >= bounds.south
    && point.latitude <= bounds.north
  )
}

const loadStaticData = async () => {
  const [configRes, pointsRes, highRiskRes, disasterSitesRes] = await Promise.allSettled([
    riskService.loadMapConfig(),
    riskService.loadRiskPoints(),
    riskService.loadHighRiskGeoJSON(),
    fetch('/data/受灾点样本.geojson').then(res => res.json()).catch(err => {
      console.error('加载受灾点数据失败:', err)
      return null
    })
  ])

  if (configRes.status === 'fulfilled') {
    mapConfig = configRes.value
  } else {
    mapHint.value = 'map_config.json 加载失败，已使用默认地图配置。'
  }

  if (pointsRes.status === 'fulfilled' && pointsRes.value.points.length > 0) {
    const original = pointsRes.value.points
    monitoringPoints = original.filter((item) => withinBounds(item, mapConfig.bounds))
    const removedCount = original.length - monitoringPoints.length
    if (removedCount > 0) {
      mapHint.value = `已过滤 ${removedCount} 个越界异常点，仅显示地图范围内真实点。`
    }
  } else {
    monitoringPoints = []
    mapHint.value = 'risk_points.json 加载失败或为空，当前暂无可展示监测点。'
  }

  if (highRiskRes.status === 'fulfilled') {
    highRiskGeoJSON = highRiskRes.value
    if (highRiskGeoJSON.features.length === 0) {
      mapHint.value = 'high_risk_points.geojson 当前为空，未渲染高风险面图层。'
    }
  } else {
    mapHint.value = 'high_risk_points.geojson 加载失败，未渲染高风险面图层。'
  }

  // 处理受灾点数据
  if (disasterSitesRes.status === 'fulfilled' && disasterSitesRes.value) {
    disasterSitesData = disasterSitesRes.value
    console.log('受灾点数据加载成功:', disasterSitesData.features?.length || 0, '个点')
  } else {
    console.warn('受灾点数据加载失败')
    disasterSitesData = null
  }
}

// 添加受灾点图层
const addDisasterSitesLayer = () => {
  if (!map || !disasterSitesData || !disasterSitesData.features || map.getLayer(OVERVIEW_DISASTER_SITES_LAYER_ID)) return

  // 处理GeoJSON数据，映射中文字段
  const processedFeatures = disasterSitesData.features.map((feature: any, index: number) => {
    const props = feature.properties || {}
    
    return {
      type: 'Feature',
      properties: {
        id: props.灾害体编号 || props.野外编号 || index + 1,
        name: props.灾害体名称 || `受灾点${index + 1}`,
        hazardType: props.灾害体类型 || '未知',
        hazardLevel: props.险情等级 || '小型',
        threatPopulation: props.威胁人口 || 0,
        threatProperty: props.威胁财产 || 0,
        location: props.地理位置 || ''
      },
      geometry: feature.geometry
    }
  })

  map.addSource(OVERVIEW_DISASTER_SITES_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: processedFeatures
    }
  })

  // 使用紫色，与灾害点的红橙黄绿区分
  map.addLayer({
    id: OVERVIEW_DISASTER_SITES_LAYER_ID,
    type: 'circle',
    source: OVERVIEW_DISASTER_SITES_SOURCE_ID,
    paint: {
      'circle-radius': 6,
      'circle-color': '#9B59B6',  // 紫色
      'circle-opacity': 0.85
    }
  })

  // 添加点击事件
  // 添加点击事件显示详细信息
map.on('click', OVERVIEW_DISASTER_SITES_LAYER_ID, (e) => {
  const feature = e.features?.[0]
  if (!feature || !feature.properties) return

  const props = feature.properties
  
  new mapboxgl.Popup({ offset: 18, className: 'dark-popup disaster-popup' })
    .setLngLat(e.lngLat)
    .setHTML(`
      <div class="disaster-popup-content">
        <div style="font-weight:bold; color:#9B59B6; margin-bottom:10px; font-size:14px; border-bottom:1px solid #333; padding-bottom:6px;">
          🏚️ ${props.name}
        </div>
        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">灾害类型：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.hazardType}</td>
          </tr>
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">险情等级：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.hazardLevel}</td>
          </tr>
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">威胁人口：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.threatPopulation} 人</td>
          </tr>
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">威胁财产：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.threatProperty} 万元</td>
          </tr>
          ${props.monitoringAdvice ? `
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">监测建议：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.monitoringAdvice}</td>
          </tr>
          ` : ''}
          ${props.location ? `
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">地理位置：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.location}</td>
          </tr>
          ` : ''}
          ${props.fieldNumber ? `
          <tr>
            <td style="width:70px; padding:6px 8px 6px 0; color:#88a0b0; white-space:nowrap;">野外编号：</td>
            <td style="padding:6px 0; color:#e0f0ff;">${props.fieldNumber}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `)
    .addTo(map!)
  
  // 发送选中事件给父组件
  emit('select-disaster-site', {
    id: props.id,
    name: props.name,
    lng: e.lngLat.lng,
    lat: e.lngLat.lat,
    hazardType: props.hazardType,
    hazardLevel: props.hazardLevel,
    riskLevel: props.riskLevel,
    threatPopulation: props.threatPopulation,
    threatProperty: props.threatProperty,
    monitoringAdvice: props.monitoringAdvice,
    location: props.location
  })
})

  map.on('mouseenter', OVERVIEW_DISASTER_SITES_LAYER_ID, () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', OVERVIEW_DISASTER_SITES_LAYER_ID, () => {
    if (map) map.getCanvas().style.cursor = ''
  })

  // 设置初始可见性
  map.setLayoutProperty(OVERVIEW_DISASTER_SITES_LAYER_ID, 'visibility', layers.disasterSites ? 'visible' : 'none')
}
  
const addRiskMapLayer = () => {
  if (!map || map.getLayer(OVERVIEW_RISK_MAP_LAYER_ID)) return

  const { west, east, south, north } = mapConfig.bounds
  
  const scale = 1.35        // 缩放系数
  const rightShift = 0.21  // 右移
  const downShift = -0.07  // 下移
  
  const originalWidth = east - west
  const originalHeight = north - south
  
  const scaledWidth = originalWidth * scale
  const scaledHeight = originalHeight * scale
  
  const centerX = (west + east) / 2
  const centerY = (north + south) / 2
  
  const newWest = centerX - scaledWidth / 2 + rightShift
  const newEast = centerX + scaledWidth / 2 + rightShift
  const newSouth = centerY - scaledHeight / 2 + downShift
  const newNorth = centerY + scaledHeight / 2 + downShift

  if (map.getSource(OVERVIEW_RISK_MAP_SOURCE_ID)) {
    map.removeSource(OVERVIEW_RISK_MAP_SOURCE_ID)
  }

  map.addSource(OVERVIEW_RISK_MAP_SOURCE_ID, {
    type: 'image',
    url: '/data/risk_map.png', 
    coordinates: [
      [newWest, newNorth],
      [newEast, newNorth],
      [newEast, newSouth],
      [newWest, newSouth],
    ],
  })

  if (!map.getLayer(OVERVIEW_RISK_MAP_LAYER_ID)) {
    map.addLayer({
      id: OVERVIEW_RISK_MAP_LAYER_ID,
      type: 'raster',
      source: OVERVIEW_RISK_MAP_SOURCE_ID,
      paint: {
        'raster-opacity': riskMapOpacity.value,
      },
    })
  }
}

const addHighRiskAreaLayer = () => {
  if (!map || map.getLayer(OVERVIEW_HIGH_RISK_FILL_LAYER_ID) || highRiskGeoJSON.features.length === 0) return

  map.addSource(OVERVIEW_HIGH_RISK_SOURCE_ID, {
    type: 'geojson',
    data: highRiskGeoJSON,
  })

  map.addLayer({
    id: OVERVIEW_HIGH_RISK_FILL_LAYER_ID,
    type: 'fill',
    source: OVERVIEW_HIGH_RISK_SOURCE_ID,
    paint: {
      'fill-color': '#ff2d2d',
      'fill-opacity': 0.28,
    },
  })

  map.addLayer({
    id: OVERVIEW_HIGH_RISK_LINE_LAYER_ID,
    type: 'line',
    source: OVERVIEW_HIGH_RISK_SOURCE_ID,
    paint: {
      'line-color': '#ff4444',
      'line-width': 2,
      'line-opacity': 0.9,
    },
  })
}

// 清除设施标记
const clearFacilityMarkers = () => {
  facilityMarkers.value.forEach(marker => {
    marker.remove()
  })
  facilityMarkers.value = []
}

// 添加设施标记到地图
const addFacilityMarkers = (facilities: any[]) => {
  clearFacilityMarkers()
  
  facilities.forEach(facility => {
    const popup = new mapboxgl.Popup({ offset: 25, className: 'facility-popup' })
      .setHTML(`
        <div class="popup-content">
          <strong>${facility.name}</strong><br/>
          <span>类型：${facility.icon}</span><br/>
          <span>风险等级：${facility.risk}</span><br/>
          <span>距离风险点：${facility.distance}m</span>
        </div>
      `)
    
    const marker = new mapboxgl.Marker({
      color: getFacilityMarkerColor(facility.riskClass),
      scale: 0.8
    })
      .setLngLat([facility.lng, facility.lat])
      .setPopup(popup)
      .addTo(map!)
    
    facilityMarkers.value.push(marker)
  })
}

// 根据风险等级获取标记颜色
const getFacilityMarkerColor = (riskClass: string): string => {
  switch (riskClass) {
    case 'critical': return '#ff0000'
    case 'high': return '#ff8800'
    case 'medium': return '#ffdd00'
    default: return '#00ff88'
  }
}

const addDisasterPointsLayer = () => {
  if (!map || map.getLayer(OVERVIEW_DISASTER_POINTS_LAYER_ID)) return

  map.addSource(OVERVIEW_DISASTER_POINTS_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: monitoringPoints.map((item, index) => ({
        type: 'Feature',
        properties: {
          id: index + 1,
          name: item.name,
          level: item.level,
          levelClass: getRiskLevelClass(item.level),
          type: item.type,
          velocity: item.velocity,
          threat: item.threat,
          lat: item.latitude,
          lng: item.longitude,
        },
        geometry: {
          type: 'Point',
          coordinates: [item.longitude, item.latitude],
        },
      })),
    },
  })

  map.addLayer({
    id: OVERVIEW_DISASTER_POINTS_LAYER_ID,
    type: 'circle',
    source: OVERVIEW_DISASTER_POINTS_SOURCE_ID,
    paint: {
      'circle-radius': 7,
      'circle-color': createMapboxRiskLevelColorExpression('levelClass') as any,
      'circle-stroke-color': '#ffd4d4',
      'circle-stroke-width': 1.2,
      'circle-opacity': 0.95,
      'circle-stroke-opacity': 0.6,
    },
  })

  map.on('click', OVERVIEW_DISASTER_POINTS_LAYER_ID, (e) => {
      console.log('风险点被点击了', e)
    const feature = e.features?.[0]
    if (!feature || !feature.properties) return

    const pointProps = feature.properties as any
    console.log('风险点数据:', pointProps)

    // 设置选中的风险点，传递给 RegionDetail
    selectedRiskPoint.value = {
      id: pointProps.id,
      name: pointProps.name,
      lat: pointProps.lat,
      lng: pointProps.lng,
      threat: pointProps.threat,
      level: pointProps.level,
    }
    console.log('selectedRiskPoint 已设置:', selectedRiskPoint.value)

    emit('select-point', {
      id: pointProps.id,
      name: pointProps.name,
      lng: e.lngLat.lng,
      lat: e.lngLat.lat,
      level: pointProps.level,
      deformation: pointProps.velocity,
    })

    new mapboxgl.Popup({ offset: 18, className: 'dark-popup' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-content">
          <strong>${pointProps.name}</strong><br/>
          <span style="color:${getRiskLevelColor(pointProps.level)}">类型：${pointProps.type}</span><br/>
          <span>风险等级：${pointProps.level}</span><br/>
          <span>形变速率：${Number(pointProps.velocity).toFixed(2)} mm/yr</span><br/>
          <span>威胁人口：${pointProps.threat}</span>
        </div>
      `)
      .addTo(map!)
  })
}

// 处理设施更新，在地图上显示标记
const handleFacilitiesUpdate = (facilities: any[]) => {
  if (map) {
    addFacilityMarkers(facilities)
  }
}

// 处理设施点击，定位到设施位置
const handleFacilityClick = (facility: { name: string; lat: number; lng: number; type: string }) => {
  if (map) {
    map.flyTo({
      center: [facility.lng, facility.lat],
      zoom: 15,
      duration: 1000
    })
    
    // 弹出提示
    new mapboxgl.Popup({ offset: 25, className: 'facility-popup' })
      .setLngLat([facility.lng, facility.lat])
      .setHTML(`
        <div class="popup-content">
          <strong>${facility.name}</strong><br/>
          <span>类型：${facility.type}</span>
        </div>
      `)
      .addTo(map!)
      .setMaxWidth('200px')
  }
}

const setLayerVisibility = (layerId: string, visible: boolean) => {
  if (!map || !map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}
 
const updateLayerVisibility = () => {
  if (!map) return
  setLayerVisibility(OVERVIEW_RISK_MAP_LAYER_ID, layers.riskMap)
  setLayerVisibility(OVERVIEW_DISASTER_POINTS_LAYER_ID, layers.disasterPoints)
  setLayerVisibility(OVERVIEW_DISASTER_SITES_LAYER_ID, layers.disasterSites)
  if (map.getLayer(OVERVIEW_RISK_MAP_LAYER_ID)) {
    map.setPaintProperty(OVERVIEW_RISK_MAP_LAYER_ID, 'raster-opacity', riskMapOpacity.value)
  }
}

const initMap = () => {
  if (!mapRef.value) return

  const center = normalizeCenter(mapConfig.center)

  map = new mapboxgl.Map({
    container: mapRef.value,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center,
    zoom: mapConfig.zoom,
    attributionControl: false,
    projection: 'mercator',
  })

  map.on('load', () => {
    map?.setProjection('mercator')
    map?.setFog(null)
    addRiskMapLayer()
    addHighRiskAreaLayer()
    addDisasterPointsLayer()
    addDisasterSitesLayer()  // 先添加图层
    updateLayerVisibility()  // 再设置可见性
  })
}

onMounted(async () => {
  await loadStaticData()
  initMap()
})

watch(
  () => [layers.riskMap, layers.disasterPoints, layers.disasterSites, riskMapOpacity.value],
  () => {
    updateLayerVisibility()
  },
)

onUnmounted(() => {
  clearFacilityMarkers()
  map?.remove()
})
</script>

<style scoped>
/* 添加设施弹窗样式 */
:global(.facility-popup .mapboxgl-popup-content) {
  background: rgba(10, 20, 30, 0.95);
  color: #e0f0ff;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid rgba(0, 200, 255, 0.3);
}

:global(.facility-popup .mapboxgl-popup-tip) {
  border-top-color: rgba(10, 20, 30, 0.95);
}

/* 其他样式保持不变 */
.map-card {
  width: 100%;
  height: 100%;
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(0, 150, 255, 0.1);
  flex-wrap: wrap;
  gap: 12px;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #00f0ff;
  white-space: nowrap;
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.center-controls {
  justify-content: center !important;
  flex: 1;
}

.map-controls :deep(.el-checkbox) {
  margin-right: 0;
  color: #9cc0d8;
}

.map-controls :deep(.el-checkbox__label) {
  color: #9cc0d8;
  font-size: 12px;
}

.map-controls :deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #00f0ff;
}

.map-controls :deep(.el-checkbox__inner) {
  border-color: rgba(0, 190, 255, 0.35);
  background: rgba(0, 36, 58, 0.6);
}

.map-controls :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  border-color: #00f0ff;
  background: rgba(0, 146, 226, 0.55);
}

.opacity-control {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9cc0d8;
  font-size: 12px;
}

.opacity-control span {
  white-space: nowrap;
}

.opacity-control :deep(.el-slider) {
  width: 110px;
}

.map-container {
  flex: 1;
  position: relative;
  min-height: 0;
  width: 100%;
}

.map-hint {
  position: absolute;
  bottom: 60px;
  left: 16px;
  max-width: 420px;
  padding: 8px 10px;
  font-size: 12px;
  color: #ffd9d9;
  border: 1px solid rgba(255, 80, 80, 0.5);
  border-radius: 8px;
  background: rgba(80, 10, 10, 0.55);
  z-index: 10;
  pointer-events: none;
}

:global(.dark-popup .mapboxgl-popup-content) {
  background: rgba(10, 20, 30, 0.95);
  color: #e0f0ff;
  border-radius: 8px;
  padding: 10px 14px;
  border: 1px solid rgba(0, 200, 255, 0.3);
}

:global(.dark-popup .mapboxgl-popup-tip) {
  border-top-color: rgba(10, 20, 30, 0.95);
}

:global(.popup-content strong) {
  color: #00f0ff;
}

.map-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  padding: 12px;
  border-top: 1px solid rgba(0, 150, 255, 0.1);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #88a0b0;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.disaster-site {
  background: #9B59B6;
}
  
.legend-dot.danger { background: #F44336; }
.legend-dot.warning { background: #FF9800; }
.legend-dot.medium { background: #FFEE58; }
.legend-dot.safe { background: #81C784; }
</style>
