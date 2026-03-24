<template>
  <div class="map-card">
    <div class="card-header">
      <h3 class="card-title">宁镇山脉区域概况</h3>
      <div class="map-controls center-controls">
        <el-checkbox v-model="layers.riskMap" label="风险底图" />
        <el-checkbox v-model="layers.disasterPoints" label="风险点" />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { riskService } from '@/services/riskService'
import type { HighRiskGeoJSON, MapConfig, RiskPoint } from '@/types/risk'
import { getRiskLevelColor } from '@/utils/riskLevel'

const mapRef = ref<HTMLElement>()
let map: mapboxgl.Map | null = null
const mapHint = ref('')
const layers = reactive({
  riskMap: true,
  disasterPoints: true,
})
const riskMapOpacity = ref(0.45)

const OVERVIEW_RISK_MAP_SOURCE_ID = 'overview-risk-map-source'
const OVERVIEW_RISK_MAP_LAYER_ID = 'overview-risk-map-layer'
const OVERVIEW_HIGH_RISK_SOURCE_ID = 'overview-high-risk-source'
const OVERVIEW_HIGH_RISK_FILL_LAYER_ID = 'overview-high-risk-fill'
const OVERVIEW_HIGH_RISK_LINE_LAYER_ID = 'overview-high-risk-line'
const OVERVIEW_DISASTER_POINTS_SOURCE_ID = 'overview-disaster-points-source'
const OVERVIEW_DISASTER_POINTS_LAYER_ID = 'overview-disaster-points-layer'

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

const emit = defineEmits(['select-point'])

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
  const [configRes, pointsRes, highRiskRes] = await Promise.allSettled([
    riskService.loadMapConfig(),
    riskService.loadRiskPoints(),
    riskService.loadHighRiskGeoJSON(),
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
}

const addRiskMapLayer = () => {
  if (!map || map.getLayer(OVERVIEW_RISK_MAP_LAYER_ID)) return

  const { west, east, south, north } = mapConfig.bounds
  
  // 图片缩放参数（直接修改边界值来实现缩放）
  const scale = 1.2  // 整体放大10%
  // 偏移参数
  const rightShift = 0.15 // 右移
  const downShift = 0.03  // 下移（负值）
  
  // 计算原始宽高
  const originalWidth = east - west
  const originalHeight = north - south
  
  // 计算缩放后的宽高
  const scaledWidth = originalWidth * scale
  const scaledHeight = originalHeight * scale
  
  // 计算缩放后的新边界（居中缩放）
  const centerX = (west + east) / 2
  const centerY = (north + south) / 2
  
  const newWest = centerX - scaledWidth / 2 + rightShift
  const newEast = centerX + scaledWidth / 2 + rightShift
  const newSouth = centerY - scaledHeight / 2 + downShift
  const newNorth = centerY + scaledHeight / 2 + downShift

  // 如果地图源已存在，先移除
  if (map.getSource(OVERVIEW_RISK_MAP_SOURCE_ID)) {
    map.removeSource(OVERVIEW_RISK_MAP_SOURCE_ID)
  }

  map.addSource(OVERVIEW_RISK_MAP_SOURCE_ID, {
    type: 'image',
    url: '/data/risk_map.png', 
    coordinates: [
      [newWest, newNorth],      // 左上角
      [newEast, newNorth],      // 右上角
      [newEast, newSouth],      // 右下角
      [newWest, newSouth],      // 左下角
    ],
  })

  // 如果图层已存在，不需要重新添加
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
    id: OVERVIEW_DISASTER_POINTS_LAYER_ID,
    type: 'circle',
    source: OVERVIEW_DISASTER_POINTS_SOURCE_ID,
    paint: {
      'circle-radius': 7,
      'circle-color': [
        'match',
        ['get', 'level'],
        '极高风险', '#FF0000',
        'danger', '#FF0000',
        '高风险', '#FFA500',
        'warning', '#FFA500',
        '中风险', '#FFD700',
        'medium', '#FFD700',
        '低风险', '#00FF00',
        'safe', '#00FF00',
        '#00FF00',
      ],
      'circle-stroke-color': '#ffd4d4',
      'circle-stroke-width': 1.2,
      'circle-opacity': 0.95,
      'circle-stroke-opacity': 0.6,
    },
  })

  map.on('click', OVERVIEW_DISASTER_POINTS_LAYER_ID, (e) => {
    const feature = e.features?.[0]
    if (!feature || !feature.properties) return

    const pointProps = feature.properties as {
      id: number
      name: string
      level: string
      type: string
      velocity: number
      threat: string
    }

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

const setLayerVisibility = (layerId: string, visible: boolean) => {
  if (!map || !map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

const updateLayerVisibility = () => {
  setLayerVisibility(OVERVIEW_RISK_MAP_LAYER_ID, layers.riskMap)
  setLayerVisibility(OVERVIEW_DISASTER_POINTS_LAYER_ID, layers.disasterPoints)
  if (map && map.getLayer(OVERVIEW_RISK_MAP_LAYER_ID)) {
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
    updateLayerVisibility()
  })
}

onMounted(async () => {
  await loadStaticData()
  initMap()
})

watch(
  () => [layers.riskMap, layers.disasterPoints, riskMapOpacity.value],
  () => {
    updateLayerVisibility()
  },
)

onUnmounted(() => {
  map?.remove()
})
</script>

<style scoped>
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

.legend-dot.danger { background: #FF0000; }
.legend-dot.warning { background: #FF4500; }
.legend-dot.medium { background: #FFD700; }
.legend-dot.safe { background: #00FF00; }
</style>