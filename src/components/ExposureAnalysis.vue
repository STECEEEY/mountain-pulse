<template>
  <div class="exposure-analysis">
    <div class="header">
      <h3>承灾体分析</h3>
      <el-button-group>
        <el-button
          size="small"
          :type="activeTab === 'population' ? 'primary' : 'default'"
          @click="activeTab = 'population'"
          >人口</el-button
        >
        <el-button
          size="small"
          :type="activeTab === 'assets' ? 'primary' : 'default'"
          @click="activeTab = 'assets'"
          >资产</el-button
        >
        <el-button
          size="small"
          :type="activeTab === 'facilities' ? 'primary' : 'default'"
          @click="activeTab = 'facilities'"
          >设施</el-button
        >
      </el-button-group>
    </div>

    <!-- 人口热力图配置 -->
    <div v-if="activeTab === 'population'" class="tab-content">
      <div class="stats-row">
        <div class="stat-box">
          <span class="label">影响总人口</span>
          <span class="value">{{ formatNumber(stats.totalPopulation) }}人</span>
        </div>
        <div class="stat-box">
          <span class="label">人口密度</span>
          <span class="value">{{ stats.populationDensity }}/km²</span>
        </div>
      </div>

      <!-- 人口年龄分布 -->
      <div class="chart-container">
        <h4>年龄分布</h4>
        <div class="age-bars">
          <div v-for="age in ageDistribution" :key="age.range" class="age-bar-item">
            <div class="bar-label">{{ age.range }}</div>
            <div class="bar-wrapper">
              <div
                class="bar"
                :style="{ width: age.percentage + '%', backgroundColor: age.color }"
              ></div>
            </div>
            <div class="bar-value">{{ age.percentage }}%</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 资产分析 -->
    <div v-if="activeTab === 'assets'" class="tab-content">
      <div class="stats-row">
        <div class="stat-box">
          <span class="label">总资产价值</span>
          <span class="value">{{ formatNumber(stats.totalAssets) }}万元</span>
        </div>
      </div>

      <div class="asset-charts">
        <!-- 资产类型饼图占位 -->
        <div class="pie-placeholder">
          <div class="pie-item" v-for="asset in assetTypes" :key="asset.type">
            <div class="pie-color" :style="{ backgroundColor: asset.color }"></div>
            <span>{{ asset.type }}</span>
            <span class="asset-value">{{ asset.value }}万</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 关键设施 -->
    <div v-if="activeTab === 'facilities'" class="tab-content">
      <div class="facility-list">
        <div v-for="facility in criticalFacilities" :key="facility.id" class="facility-item">
          <div class="facility-icon" :class="facility.type">
            {{ getFacilityIcon(facility.type) }}
          </div>
          <div class="facility-info">
            <div class="facility-name">{{ facility.name }}</div>
            <div class="facility-detail">{{ facility.detail }}</div>
          </div>
          <div class="facility-risk" :class="facility.riskLevel">
            {{ facility.riskLevel }}
          </div>
        </div>
      </div>
    </div>

    <!-- 权重调节滑块 -->
    <div class="weight-sliders">
      <h4>决策权重调节</h4>
      <div v-for="factor in weightFactors" :key="factor.name" class="slider-item">
        <span>{{ factor.name }}</span>
        <el-slider v-model="factor.weight" :min="0" :max="100" size="small" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElSlider } from 'element-plus'

const activeTab = ref('population')

const stats = ref({
  totalPopulation: 45230,
  populationDensity: 235,
  totalAssets: 156780,
})

const ageDistribution = ref([
  { range: '0-18', percentage: 18, color: '#36a2ef' },
  { range: '19-35', percentage: 32, color: '#4bc0c0' },
  { range: '36-55', percentage: 28, color: '#ff9f40' },
  { range: '55+', percentage: 22, color: '#ff6384' },
])

const assetTypes = ref([
  { type: '居民住宅', value: 67890, color: '#36a2ef' },
  { type: '工业企业', value: 45670, color: '#4bc0c0' },
  { type: '农田', value: 23450, color: '#ff9f40' },
  { type: '基础设施', value: 19770, color: '#ff6384' },
])

const criticalFacilities = ref([
  { id: 1, name: '汤山小学', type: 'school', detail: '师生共计850人', riskLevel: '高风险' },
  { id: 2, name: '宁镇高速入口', type: 'bridge', detail: '日均车流量2.3万', riskLevel: '中风险' },
  { id: 3, name: '宝华山隧道', type: 'tunnel', detail: '长度1.2km', riskLevel: '极高风险' },
  { id: 4, name: '汤山医院', type: 'hospital', detail: '床位200张', riskLevel: '高风险' },
])

const weightFactors = ref([
  { name: '人口密度', weight: 80 },
  { name: '资产价值', weight: 70 },
  { name: '设施重要性', weight: 60 },
  { name: '历史灾害', weight: 50 },
])

const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const getFacilityIcon = (type: string) => {
  const icons: Record<string, string> = {
    school: '🏫',
    hospital: '🏥',
    bridge: '🌉',
    tunnel: '⛰️',
  }
  return icons[type] || '🏢'
}
</script>

<style scoped>
.exposure-analysis {
  background: rgba(10, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  color: #e0f0ff;
  border: 1px solid rgba(0, 200, 255, 0.2);
  height: 100%;
  overflow-y: auto;
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

.tab-content {
  min-height: 200px;
  margin-bottom: 20px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-box {
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}

.stat-box .label {
  display: block;
  font-size: 12px;
  color: #88a0b0;
  margin-bottom: 4px;
}

.stat-box .value {
  font-size: 18px;
  font-weight: bold;
  color: #00f0ff;
}

/* 年龄分布 */
.age-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.age-bar-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.bar-label {
  width: 40px;
  font-size: 12px;
}

.bar-wrapper {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 4px;
}

.bar-value {
  width: 40px;
  font-size: 12px;
  text-align: right;
}

/* 资产图表 */
.pie-placeholder {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.pie-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.pie-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.asset-value {
  margin-left: auto;
  color: #00f0ff;
}

/* 设施列表 */
.facility-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.facility-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 40, 60, 0.4);
  border-radius: 8px;
  padding: 10px;
}

.facility-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(0, 150, 255, 0.2);
  border-radius: 8px;
}

.facility-icon.school {
  color: #36a2ef;
}
.facility-icon.hospital {
  color: #ff6384;
}
.facility-icon.bridge {
  color: #4bc0c0;
}
.facility-icon.tunnel {
  color: #ff9f40;
}

.facility-info {
  flex: 1;
}

.facility-name {
  font-size: 14px;
  font-weight: 500;
}

.facility-detail {
  font-size: 11px;
  color: #88a0b0;
}

.facility-risk {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.facility-risk.高风险 {
  background: rgba(255, 68, 68, 0.2);
  color: #ff8888;
}
.facility-risk.中风险 {
  background: rgba(255, 204, 68, 0.2);
  color: #ffcc88;
}
.facility-risk.极高风险 {
  background: rgba(255, 0, 0, 0.3);
  color: #ffaaaa;
}

/* 权重调节 */
.weight-sliders {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 150, 255, 0.2);
}

.weight-sliders h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #a0d0ff;
}

.slider-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.slider-item span {
  width: 80px;
  font-size: 12px;
}
</style>
