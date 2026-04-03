<template>
  <div class="map-view">
    <div class="main-content">
      <div class="map-underlay">
        <MainMap
          ref="mainMapRef"
          :layer-state="layerState"
          :risk-map-opacity="riskMapOpacity"
          @select-point="handleSelectPoint"
        />
        <MapControls
          class="controls-animate"
          :layer-state="layerState"
          :risk-map-opacity="riskMapOpacity"
          @update:layer-state="layerState = $event"
          @update:risk-map-opacity="riskMapOpacity = $event"
        />
      </div>

      <div class="overlay-grid">
        <div class="right-panel panel-animate">
          <SidePanel :selected-point="selectedPoint" />
        </div>
        <div class="right-ghost"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'  // 添加 watch
import MainMap from '@/components/workspace/MainMap.vue'
import MapControls from '@/components/workspace/MapControls.vue'
import SidePanel from '@/components/workspace/SidePanel.vue'

// 获取 MainMap 组件的引用，以便访问地图实例
const mainMapRef = ref<any>(null)

const selectedPoint = ref<any>(null)
const layerState = ref({
  riskMap: true,
  highRiskArea: true,
  disasterPoints: true,
})
const riskMapOpacity = ref(0.45)

const handleSelectPoint = (point: any) => {
  selectedPoint.value = point
}

// ========== 周边设施高亮 ==========
const surroundingFeatures = ref({
  buildings: [] as any[],
  roads: [] as any[],
  railways: [] as any[]
})

// 获取地图实例的辅助函数
const getMap = () => {
  return mainMapRef.value?.getMap?.() || mainMapRef.value?.map
}

// 根据中心点和半径筛选周边设施
const loadSurroundingFeatures = async (lng: number, lat: number, radius: number = 0.02) => {
  const map = getMap()
  if (!map) {
    console.log('地图未就绪，稍后重试')
    return
  }
  
  const baseUrl = '/geodata'
  const center = { lng, lat }
  
  try {
    console.log('开始加载周边设施...')
    
    // 加载并筛选建筑
    const buildingsRes = await fetch(`${baseUrl}/building.geojson`).then(res => res.json())
    const nearbyBuildings = buildingsRes.features.filter((feature: any) => {
      const coords = getFeatureCoords(feature)
      if (!coords) return false
      const distance = Math.sqrt(Math.pow(coords.lng - center.lng, 2) + Math.pow(coords.lat - center.lat, 2))
      return distance <= radius
    })
    
    // 加载并筛选道路
    const roadsRes = await fetch(`${baseUrl}/roads.geojson`).then(res => res.json())
    const nearbyRoads = roadsRes.features.filter((feature: any) => {
      const coords = getFeatureCoords(feature)
      if (!coords) return false
      const distance = Math.sqrt(Math.pow(coords.lng - center.lng, 2) + Math.pow(coords.lat - center.lat, 2))
      return distance <= radius
    })
    
    // 加载并筛选铁路
    const railwaysRes = await fetch(`${baseUrl}/railways.geojson`).then(res => res.json())
    const nearbyRailways = railwaysRes.features.filter((feature: any) => {
      const coords = getFeatureCoords(feature)
      if (!coords) return false
      const distance = Math.sqrt(Math.pow(coords.lng - center.lng, 2) + Math.pow(coords.lat - center.lat, 2))
      return distance <= radius
    })
    
    surroundingFeatures.value = {
      buildings: nearbyBuildings,
      roads: nearbyRoads,
      railways: nearbyRailways
    }
    
    // 更新地图图层
    updateSurroundingLayers()
    
    console.log(`周边设施: 建筑${nearbyBuildings.length}个, 道路${nearbyRoads.length}条, 铁路${nearbyRailways.length}条`)
    
  } catch (error) {
    console.error('加载周边设施失败:', error)
  }
}

// 获取要素的坐标（中心点）
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
  const map = getMap()
  if (!map) return
  
  // 移除旧图层
  if (map.getSource('surrounding-buildings')) {
    map.removeLayer('surrounding-buildings-layer')
    map.removeSource('surrounding-buildings')
  }
  if (map.getSource('surrounding-roads')) {
    map.removeLayer('surrounding-roads-layer')
    map.removeSource('surrounding-roads')
  }
  if (map.getSource('surrounding-railways')) {
    map.removeLayer('surrounding-railways-layer')
    map.removeSource('surrounding-railways')
  }
  
  // 添加建筑图层（高亮显示）
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
        'fill-opacity': 0.6,
        'fill-outline-color': '#ff0000'
      }
    })
  }
  
  // 添加道路图层（高亮显示）
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
        'line-opacity': 0.9
      }
    })
  }
  
  // 添加铁路图层（高亮显示）
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
        'line-opacity': 0.9,
        'line-dasharray': [4, 3]
      }
    })
  }
}

// 清除周边设施高亮
const clearSurroundingLayers = () => {
  const map = getMap()
  if (!map) return
  
  const layers = ['surrounding-buildings-layer', 'surrounding-roads-layer', 'surrounding-railways-layer']
  const sources = ['surrounding-buildings', 'surrounding-roads', 'surrounding-railways']
  
  layers.forEach(layer => {
    if (map.getLayer(layer)) {
      map.removeLayer(layer)
    }
  })
  sources.forEach(source => {
    if (map.getSource(source)) {
      map.removeSource(source)
    }
  })
  
  surroundingFeatures.value = { buildings: [], roads: [], railways: [] }
}

// 监听选中点变化，加载周边设施
watch(() => selectedPoint.value, async (newPoint) => {
  if (newPoint && newPoint.lng && newPoint.lat) {
    // 清除旧的高亮
    clearSurroundingLayers()
    // 等待地图就绪
    setTimeout(async () => {
      await loadSurroundingFeatures(newPoint.lng, newPoint.lat, 0.02)
    }, 500)
  } else {
    clearSurroundingLayers()
  }
})
</script>

<style scoped>
.map-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-content {
  flex: 1;
  position: relative;
  padding: 12px;
  min-height: 0;
}

.map-underlay {
  position: absolute;
  inset: 12px;
  z-index: 1;
  border-radius: 12px;
  overflow: hidden;
}

.overlay-grid {
  position: relative;
  z-index: 2;
  height: 100%;
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 16px;
  min-height: 0;
  pointer-events: none;
}

.right-ghost {
  min-height: 0;
}

.right-panel {
  grid-column: 1;
  min-height: 0;
  background: rgba(8, 23, 37, 0.56);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(0, 200, 255, 0.28);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
}

/* 动画 */
.controls-animate {
  animation: slideInLeft 0.5s ease-out 0.2s both;
}

.panel-animate {
  animation: slideInRight 0.5s ease-out 0.1s both;
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
