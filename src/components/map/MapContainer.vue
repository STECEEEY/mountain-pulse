<template>
  <div ref="mapContainer" id="viewDiv" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import MapImageLayer from '@arcgis/core/layers/MapImageLayer';

// 用于存储地图视图实例
const mapContainer = ref<HTMLDivElement>();
let view: MapView | null = null;

// 从 store 获取设置地图的方法
// 如果你没有使用 map store，可以移除这部分
// import { useMapStore } from '@/stores/map';
// const mapStore = useMapStore();

onMounted(() => {
  // 1. 创建地图，底图使用天地图（符合参赛要求）
  const map = new Map({
    basemap: "tianditu-vector" // 天地图矢量底图
  });

  // 2. 加载你发布的风险图服务 (MapServer)
  const riskLayer = new MapImageLayer({
    url: "https://geosever.geosceneenterprise.cn:6443/geoscene/rest/services/landslide_risk_map_final__1__tif/MapServer"
  });
  map.add(riskLayer);

  // 3. 加载地质隐患点服务（假设它是一个要素服务）
  // 注意：如果这个服务是 MapServer 而非 FeatureServer，请使用 MapImageLayer
  // 如果是 FeatureServer，可以使用 FeatureLayer
  // 这里以 MapImageLayer 为例：
  const hazardLayer = new MapImageLayer({
    url: "https://geosever.geosceneenterprise.cn:6443/geoscene/rest/services/地质隐患点/MapServer" // 请替换为实际服务名
  });
  map.add(hazardLayer);

  // 4. 创建地图视图
  view = new MapView({
    container: mapContainer.value!,
    map: map,
    center: [119.0, 32.0], // 研究区中心点
    zoom: 10
  });

  // 如果需要将地图实例存入 store，可以取消注释以下代码
  // mapStore.setMap(view.map);
});
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  background: #0a0f1a;
}

.map-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  box-shadow: inset 0 0 150px rgba(0, 150, 255, 0.3);
  pointer-events: none;
  z-index: 10;
}
</style>
