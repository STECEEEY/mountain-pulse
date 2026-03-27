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
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { riskService } from '@/services/riskService'
import type { MapConfig, RiskPoint } from '@/types/risk'
import { getRiskLevelColor } from '@/utils/riskLevel'

const emit = defineEmits(['select-point'])

interface LayerState {
  riskMap: boolean
  disasterPoints: boolean
}

const props = withDefaults(
  defineProps<{
    layerState: LayerState
    riskMapOpacity: number
  }>(),
  {
    riskMapOpacity: 0.45,
  },
)

const mapRef = ref<HTMLElement>()
const zoomLevel = ref(10)
const centerCoords = ref('119.0°E, 32.1°N')
const mapHint = ref('')
let map: mapboxgl.Map | null = null

const RISK_MAP_SOURCE_ID = 'risk-map-source'
const RISK_MAP_LAYER_ID = 'risk-map-layer'
const DISASTER_POINTS_SOURCE_ID = 'disaster-points-source'
const DISASTER_POINTS_LAYER_ID = 'disaster-points-layer'

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
  const [configRes, pointsRes, highRiskRes] = await Promise.allSettled([
    riskService.loadMapConfig(),
    riskService.loadRiskPoints(),
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
}

const addRiskMapLayer = () => {
  if (!map || map.getLayer(RISK_MAP_LAYER_ID)) return

  const { west, east, south, north } = mapConfig.bounds
  
  // 坐标调整参数
  const scale = 1.2        // 缩放系数
  const rightShift = 0.15  // 右移
  const downShift = -0.05  // 下移
  
  // 计算调整后的坐标
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

  // 如果 source 已存在，先移除再添加
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

  // 如果图层已存在，不需要重复添加
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
      'circle-color': [
        'match',
        ['get', 'level'],
        '极高', '#FF0000',
        'danger', '#FF0000',
        '高', '#FF4500',
        'warning', '#FF4500',
        '中', '#FFD700',
        'medium', '#FFD700',
        '低', '#00FF00',
        'safe', '#00FF00',
        '#00FF00',
      ],
      'circle-stroke-color': '#ffd4d4',
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

const setLayerVisibility = (layerId: string, visible: boolean) => {
  if (!map || !map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

const syncLayerVisibility = () => {
  if (!map) return
  setLayerVisibility(RISK_MAP_LAYER_ID, props.layerState.riskMap)
  setLayerVisibility(DISASTER_POINTS_LAYER_ID, props.layerState.disasterPoints)
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
</script>

<style scoped>
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

:global(.popup-content strong) {
  color: #00f0ff;
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
