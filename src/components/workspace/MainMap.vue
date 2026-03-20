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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

const emit = defineEmits(['select-point'])

const mapRef = ref<HTMLElement>()
const zoomLevel = ref(10)
const centerCoords = ref('119.0°E, 32.1°N')
let map: mapboxgl.Map | null = null
const disasterMarkers: mapboxgl.Marker[] = []

// Mapbox Access Token
mapboxgl.accessToken = 'pk.eyJ1IjoidGttNGoiLCJhIjoiY21obXplem8yMDAxNzJscTB0c2o1OHBsYiJ9.u9M-kBhBorWBEb_EAh6I4Q'

// 监测点数据
const monitoringPoints = [
  { id: 1, name: '汤山滑坡群', lng: 118.87, lat: 32.05, level: 'danger', deformation: 25.6 },
  { id: 2, name: '宝华山崩塌', lng: 119.12, lat: 32.18, level: 'warning', deformation: 18.3 },
  { id: 3, name: '紫金山北坡', lng: 118.82, lat: 32.08, level: 'warning', deformation: 15.7 },
  { id: 4, name: '镇江三山', lng: 119.45, lat: 32.22, level: 'medium', deformation: 8.9 },
  { id: 5, name: '茅山东麓', lng: 119.18, lat: 31.95, level: 'safe', deformation: 3.1 },
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

const addMarkers = () => {
  if (!map) return

  disasterMarkers.forEach((marker) => marker.remove())
  disasterMarkers.length = 0

  monitoringPoints.forEach(point => {
    const el = document.createElement('div')
    el.className = 'pulse-marker'
    el.innerHTML = `
      <div class="marker-core" style="background: ${getLevelColor(point.level)}; box-shadow: 0 0 10px ${getLevelColor(point.level)};"></div>
      <div class="marker-pulse" style="border-color: ${getLevelColor(point.level)};"></div>
    `

    const marker = new mapboxgl.Marker(el)
      .setLngLat([point.lng, point.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, className: 'dark-popup' }).setHTML(`
          <div class="popup-content">
            <strong>${point.name}</strong><br/>
            <span style="color: ${getLevelColor(point.level)}">形变: ${point.deformation}mm</span>
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
  if (!map || map.getLayer('insar-heatmap-layer')) return

  map.addSource('insar-heatmap-source', {
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
    id: 'insar-heatmap-layer',
    type: 'heatmap',
    source: 'insar-heatmap-source',
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['get', 'weight'],
      'heatmap-intensity': 1,
      'heatmap-radius': 24,
      'heatmap-opacity': 0.58,
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
  if (!map || map.getLayer('risk-grading-layer')) return

  map.addSource('risk-grading-source', {
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
    id: 'risk-grading-layer',
    type: 'circle',
    source: 'risk-grading-source',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'levelValue'],
        1,
        10,
        4,
        18,
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
      'circle-opacity': 0.25,
      'circle-stroke-width': 1.2,
      'circle-stroke-color': '#ffffff',
      'circle-stroke-opacity': 0.6,
    },
  })
}

const initMap = () => {
  if (!mapRef.value) return

  map = new mapboxgl.Map({
    container: mapRef.value,
    style: 'mapbox://styles/mapbox/satellite-streets-v12',
    center: [119.0, 32.1],
    zoom: 10,
    attributionControl: false,
    projection: 'mercator',
  })

  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
  map.addControl(new mapboxgl.ScaleControl(), 'bottom-left')

  map.on('load', () => {
    map?.setProjection('mercator')
    map?.setFog(null)
    addInSarHeatmapLayer()
    addRiskGradingLayer()
    addMarkers()
  })

  map.on('move', () => {
    const center = map!.getCenter()
    centerCoords.value = `${center.lng.toFixed(2)}°E, ${center.lat.toFixed(2)}°N`
    zoomLevel.value = map!.getZoom()
  })
}

onMounted(() => {
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

/* 脉冲标记样式 */
:global(.pulse-marker) {
  cursor: pointer;
  position: relative;
  width: 24px;
  height: 24px;
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
  width: 24px;
  height: 24px;
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
