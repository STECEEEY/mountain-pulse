<template>
  <div class="map-card">
    <div class="card-header">
      <h3 class="card-title">宁镇山脉区域概况</h3>
      <div class="map-controls">
        <el-checkbox v-model="layers.satellite" label="卫星影像" />
        <el-checkbox v-model="layers.insarHeatmap" label="InSAR热力图" />
        <el-checkbox v-model="layers.riskGrading" label="风险分级" />
        <el-checkbox v-model="layers.disasterPoints" label="灾害点" />
      </div>
    </div>
    <div class="map-container" ref="mapRef"></div>
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
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const mapRef = ref<HTMLElement>()
let map: mapboxgl.Map | null = null
const disasterMarkers: mapboxgl.Marker[] = []
const layers = reactive({
  satellite: true,
  insarHeatmap: true,
  riskGrading: true,
  disasterPoints: true,
})

// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoidGttNGoiLCJhIjoiY21obXplem8yMDAxNzJscTB0c2o1OHBsYiJ9.u9M-kBhBorWBEb_EAh6I4Q'

const riskPoints = [
  { id: 1, name: '汤山滑坡群', level: 'danger', lng: 118.87, lat: 32.05 },
  { id: 2, name: '宝华山崩塌', level: 'warning', lng: 119.12, lat: 32.18 },
  { id: 3, name: '紫金山北坡', level: 'warning', lng: 118.82, lat: 32.08 },
  { id: 4, name: '镇江三山', level: 'medium', lng: 119.45, lat: 32.22 },
  { id: 5, name: '茅山东麓', level: 'safe', lng: 119.18, lat: 31.95 },
]

const insarHeatPoints = [
  { lng: 118.87, lat: 32.05, weight: 0.95 },
  { lng: 119.12, lat: 32.18, weight: 0.82 },
  { lng: 118.82, lat: 32.08, weight: 0.75 },
  { lng: 119.45, lat: 32.22, weight: 0.52 },
  { lng: 119.18, lat: 31.95, weight: 0.33 },
]

const riskGradingPoints = [
  { lng: 118.87, lat: 32.05, levelValue: 4 },
  { lng: 119.12, lat: 32.18, levelValue: 3 },
  { lng: 118.82, lat: 32.08, levelValue: 3 },
  { lng: 119.45, lat: 32.22, levelValue: 2 },
  { lng: 119.18, lat: 31.95, levelValue: 1 },
]

const getLevelColor = (level: string) => {
  const colors: Record<string, string> = {
    danger: '#ff4444',
    warning: '#ff8844',
    medium: '#ffcc44',
    safe: '#44ff44',
  }
  return colors[level] || '#00f0ff'
}

const emit = defineEmits(['select-point'])

const addMarkers = () => {
  if (!map) return

  disasterMarkers.forEach((marker) => marker.remove())
  disasterMarkers.length = 0

  riskPoints.forEach(point => {
    const el = document.createElement('div')
    el.className = 'pulse-marker'
    el.innerHTML = `
      <div class="marker-core" style="background: ${getLevelColor(point.level)}"></div>
      <div class="marker-pulse" style="border-color: ${getLevelColor(point.level)}"></div>
    `

    const marker = new mapboxgl.Marker(el)
      .setLngLat([point.lng, point.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
          <div class="popup-content">
            <strong>${point.name}</strong>
          </div>
        `)
      )
      .addTo(map!)

    disasterMarkers.push(marker)

    el.addEventListener('click', () => {
      emit('select-point', point)
    })
  })
}

const addInSarHeatmapLayer = () => {
  if (!map || map.getLayer('overview-insar-heatmap-layer')) return

  map.addSource('overview-insar-heatmap-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: insarHeatPoints.map((item) => ({
        type: 'Feature',
        properties: { weight: item.weight },
        geometry: {
          type: 'Point',
          coordinates: [item.lng, item.lat],
        },
      })),
    },
  })

  map.addLayer({
    id: 'overview-insar-heatmap-layer',
    type: 'heatmap',
    source: 'overview-insar-heatmap-source',
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': 1,
      'heatmap-radius': 22,
      'heatmap-opacity': 0.55,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgba(103,169,207,0.45)',
        0.4,
        'rgba(209,229,240,0.55)',
        0.6,
        'rgba(253,219,199,0.65)',
        0.8,
        'rgba(239,138,98,0.75)',
        1,
        'rgba(178,24,43,0.82)',
      ],
    },
  })
}

const addRiskGradingLayer = () => {
  if (!map || map.getLayer('overview-risk-grading-layer')) return

  map.addSource('overview-risk-grading-source', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: riskGradingPoints.map((item) => ({
        type: 'Feature',
        properties: { levelValue: item.levelValue },
        geometry: {
          type: 'Point',
          coordinates: [item.lng, item.lat],
        },
      })),
    },
  })

  map.addLayer({
    id: 'overview-risk-grading-layer',
    type: 'circle',
    source: 'overview-risk-grading-source',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'levelValue'],
        1,
        8,
        4,
        15,
      ],
      'circle-color': [
        'match',
        ['get', 'levelValue'],
        4,
        '#ff4444',
        3,
        '#ff8844',
        2,
        '#ffcc44',
        '#44ff44',
      ],
      'circle-opacity': 0.24,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.55,
    },
  })
}

const setLayerVisibility = (layerId: string, visible: boolean) => {
  if (!map || !map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

const updateLayerVisibility = () => {
  setLayerVisibility('overview-insar-heatmap-layer', layers.insarHeatmap)
  setLayerVisibility('overview-risk-grading-layer', layers.riskGrading)
  disasterMarkers.forEach((marker) => {
    const element = marker.getElement()
    element.style.display = layers.disasterPoints ? 'block' : 'none'
  })
}

const initMap = () => {
  if (!mapRef.value) return

  map = new mapboxgl.Map({
    container: mapRef.value,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [119.0, 32.1],
    zoom: 9.5,
    attributionControl: false,
    projection: 'mercator',
  })

  map.on('load', () => {
    map?.setProjection('mercator')
    map?.setFog(null)
    addInSarHeatmapLayer()
    addRiskGradingLayer()
    addMarkers()
    updateLayerVisibility()
  })
}

onMounted(() => {
  initMap()
})

watch(
  () => [layers.insarHeatmap, layers.riskGrading, layers.disasterPoints],
  () => {
    updateLayerVisibility()
  }
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
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 380px 12px 340px;
  border-bottom: 1px solid rgba(0, 150, 255, 0.1);
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #00f0ff;
}

.map-controls :deep(.el-button) {
  background: rgba(0, 30, 50, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
  color: #88a0b0;
}

.map-controls :deep(.el-button--primary) {
  background: rgba(0, 150, 255, 0.3);
  border-color: #00f0ff;
  color: #00f0ff;
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-controls :deep(.el-checkbox) {
  margin-right: 0;
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

.map-container {
  flex: 1;
  position: relative;
  min-height: 0;
}

/* 脉冲标记样式 */
:global(.pulse-marker) {
  cursor: pointer;
  position: relative;
  width: 20px;
  height: 20px;
}

:global(.pulse-marker .marker-core) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  z-index: 2;
}

:global(.pulse-marker .marker-pulse) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid;
  animation: pulse-animation 2s infinite;
  z-index: 1;
}

@keyframes pulse-animation {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
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

.legend-dot.danger { background: #ff4444; }
.legend-dot.warning { background: #ff8844; }
.legend-dot.medium { background: #ffcc44; }
.legend-dot.safe { background: #44ff44; }
</style>
