<template>
  <div ref="mapContainer" id="viewDiv" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const mapContainer = ref<HTMLDivElement>();

declare const esri: any;

onMounted(() => {
  if (typeof esri === 'undefined') {
    console.error('GeoScene SDK 未加载，请检查 index.html 中的 CDN 引用');
    return;
  }

  esri.require([
    'esri/Map',
    'esri/views/MapView',
    'esri/layers/MapImageLayer'
  ], (Map: any, MapView: any, MapImageLayer: any) => {
    // 创建地图，底图使用天地图
    const map = new Map({
      basemap: "tianditu-vector"
    });

    // =============================================
    // 1. 滑坡风险概率图（核心图层）
    // =============================================
    const riskLayer = new MapImageLayer({
      url: "https://geosever.geosceneenterprise.cn:6443/geoscene/rest/services/landslide_risk_map_final__1__tif/MapServer",
      opacity: 0.8,
      title: "滑坡风险概率图"
    });
    map.add(riskLayer);

    // =============================================
    // 2. 人口格网数据
    // =============================================
    const populationLayer = new MapImageLayer({
      url: "https://geosever.geosceneenterprise.cn:6443/geoscene/rest/services/PopSE_China2020_100m_jpg_Band_1/MapServer",
      opacity: 0.6,
      title: "人口分布格网",
      visible: false  // 默认关闭
    });
    map.add(populationLayer);

    // =============================================
    // 3. 全国水系
    // =============================================
    const waterLayer = new MapImageLayer({
      url: "https://geosever.geosceneenterprise.cn:6443/geoscene/rest/services/全国水系/MapServer",
      title: "全国水系",
      visible: false  // 默认关闭
    });
    map.add(waterLayer);

    // =============================================
    // 4. 地质隐患点
    // =============================================
    const hazardLayer = new MapImageLayer({
      url: "https://geosever.geosceneenterprise.cn:6443/geoscene/rest/services/地质隐患点/MapServer",
      opacity: 0.9,
      title: "地质隐患点"
    });
    map.add(hazardLayer);

    // =============================================
    // 创建地图视图
    // =============================================
    const view = new MapView({
      container: mapContainer.value!,
      map: map,
      center: [119.0, 32.0],
      zoom: 10
    });

    // 将 view 暴露到全局，方便调试
    (window as any).view = view;

    console.log('✅ 所有服务加载完成！');
    console.log('已加载服务列表：', map.layers.toArray().map((l: any) => l.title || l.url));
  });
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
