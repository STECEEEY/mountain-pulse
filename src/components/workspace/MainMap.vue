<template>
  <div class="main-map">
    <div ref="mapRef" class="map-container"></div>
    <!-- 地图信息覆盖层 -->
    <div class="map-info">
      <div class="info-item">
        <span class="label">中心坐标</span>
        <span class="value">{{ centerCoords }}</span>
      </div>
      <div class="info-item">
        <span class="label">缩放级别</span>
        <span class="value">{{ zoomLevel.toFixed(1) }}</span>
      </div>
    </div>
    <div v-if="false" class="map-hint">{{ mapHint }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
// 周边设施
const surroundingFeatures = ref({ buildings: [], roads: [], railways: [] })


const loadSurroundingFeatures = async (lng: number, lat: number, radius: number = 0.02) => {
  if (!map) return
  const center = { lng, lat }
  try {
    const [buildingsRes, roadsRes, railwaysRes] = await Promise.all([
      fetch('/geodata/building.geojson').then(res => res.json()),
      fetch('/geodata/roads.geojson').then(res => res.json()),
      fetch('/geodata/railways.geojson').then(res => res.json())
    ])
    
    const filterByDistance = (features: any[]) => features.filter((f: any) => {
      const coords = getFeatureCoords(f)
      if (!coords) return false
      const dist = Math.sqrt(Math.pow(coords.lng - center.lng, 2) + Math.pow(coords.lat - center.lat, 2))
      return dist <= radius
    })
    
    surroundingFeatures.value = {
      buildings: filterByDistance(buildingsRes.features),
      roads: filterByDistance(roadsRes.features),
      railways: filterByDistance(railwaysRes.features)
    }
    
    // 清除旧图层
    ['surrounding-buildings-layer', 'surrounding-roads-layer', 'surrounding-railways-layer'].forEach(layer => {
      if (map?.getLayer(layer)) map?.removeLayer(layer)
    })
    ['surrounding-buildings', 'surrounding-roads', 'surrounding-railways'].forEach(src => {
      if (map?.getSource(src)) map?.removeSource(src)
    })
    
    // 添加新图层
    if (surroundingFeatures.value.buildings.length && map) {
      map.addSource('surrounding-buildings', { type: 'geojson', data: { type: 'FeatureCollection', features: surroundingFeatures.value.buildings } })
      map.addLayer({ id: 'surrounding-buildings-layer', type: 'fill', source: 'surrounding-buildings', paint: { 'fill-color': '#ff4444', 'fill-opacity': 0.5 } })
    }
    if (surroundingFeatures.value.roads.length && map) {
      map.addSource('surrounding-roads', { type: 'geojson', data: { type: 'FeatureCollection', features: surroundingFeatures.value.roads } })
      map.addLayer({ id: 'surrounding-roads-layer', type: 'line', source: 'surrounding-roads', paint: { 'line-color': '#ffaa44', 'line-width': 4, 'line-opacity': 0.8 } })
    }
    if (surroundingFeatures.value.railways.length && map) {
      map.addSource('surrounding-railways', { type: 'geojson', data: { type: 'FeatureCollection', features: surroundingFeatures.value.railways } })
      map.addLayer({ id: 'surrounding-railways-layer', type: 'line', source: 'surrounding-railways', paint: { 'line-color': '#44aaff', 'line-width': 5, 'line-opacity': 0.8, 'line-dasharray': [4, 3] } })
    }
  } catch (e) { console.error(e) }
}

const clearSurroundingLayers = () => {
  if (!map) return
  ['surrounding-buildings-layer', 'surrounding-roads-layer', 'surrounding-railways-layer'].forEach(layer => {
    if (map.getLayer(layer)) map.removeLayer(layer)
  })
  ['surrounding-buildings', 'surrounding-roads', 'surrounding-railways'].forEach(src => {
    if (map.getSource(src)) map.removeSource(src)
  })
}

defineExpose({ loadSurroundingFeatures, clearSurroundingLayers })
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { riskService } from '@/services/riskService'
import type { MapConfig, RiskPoint } from '@/types/risk'
import { createMapboxRiskLevelColorExpression, getRiskLevelClass, getRiskLevelColor } from '@/utils/riskLevel'

const emit = defineEmits(['select-point', 'select-disaster-site'])

interface LayerState {
  riskMap: boolean
  disasterPoints: boolean
  disasterSites?: boolean  // 新增受灾点图层状态
}

const props = withDefaults(
  defineProps<{
    layerState: LayerState
    riskMapOpacity: number
  }>(),
  {
    riskMapOpacity: 0.45,
    layerState: () => ({
      riskMap: true,
      disasterPoints: true,
      disasterSites: true  // 默认显示
    })
  },
)

const mapRef = ref<HTMLElement>()
const zoomLevel = ref(10)
const centerCoords = ref('119.0°E, 32.1°N')
const mapHint = ref('')
let map: mapboxgl.Map | null = null

// 图层ID常量
const RISK_MAP_SOURCE_ID = 'risk-map-source'
const RISK_MAP_LAYER_ID = 'risk-map-layer'
const DISASTER_POINTS_SOURCE_ID = 'disaster-points-source'
const DISASTER_POINTS_LAYER_ID = 'disaster-points-layer'
// 新增受灾点图层ID
const DISASTER_SITES_SOURCE_ID = 'disaster-sites-source'
const DISASTER_SITES_LAYER_ID = 'disaster-sites-layer'

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
let disasterSitesData: any = null  // 存储受灾点数据

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

// 根据险情等级获取风险等级和颜色
const getRiskLevelFromHazardLevel = (hazardLevel: string): { level: string, color: string, priority: number } => {
  const levelMap: Record<string, { level: string, color: string, priority: number }> = {
    '小型': { level: '低风险', color: '#52c41a', priority: 1 },
    '中型': { level: '中风险', color: '#faad14', priority: 2 },
    '大型': { level: '高风险', color: '#ff4d4f', priority: 3 },
    '特大型': { level: '极高风险', color: '#ff0000', priority: 4 }
  }
  return levelMap[hazardLevel] || { level: '中风险', color: '#faad14', priority: 2 }
}

// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoidGttNGoiLCJhIjoiY21obXplem8yMDAxNzJscTB0c2o1OHBsYiJ9.u9M-kBhBorWBEb_EAh6I4Q'

const normalizeCenter = (center: [number, number]): [number, number] => {
  const [first, second] = center
  if (Math.abs(first) <= 90 && Math.abs(second) > 90) {
    return [second, first]
  }
  return [first, second]
}

const loadStaticData = async () => {
  const [configRes, pointsRes, disasterSitesRes] = await Promise.allSettled([
    riskService.loadMapConfig(),
    riskService.loadRiskPoints(),
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

  // 处理受灾点数据
  if (disasterSitesRes.status === 'fulfilled' && disasterSitesRes.value) {
    disasterSitesData = disasterSitesRes.value
    const featureCount = disasterSitesData.features?.length || 0
    console.log(`受灾点数据加载成功: ${featureCount} 个点`)
    if (featureCount === 0) {
      mapHint.value = '受灾点样本数据为空'
    }
  } else {
    console.warn('受灾点数据加载失败')
    disasterSitesData = null
    mapHint.value = '受灾点样本数据加载失败'
  }
}

const addRiskMapLayer = () => {
  if (!map || map.getLayer(RISK_MAP_LAYER_ID)) return

  const { west, east, south, north } = mapConfig.bounds
  
  // 坐标调整参数
  const scale = 1.35
  const rightShift = 0.21
  const downShift = -0.07
  
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

  if (map.getSource(RISK_MAP_SOURCE_ID)) {
    map.removeSource(RISK_MAP_SOURCE_ID)
  }

  map.addSource(RISK_MAP_SOURCE_ID, {
    type: 'image',
    url: '/data/risk_map.png',
    coordinates: [
      [newWest, newNorth],
      [newEast, newNorth],
      [newEast, newSouth],
      [newWest, newSouth],
    ],
  })

  if (!map.getLayer(RISK_MAP_LAYER_ID)) {
    map.addLayer({
      id: RISK_MAP_LAYER_ID,
      type: 'raster',
      source: RISK_MAP_SOURCE_ID,
      paint: {
        'raster-opacity': props.riskMapOpacity,
      },
    })
  }

  map.setLayoutProperty(RISK_MAP_LAYER_ID, 'visibility', props.layerState.riskMap ? 'visible' : 'none')
}

const addDisasterPointsLayer = () => {
  if (!map || map.getLayer(DISASTER_POINTS_LAYER_ID)) return

  map.addSource(DISASTER_POINTS_SOURCE_ID, {
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
        },
        geometry: {
          type: 'Point',
          coordinates: [item.longitude, item.latitude],
        },
      })),
    },
  })

  map.addLayer({
    id: DISASTER_POINTS_LAYER_ID,
    type: 'circle',
    source: DISASTER_POINTS_SOURCE_ID,
    paint: {
      'circle-radius': 7,
      'circle-color': createMapboxRiskLevelColorExpression('levelClass') as any,
      'circle-stroke-color': '#9B59B6',
      'circle-stroke-width': 1.2,
      'circle-opacity': 0.95,
      'circle-stroke-opacity': 0.6,
    },
  })

  map.on('click', DISASTER_POINTS_LAYER_ID, (e) => {
    const feature = e.features?.[0]
    if (!feature || !feature.properties) return

    const props = feature.properties as {
      id: number
      name: string
      level: string
      type: string
      velocity: number
      threat: string
    }

    emit('select-point', {
      id: props.id,
      name: props.name,
      lng: e.lngLat.lng,
      lat: e.lngLat.lat,
      level: props.level,
      deformation: props.velocity,
      type: props.type,
      threat: props.threat,
      elevation: monitoringPoints[props.id - 1]?.elevation,
      slope: monitoringPoints[props.id - 1]?.slope,
    })

    new mapboxgl.Popup({ offset: 18, className: 'dark-popup' })
      .setLngLat(e.lngLat)
      .setHTML(`
        <div class="popup-content">
          <strong>${props.name}</strong><br/>
          <span style="color:${getRiskLevelColor(props.level)}">类型：${props.type}</span><br/>
          <span>风险等级：${props.level}</span><br/>
          <span>形变速率：${Number(props.velocity).toFixed(2)} mm/yr</span><br/>
          <span>威胁人口：${props.threat}</span>
        </div>
      `)
      .addTo(map!)
  })

  map.on('mouseenter', DISASTER_POINTS_LAYER_ID, () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', DISASTER_POINTS_LAYER_ID, () => {
    if (map) map.getCanvas().style.cursor = ''
  })
}

// 新增：添加受灾点图层 - 适配你的中文数据格式
const addDisasterSitesLayer = () => {
  if (!map || !disasterSitesData || !disasterSitesData.features || map.getLayer(DISASTER_SITES_LAYER_ID)) return

  // 处理GeoJSON数据，映射中文字段
  const processedFeatures = disasterSitesData.features.map((feature: any, index: number) => {
    const props = feature.properties || {}
    
    // 提取关键字段
    const hazardName = props.灾害体名称 || props.灾害体编_1 || `受灾点${index + 1}`
    const hazardType = props.灾害体类型 || '未知'
    const hazardLevel = props.险情等级 || props.灾害等级 || '小型'
    const threatPopulation = props.威胁人口 || 0
    const threatProperty = props.威胁财产 || 0
    const monitoringAdvice = props.监测建议 || ''
    const location = props.地理位置 || ''
    
    // 获取风险等级
    const riskInfo = getRiskLevelFromHazardLevel(hazardLevel)
    
    return {
      type: 'Feature',
      properties: {
        id: props.灾害体编号 || props.野外编号 || index + 1,
        name: hazardName,
        hazardType: hazardType,
        hazardLevel: hazardLevel,
        riskLevel: riskInfo.level,
        riskColor: riskInfo.color,
        threatPopulation: threatPopulation,
        threatProperty: threatProperty,
        monitoringAdvice: monitoringAdvice,
        location: location,
        longitude: props.经度,
        latitude: props.纬度,
        indoorNumber: props.室内编号,
        fieldNumber: props.野外编号
      },
      geometry: feature.geometry
    }
  })

  map.addSource(DISASTER_SITES_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: processedFeatures
    }
  })

  // 根据风险等级设置不同样式
  map.addLayer({
    id: DISASTER_SITES_LAYER_ID,
    type: 'circle',
    source: DISASTER_SITES_SOURCE_ID,
    paint: {
      'circle-radius': 7,
      'circle-color': '#9B59B6',  // 紫色
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 1.5,
      'circle-opacity': 0.85
    }
  })
  // 添加点击事件显示详细信息
  map.on('click', DISASTER_SITES_LAYER_ID, (e) => {
    const feature = e.features?.[0]
    if (!feature || !feature.properties) return

    const props = feature.properties
    
    // 构建弹窗内容
    const popupHTML = `
      <div class="popup-content disaster-popup">
        <strong style="color:#ff6600; font-size:14px;">🏚️ ${props.name}</strong><br/>
        <hr style="margin:6px 0; border-color:#333;">
        <table style="width:100%; font-size:12px; line-height:1.6;">
          <tr><td style="padding:2px 0;">灾害类型：</td><td><strong>${props.hazardType}</strong></td></tr>
          <tr><td style="padding:2px 0;">险情等级：</td><td><span style="color:${props.riskColor}; font-weight:bold;">${props.hazardLevel}</span></td></tr>
          <tr><td style="padding:2px 0;">风险等级：</td><td><span style="color:${props.riskColor};">${props.riskLevel}</span></td></tr>
          <tr><td style="padding:2px 0;">威胁人口：</td><td>${props.threatPopulation} 人</td></tr>
          <tr><td style="padding:2px 0;">威胁财产：</td><td>${props.threatProperty} 万元</td></tr>
          ${props.monitoringAdvice ? `<tr><td style="padding:2px 0;">监测建议：</td><td>${props.monitoringAdvice}</td></tr>` : ''}
          ${props.location ? `<tr><td style="padding:2px 0;">地理位置：</td><td>${props.location}</td></tr>` : ''}
          ${props.fieldNumber ? `<tr><td style="padding:2px 0;">野外编号：</td><td>${props.fieldNumber}</td></tr>` : ''}
        </table>
      </div>
    `
    
    new mapboxgl.Popup({ offset: 25, className: 'dark-popup disaster-popup' })
      .setLngLat(e.lngLat)
      .setHTML(popupHTML)
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

  map.on('mouseenter', DISASTER_SITES_LAYER_ID, () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', DISASTER_SITES_LAYER_ID, () => {
    if (map) map.getCanvas().style.cursor = ''
  })

  // 设置初始可见性
  map.setLayoutProperty(DISASTER_SITES_LAYER_ID, 'visibility', props.layerState.disasterSites ? 'visible' : 'none')
  
  console.log('受灾点图层已添加，共', processedFeatures.length, '个点')
}

const setLayerVisibility = (layerId: string, visible: boolean) => {
  if (!map || !map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

const syncLayerVisibility = () => {
  if (!map) return
  setLayerVisibility(RISK_MAP_LAYER_ID, props.layerState.riskMap)
  setLayerVisibility(DISASTER_POINTS_LAYER_ID, props.layerState.disasterPoints)
  setLayerVisibility(DISASTER_SITES_LAYER_ID, props.layerState.disasterSites || false)
  
  if (map.getLayer(RISK_MAP_LAYER_ID)) {
    map.setPaintProperty(RISK_MAP_LAYER_ID, 'raster-opacity', props.riskMapOpacity)
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

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
  map.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

  map.on('load', () => {
    map?.setProjection('mercator')
    map?.setFog(null)
    addRiskMapLayer()
    addDisasterPointsLayer()
    addDisasterSitesLayer()  // 添加受灾点图层
    syncLayerVisibility()
  })

  map.on('move', () => {
    const center = map!.getCenter()
    centerCoords.value = `${center.lng.toFixed(2)}°E, ${center.lat.toFixed(2)}°N`
    zoomLevel.value = map!.getZoom()
  })
}

watch(
  () => props.layerState,
  () => {
    syncLayerVisibility()
  },
  { deep: true },
)

watch(
  () => props.riskMapOpacity,
  () => {
    syncLayerVisibility()
  },
)

onMounted(async () => {
  await loadStaticData()
  initMap()
})

onUnmounted(() => {
  map?.remove()
})


// 获取要素的坐标
const getFeatureCoords = (feature: any) => {
  const geom = feature.geometry
  if (!geom || !geom.coordinates) return null
  
  if (geom.type === 'Point') {
    return { lng: geom.coordinates[0], lat: geom.coordinates[1] }
  }
  if (geom.type === 'LineString' && geom.coordinates[0]) {
    return { lng: geom.coordinates[0][0], lat: geom.coordinates[0][1] }
  }
  if (geom.type === 'Polygon' && geom.coordinates[0] && geom.coordinates[0][0]) {
    return { lng: geom.coordinates[0][0][0], lat: geom.coordinates[0][0][1] }
  }
  if (geom.type === 'MultiPolygon' && geom.coordinates[0] && geom.coordinates[0][0] && geom.coordinates[0][0][0]) {
    return { lng: geom.coordinates[0][0][0][0], lat: geom.coordinates[0][0][0][1] }
  }
  return null
}

// 更新地图上的周边设施图层
const updateSurroundingLayers = () => {
  if (!map) return
  
  // 移除旧图层
  const layersToRemove = ['surrounding-buildings-layer', 'surrounding-roads-layer', 'surrounding-railways-layer']
  const sourcesToRemove = ['surrounding-buildings', 'surrounding-roads', 'surrounding-railways']
  
  layersToRemove.forEach(layer => {
    if (map.getLayer(layer)) {
      map.removeLayer(layer)
    }
  })
  sourcesToRemove.forEach(source => {
    if (map.getSource(source)) {
      map.removeSource(source)
    }
  })
  
  // 添加建筑图层
  if (surroundingFeatures.value.buildings.length > 0) {
    map.addSource('surrounding-buildings', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: surroundingFeatures.value.buildings
      }
    })
    map.addLayer({
      id: 'surrounding-buildings-layer',
      type: 'fill',
      source: 'surrounding-buildings',
      paint: {
        'fill-color': '#ff4444',
        'fill-opacity': 0.5,
        'fill-outline-color': '#ff0000'
      }
    })
  }
  
  // 添加道路图层
  if (surroundingFeatures.value.roads.length > 0) {
    map.addSource('surrounding-roads', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: surroundingFeatures.value.roads
      }
    })
    map.addLayer({
      id: 'surrounding-roads-layer',
      type: 'line',
      source: 'surrounding-roads',
      paint: {
        'line-color': '#ffaa44',
        'line-width': 4,
        'line-opacity': 0.8
      }
    })
  }
  
  // 添加铁路图层
  if (surroundingFeatures.value.railways.length > 0) {
    map.addSource('surrounding-railways', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: surroundingFeatures.value.railways
      }
    })
    map.addLayer({
      id: 'surrounding-railways-layer',
      type: 'line',
      source: 'surrounding-railways',
      paint: {
        'line-color': '#44aaff',
        'line-width': 5,
        'line-opacity': 0.8,
        'line-dasharray': [4, 3]
      }
    })
  }
}

// 暴露方法给父组件调用
defineExpose({
  loadSurroundingFeatures,
  clearSurroundingLayers
})
</script>

<style scoped>
/* 保持原有样式 */
.main-map {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0a1020;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-info {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(10, 20, 30, 0.9);
  border: 1px solid rgba(0, 200, 255, 0.3);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
  z-index: 10;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item .label {
  font-size: 11px;
  color: #88a0b0;
}

.info-item .value {
  font-size: 13px;
  font-weight: 500;
  color: #00f0ff;
}

.map-hint {
  position: absolute;
  top: 90px;
  left: 16px;
  max-width: 420px;
  padding: 8px 10px;
  font-size: 12px;
  color: #ffd9d9;
  border: 1px solid rgba(255, 80, 80, 0.5);
  border-radius: 8px;
  background: rgba(80, 10, 10, 0.55);
  z-index: 10;
}

:global(.dark-popup .mapboxgl-popup-content) {
  background: rgba(10, 20, 30, 0.95);
  color: #e0f0ff;
  border-radius: 8px;
  padding: 12px 16px;
  border: 1px solid rgba(0, 200, 255, 0.3);
}

:global(.dark-popup .mapboxgl-popup-tip) {
  border-top-color: rgba(10, 20, 30, 0.95);
}

:global(.disaster-popup .mapboxgl-popup-content) {
  border-left: 3px solid #ff6600;
  min-width: 260px;
}

:global(.popup-content strong) {
  color: #00f0ff;
}

:global(.disaster-popup table) {
  color: #e0f0ff;
}

:global(.disaster-popup table td:first-child) {
  color: #88a0b0;
  padding-right: 8px;
}

:deep(.mapboxgl-ctrl-group) {
  background: rgba(10, 20, 30, 0.9);
  border: 1px solid rgba(0, 200, 255, 0.3);
  border-radius: 8px;
}

:deep(.mapboxgl-ctrl-group button) {
  background: transparent;
  border-color: rgba(0, 200, 255, 0.2);
}

:deep(.mapboxgl-ctrl-group button:hover) {
  background: rgba(0, 150, 255, 0.2);
}

:deep(.mapboxgl-ctrl-icon) {
  filter: invert(1);
}

:deep(.mapboxgl-ctrl-scale) {
  background: rgba(10, 20, 30, 0.9);
  border: 1px solid rgba(0, 200, 255, 0.3);
  color: #00f0ff;
  font-size: 11px;
}
</style>
