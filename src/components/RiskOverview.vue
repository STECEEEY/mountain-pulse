<template>
  <div class="risk-overview">
    <div class="header">
      <h3>风险总览</h3>
      <span class="region">宁镇山脉区域</span>
    </div>

    <div class="stats-grid">
      <!-- 综合风险指数仪表盘 -->
      <div class="stat-card">
        <div class="gauge">
          <div class="gauge-value" :style="{ transform: `rotate(${comprehensiveRisk * 1.8}deg)` }">
            <span>{{ comprehensiveRisk }}</span>
          </div>
          <div class="gauge-bg"></div>
        </div>
        <div class="stat-label">综合风险指数</div>
      </div>

      <!-- 风险点统计 -->
      <div class="stat-card">
        <div class="risk-levels">
          <div class="risk-item">
            <span class="risk-dot high"></span>
            <span>极高风险</span>
            <span class="risk-count">{{ stats.extremeHigh }}</span>
          </div>
          <div class="risk-item">
            <span class="risk-dot medium-high"></span>
            <span>高风险</span>
            <span class="risk-count">{{ stats.high }}</span>
          </div>
          <div class="risk-item">
            <span class="risk-dot medium"></span>
            <span>中风险</span>
            <span class="risk-count">{{ stats.medium }}</span>
          </div>
          <div class="risk-item">
            <span class="risk-dot low"></span>
            <span>低风险</span>
            <span class="risk-count">{{ stats.low }}</span>
          </div>
        </div>
        <div class="stat-label">风险点分布</div>
      </div>

      <!-- 威胁人口/财产 -->
      <div class="stat-card">
        <div class="threat-stats">
          <div class="threat-item">
            <span class="icon">👥</span>
            <span class="value">{{ formatNumber(stats.threatPopulation) }}</span>
            <span class="label">威胁人口</span>
          </div>
          <div class="threat-item">
            <span class="icon">💰</span>
            <span class="value">{{ formatNumber(stats.threatProperty) }}万</span>
            <span class="label">威胁财产</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 风险排序列表 -->
    <div class="risk-list">
      <h4>高风险点排序</h4>
      <div class="list-items">
        <div v-for="item in topRisks" :key="item.id" class="list-item">
          <div class="item-info">
            <span class="item-name">{{ item.name }}</span>
            <span class="risk-badge" :class="item.riskLevel">{{ item.riskLevel }}</span>
          </div>
          <div class="item-stats">
            <span>威胁人口: {{ item.threatPopulation }}</span>
            <span>风险指数: {{ item.riskIndex }}</span>
          </div>
          <div class="item-progress">
            <div class="progress-bar" :style="{ width: item.riskIndex + '%' }"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 模拟数据，后续从API获取
const comprehensiveRisk = ref(67)

const stats = ref({
  extremeHigh: 3,
  high: 12,
  medium: 28,
  low: 45,
  threatPopulation: 23450,
  threatProperty: 56780,
})

const topRisks = ref([
  { id: 1, name: '汤山滑坡群', riskLevel: '极高', threatPopulation: 1250, riskIndex: 89 },
  { id: 2, name: '宝华山崩塌', riskLevel: '高', threatPopulation: 830, riskIndex: 76 },
  { id: 3, name: '紫金山北坡', riskLevel: '高', threatPopulation: 2100, riskIndex: 72 },
  { id: 4, name: '镇江三山', riskLevel: '中', threatPopulation: 560, riskIndex: 58 },
  { id: 5, name: '茅山东麓', riskLevel: '中', threatPopulation: 420, riskIndex: 51 },
])

const formatNumber = (num: number) => {
  return num.toLocaleString()
}

onMounted(() => {
  // 这里将来调用API获取真实数据
})
</script>

<style scoped>
.risk-overview {
  background: rgba(10, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  color: #e0f0ff;
  border: 1px solid rgba(0, 200, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 50, 100, 0.3);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h3 {
  margin: 0;
  color: #00f0ff;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.region {
  font-size: 14px;
  background: rgba(0, 100, 200, 0.3);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0, 200, 255, 0.3);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: rgba(0, 30, 50, 0.6);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(0, 150, 255, 0.2);
}

/* 仪表盘样式 */
.gauge {
  position: relative;
  width: 100px;
  height: 50px;
  margin: 0 auto 10px;
  overflow: hidden;
}

.gauge-bg {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(90deg, #00ff00 0%, #ffff00 50%, #ff0000 100%);
  transform: rotate(180deg);
  opacity: 0.3;
}

.gauge-value {
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 45px;
  background: #fff;
  transform-origin: bottom;
  box-shadow: 0 0 10px cyan;
}

.gauge-value span {
  position: absolute;
  top: -25px;
  left: -10px;
  color: white;
  font-weight: bold;
}

/* 风险等级 */
.risk-levels {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.risk-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.risk-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.risk-dot.high {
  background: #ff4444;
  box-shadow: 0 0 10px #ff4444;
}
.risk-dot.medium-high {
  background: #ff8844;
  box-shadow: 0 0 10px #ff8844;
}
.risk-dot.medium {
  background: #ffcc44;
  box-shadow: 0 0 10px #ffcc44;
}
.risk-dot.low {
  background: #44ff44;
  box-shadow: 0 0 10px #44ff44;
}

.risk-count {
  margin-left: auto;
  font-weight: bold;
}

/* 威胁统计 */
.threat-stats {
  display: flex;
  justify-content: space-around;
}

.threat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.threat-item .icon {
  font-size: 24px;
}

.threat-item .value {
  font-size: 18px;
  font-weight: bold;
  color: #00f0ff;
}

.threat-item .label {
  font-size: 12px;
  color: #88a0b0;
}

/* 风险列表 */
.risk-list {
  margin-top: 16px;
}

.risk-list h4 {
  margin: 0 0 12px 0;
  color: #a0d0ff;
  font-size: 14px;
}

.list-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list-item {
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 10px;
}

.item-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.item-name {
  font-weight: 500;
}

.risk-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.risk-badge.极高 {
  background: #ff4444;
  color: white;
}
.risk-badge.高 {
  background: #ff8844;
  color: white;
}
.risk-badge.中 {
  background: #ffcc44;
  color: black;
}
.risk-badge.低 {
  background: #44ff44;
  color: black;
}

.item-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #88a0b0;
  margin-bottom: 6px;
}

.item-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00f0ff, #0066ff);
  border-radius: 2px;
}

.stat-label {
  text-align: center;
  font-size: 12px;
  color: #88a0b0;
  margin-top: 8px;
}
</style>
