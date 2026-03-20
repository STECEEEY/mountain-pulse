<template>
  <div class="detail-card">
    <div class="card-header">
      <h3 class="card-title">区域详情</h3>
    </div>
    <div class="region-info">
      <div class="region-name">
        <span class="region-icon">REGION</span>
        <span>{{ selectedRegion.name }}</span>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">面积</span>
          <span class="info-value"><AnimatedNumber :value="selectedRegion.area" :decimals="1" /> km²</span>
        </div>
        <div class="info-item">
          <span class="info-label">人口</span>
          <span class="info-value"><AnimatedNumber :value="selectedRegion.population" :decimals="1" /> 万</span>
        </div>
        <div class="info-item">
          <span class="info-label">风险点</span>
          <span class="info-value danger"><AnimatedNumber :value="selectedRegion.riskPoints" /> 处</span>
        </div>
        <div class="info-item">
          <span class="info-label">预警等级</span>
          <span class="info-value warning">{{ selectedRegion.warningLevel }}</span>
        </div>
      </div>
    </div>
    <div class="facilities-section">
      <h4>关键设施</h4>
      <div class="facility-list">
        <div v-for="facility in facilities" :key="facility.id" class="facility-item">
          <span class="facility-icon">{{ facility.icon }}</span>
          <div class="facility-info">
            <span class="facility-name">{{ facility.name }}</span>
            <span class="facility-detail">{{ facility.detail }}</span>
          </div>
          <span class="facility-risk" :class="facility.riskClass">{{ facility.risk }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnimatedNumber from '@/components/common/AnimatedNumber.vue'

const selectedRegion = ref({
  name: '汤山街道',
  area: 128.5,
  population: 8.6,
  riskPoints: 5,
  warningLevel: '黄色预警',
})

const facilities = ref([
  { id: 1, icon: 'SCH', name: '汤山小学', detail: '师生850人', risk: '高', riskClass: 'high' },
  { id: 2, icon: 'HSP', name: '汤山医院', detail: '床位200张', risk: '中', riskClass: 'medium' },
  { id: 3, icon: 'RD', name: '宁镇高速', detail: '日车流2.3万', risk: '中', riskClass: 'medium' },
])
</script>

<style scoped>
.detail-card {
  background: rgba(10, 20, 30, 0.8);
  border: 1px solid rgba(0, 200, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.detail-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 240, 255, 0.4);
  box-shadow: 0 8px 30px rgba(0, 200, 255, 0.15);
}

.card-header {
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #00f0ff;
}

.region-info {
  margin-bottom: 16px;
}

.region-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #e0f0ff;
  margin-bottom: 12px;
}

.region-icon {
  font-size: 10px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  border-radius: 8px;
  padding: 3px 7px;
  color: #9ad4f2;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  background: rgba(0, 30, 50, 0.6);
  border-radius: 8px;
  padding: 10px;
}

.info-label {
  display: block;
  font-size: 11px;
  color: #88a0b0;
  margin-bottom: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #e0f0ff;
}

.info-value.danger {
  color: #ff4444;
}

.info-value.warning {
  color: #ffaa00;
}

.facilities-section {
  border-top: 1px solid rgba(0, 150, 255, 0.1);
  padding-top: 16px;
}

.facilities-section h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #a0d0ff;
}

.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 10px;
}

.facility-icon {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  background: rgba(0, 76, 112, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #9ad4f2;
}

.facility-info {
  flex: 1;
}

.facility-name {
  display: block;
  font-size: 13px;
  color: #e0f0ff;
}

.facility-detail {
  display: block;
  font-size: 11px;
  color: #88a0b0;
}

.facility-risk {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.facility-risk.high {
  background: rgba(255, 68, 68, 0.2);
  color: #ff8888;
}

.facility-risk.medium {
  background: rgba(255, 204, 68, 0.2);
  color: #ffcc88;
}
</style>
