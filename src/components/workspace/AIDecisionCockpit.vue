<template>
  <div class="ai-cockpit">
    <div class="cockpit-header">
      <div class="title-wrap">
        <h3>智能决策分析台</h3>
        <el-tag size="small" type="warning">AI 实时分析</el-tag>
      </div>
      <div class="meta">
        <span class="model-tag">模型 {{ modelVersion }}</span>
        <span class="time-tag">{{ lastUpdated || '尚未生成' }}</span>
        <button class="mode-tag" @click="switchMode">数据源 {{ modeLabel }}</button>
      </div>
    </div>

    <!-- 天气信息卡片 -->
    <div class="weather-card" v-if="weatherInfo">
      <div class="weather-icon">🌤️</div>
      <div class="weather-info">
        <div class="weather-city">{{ weatherInfo.city }}</div>
        <div class="weather-detail">{{ weatherInfo.weather }} | {{ weatherInfo.temperature }} | 湿度 {{ weatherInfo.humidity }}</div>
        <div class="weather-rain" v-if="weatherInfo.rain_intensity !== 'none'">
          ⚠️ {{ weatherInfo.rainfall }}，请加强巡查
        </div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <span class="label">高风险点</span>
        <span class="value danger">{{ summary.highRiskCount }}</span>
      </div>
      <div class="summary-card">
        <span class="label">建议动作</span>
        <span class="value">{{ summary.actionCount }}</span>
      </div>
      <div class="summary-card">
        <span class="label">影响人口</span>
        <span class="value">{{ summary.affectedPopulation }}</span>
      </div>
    </div>

    <div class="action-row" style="margin-top: 10px;">
      <button class="generate-btn" :disabled="loading" @click="generateDecision">
        {{ loading ? '生成中...' : '更新决策' }}
      </button>
      <button class="demo-btn" :disabled="demoRunning" @click="runDemo">
        {{ demoRunning ? '流程执行中...' : '一键流程演示' }}
      </button>
    </div>
    <p v-if="error" class="error-tip">{{ error }}</p>

    <div class="demo-script">
      <h4>演示流程状态</h4>
      <div class="demo-steps">
        <div v-for="step in demoSteps" :key="step.key" class="demo-step" :class="step.status">
          <span class="step-label">{{ step.label }}</span>
          <span class="step-detail">{{ step.detail }}</span>
        </div>
      </div>
    </div>

    <div class="decision-list">
      <article v-for="item in decisions" :key="item.id" class="decision-card" :class="item.level">
        <header class="decision-head">
          <div>
            <h4>{{ item.title }}</h4>
            <p>{{ item.window }}</p>
          </div>
          <div class="score">{{ item.confidence }}%</div>
        </header>

        <section class="decision-body">
          <p class="action">建议动作：{{ item.action }}</p>
          <p class="target">执行对象：{{ item.target }}</p>

          <div class="explain-block">
            <p class="explain-title">特征贡献</p>
            <ul>
              <li v-for="feature in item.explanation.featureContributions" :key="feature.featureName">
                {{ feature.featureName }}
                <span class="explain-value">{{ feature.currentValue }}</span>
                <span class="explain-weight">贡献 {{ (feature.contribution * 100).toFixed(1) }}%</span>
              </li>
            </ul>
          </div>

          <div class="explain-block">
            <p class="explain-title">阈值命中</p>
            <div class="threshold-list">
              <span
                v-for="threshold in item.explanation.thresholdHits"
                :key="threshold.ruleName"
                class="threshold-chip"
                :class="threshold.status"
              >
                {{ threshold.ruleName }} {{ threshold.currentValue }}/{{ threshold.threshold }}{{ threshold.unit }}
              </span>
            </div>
          </div>

          <p class="window-line">
            数据时间窗：{{ item.explanation.dataTimeWindow.startAt }} 至
            {{ item.explanation.dataTimeWindow.endAt }}
            · 步长 {{ item.explanation.dataTimeWindow.step }}
            · {{ item.explanation.dataTimeWindow.source }}
          </p>
        </section>

        <footer class="decision-foot">
          <button class="primary" @click="markExecuted(item.id)">标记已执行</button>
          <button class="ghost" @click="markReview(item.id)">转人工复核</button>
          <span class="status">状态：{{ item.status }}</span>
        </footer>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAiStore } from '@/stores/ai'
import weatherService, { type WeatherData } from '@/services/weatherService'

const props = defineProps<{
  point: any
}>()

const dutyNote = ref('巡查员反馈：汤山北麓沟谷口有新裂缝')
const weatherInfo = ref<WeatherData | null>(null)
const isLoadingWeather = ref(false)

const aiStore = useAiStore()
const { mode, loading, error, modelVersion, lastUpdated, summary, decisions, demoRunning, demoSteps } = storeToRefs(aiStore)

const pointName = computed(() => props.point?.name || '重点监测点')
const modeLabel = computed(() => (mode.value === 'real' ? '接口(阿里云)' : '模拟数据'))

// 获取天气信息
const getWeather = async () => {
  if (!props.point?.lng || !props.point?.lat) {
    console.log('无坐标信息，无法获取天气')
    return
  }
  
  isLoadingWeather.value = true
  try {
    const weather = await weatherService.getWeatherByLocation(props.point.lng, props.point.lat)
    if (weather) {
      weatherInfo.value = weather
      
      // 如果有降雨，更新 dutyNote
      if (weather.rain_intensity !== 'none') {
        const rainDesc = weatherService.buildWeatherDescription(weather)
        dutyNote.value = `巡查员反馈：${props.point?.name || '监测点'}有裂缝迹象。${rainDesc}`
      }
    }
  } catch (error) {
    console.error('获取天气失败:', error)
  } finally {
    isLoadingWeather.value = false
  }
}

const buildRequest = () => ({
  pointName: pointName.value,
  lng: props.point?.lng,
  lat: props.point?.lat,
  dutyNote: dutyNote.value,
  scene: 'workspace' as const,
})

const generateDecision = async () => {
  await aiStore.refreshDecision(buildRequest())
  if (error.value) {
    ElMessage.error(error.value)
    return
  }
  ElMessage.success('决策结果已更新')
}

const runDemo = async () => {
  await aiStore.runDemoScript(buildRequest())
  if (error.value) {
    ElMessage.error(error.value)
    return
  }
  ElMessage.success('流程演示已完成')
}

const switchMode = async () => {
  aiStore.toggleMode()
  await generateDecision()
}

const markExecuted = (id: number) => {
  aiStore.markExecuted(id)
}

const markReview = (id: number) => {
  aiStore.markReview(id)
}

onMounted(() => {
  getWeather()
  if (!decisions.value.length) {
    generateDecision()
  }
})

watch(
  () => props.point,
  (newPoint, oldPoint) => {
    if (!newPoint || newPoint?.id === oldPoint?.id) return
    getWeather()
    generateDecision()
  }
)

const dutyNote = ref('巡查员反馈：汤山北麓沟谷口有新裂缝，昨夜累计降雨38mm。')

const aiStore = useAiStore()
const { mode, loading, error, modelVersion, lastUpdated, summary, decisions, demoRunning, demoSteps } = storeToRefs(aiStore)

const pointName = computed(() => props.point?.name || '重点监测点')
const modeLabel = computed(() => (mode.value === 'real' ? '接口(阿里云)' : '模拟数据'))

const buildRequest = () => ({
  pointName: pointName.value,
  lng: props.point?.lng,
  lat: props.point?.lat,
  dutyNote: dutyNote.value,
  scene: 'workspace' as const,
})

const generateDecision = async () => {
  await aiStore.refreshDecision(buildRequest())
  if (error.value) {
    ElMessage.error(error.value)
    return
  }
  ElMessage.success('决策结果已更新')
}

const runDemo = async () => {
  await aiStore.runDemoScript(buildRequest())
  if (error.value) {
    ElMessage.error(error.value)
    return
  }
  ElMessage.success('流程演示已完成')
}

const switchMode = async () => {
  aiStore.toggleMode()
  await generateDecision()
}

const markExecuted = (id: number) => {
  aiStore.markExecuted(id)
}

const markReview = (id: number) => {
  aiStore.markReview(id)
}

onMounted(() => {
  if (!decisions.value.length) {
    generateDecision()
  }
})

watch(
  () => props.point,
  (newPoint, oldPoint) => {
    if (!newPoint || newPoint?.id === oldPoint?.id) return
    generateDecision()
  }
)
</script>

<style scoped>
.ai-cockpit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cockpit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cockpit-header h3 {
  margin: 0;
  color: #00f0ff;
  font-size: 18px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.model-tag,
.time-tag,
.mode-tag {
  font-size: 11px;
  color: #87a5bf;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(0, 180, 255, 0.2);
  background: rgba(0, 65, 104, 0.24);
}

.mode-tag {
  color: #9fe99f;
  border-color: rgba(92, 209, 92, 0.25);
  background: rgba(36, 92, 36, 0.26);
  cursor: pointer;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-radius: 10px;
  border: 1px solid rgba(0, 180, 255, 0.2);
  background: rgba(0, 38, 65, 0.35);
  padding: 10px;
}

.label {
  color: #87a5bf;
  font-size: 11px;
}

.value {
  color: #00f0ff;
  font-size: 20px;
  font-weight: 700;
}

.value.danger {
  color: #ff6464;
}

.input-zone {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid rgba(0, 180, 255, 0.2);
  background: rgba(0, 32, 56, 0.35);
  border-radius: 10px;
  padding: 10px;
}

.input-zone label {
  font-size: 12px;
  color: #8db0c9;
}

.input-zone textarea {
  width: 100%;
  resize: vertical;
  min-height: 70px;
  border: 1px solid rgba(0, 180, 255, 0.28);
  border-radius: 8px;
  background: rgba(1, 24, 42, 0.78);
  color: #dceeff;
  padding: 8px;
}

.generate-btn {
  align-self: flex-end;
  border: 1px solid rgba(0, 220, 255, 0.45);
  background: linear-gradient(135deg, rgba(0, 133, 214, 0.95), rgba(0, 92, 205, 0.95));
  color: #fff;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
}

.action-row {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.demo-btn {
  border: 1px solid rgba(255, 196, 90, 0.4);
  background: rgba(119, 90, 8, 0.32);
  color: #ffd98e;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
}

.demo-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-tip {
  margin: 2px 0 0;
  font-size: 12px;
  color: #ff8d8d;
}

.demo-script {
  border: 1px solid rgba(0, 180, 255, 0.2);
  border-radius: 10px;
  background: rgba(0, 32, 56, 0.35);
  padding: 10px;
}

.demo-script h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: #9ec4dd;
}

.demo-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.demo-step {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #89adc8;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid rgba(0, 180, 255, 0.18);
}

.demo-step.running {
  border-color: rgba(255, 196, 90, 0.45);
  color: #ffd98e;
}

.demo-step.done {
  border-color: rgba(92, 209, 92, 0.4);
  color: #9fe99f;
}

.step-detail {
  opacity: 0.85;
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.decision-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.decision-card {
  border-radius: 12px;
  border: 1px solid rgba(0, 180, 255, 0.2);
  background: rgba(0, 34, 58, 0.38);
  padding: 12px;
}

.decision-card.danger {
  border-color: rgba(255, 100, 100, 0.45);
}

.decision-card.warning {
  border-color: rgba(255, 196, 90, 0.4);
}

.decision-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.decision-head h4 {
  margin: 0;
  color: #e5f2ff;
  font-size: 14px;
}

.decision-head p {
  margin: 3px 0 0;
  color: #90adc4;
  font-size: 12px;
}

.score {
  color: #00f0ff;
  font-size: 18px;
  font-weight: 700;
}

.decision-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action,
.target {
  margin: 0;
  font-size: 12px;
  color: #c7dced;
  line-height: 1.5;
}

.explain-block {
  border: 1px solid rgba(0, 180, 255, 0.2);
  border-radius: 8px;
  background: rgba(2, 26, 43, 0.5);
  padding: 8px;
}

.explain-title {
  margin: 0 0 6px;
  font-size: 12px;
  color: #8fb4cd;
}

.explain-block ul {
  margin: 0;
  padding-left: 15px;
}

.explain-block li {
  margin-bottom: 4px;
  font-size: 12px;
  color: #b9d2e5;
}

.explain-value {
  color: #9cd7ff;
  margin-left: 6px;
}

.explain-weight {
  color: #00f0ff;
  margin-left: 8px;
}

.threshold-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.threshold-chip {
  font-size: 11px;
  color: #9dc1d8;
  border-radius: 12px;
  padding: 3px 8px;
  border: 1px solid rgba(0, 180, 255, 0.28);
  background: rgba(0, 61, 94, 0.25);
}

.threshold-chip.hit {
  border-color: rgba(255, 106, 106, 0.45);
  color: #ff9090;
  background: rgba(105, 25, 25, 0.25);
}

.threshold-chip.near {
  border-color: rgba(255, 196, 90, 0.45);
  color: #ffd98e;
  background: rgba(119, 90, 8, 0.24);
}

.window-line {
  margin: 0;
  font-size: 11px;
  color: #8db0c9;
}

.decision-foot {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.primary,
.ghost {
  border-radius: 6px;
  font-size: 12px;
  padding: 5px 10px;
  cursor: pointer;
}

.primary {
  border: 1px solid rgba(0, 220, 255, 0.4);
  background: rgba(0, 126, 208, 0.28);
  color: #dff4ff;
}

.ghost {
  border: 1px solid rgba(255, 196, 90, 0.35);
  background: rgba(119, 90, 8, 0.24);
  color: #ffd98e;
}

.status {
  margin-left: auto;
  color: #89adc8;
  font-size: 12px;
}

.weather-card {
  display: flex;
  gap: 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 180, 255, 0.2);
  background: linear-gradient(135deg, rgba(0, 80, 120, 0.35), rgba(0, 40, 60, 0.35));
  padding: 12px;
  margin-bottom: 10px;
}

.weather-icon {
  font-size: 32px;
}

.weather-info {
  flex: 1;
}

.weather-city {
  font-size: 14px;
  font-weight: bold;
  color: #00f0ff;
}

.weather-detail {
  font-size: 12px;
  color: #c7dced;
  margin-top: 4px;
}

.weather-rain {
  font-size: 11px;
  color: #ffd98e;
  margin-top: 6px;
}

</style>