<template>
  <div class="ai-cockpit">
    <div class="cockpit-header">
      <div class="title-wrap">
        <h3>智能决策分析台</h3>
        <el-tag size="small" type="warning">AI 实时分析</el-tag>
        <el-tag size="small" type="info" class="role-tag">{{ currentRoleName }}</el-tag>
      </div>
      <div class="meta">
        <div class="meta-item">模型 {{ modelVersion }}</div>
        <div class="meta-item">{{ lastUpdated || '尚未生成' }}</div>
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
        <span class="label">建议动作</span>
        <span class="value">{{ summary.actionCount }}</span>
      </div>
      <div class="summary-card">
        <span class="label">影响人口</span>
        <span class="value">{{ totalAffectedPopulation }}</span>
      </div>
    </div>

    <!-- 现场文本输入区域 -->
    <div class="input-zone">
      <label for="dutyNote">现场文本信息</label>
      <textarea
        id="dutyNote"
        v-model="dutyNote"
        rows="3"
        placeholder="输入值班记录、巡查备注、降雨异常等文本信息"
      />
      <div class="action-row">
        <button class="generate-btn" :disabled="loading" @click="generateDecision">
          {{ loading ? '生成中...' : '更新决策' }}
        </button>
        <button class="demo-btn" :disabled="demoRunning" @click="runDemo">
          {{ demoRunning ? '流程执行中...' : '一键流程演示' }}
        </button>
      </div>
      <p v-if="error" class="error-tip">{{ error }}</p>
    </div>

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
        </header>

        <section class="decision-body">
          <!-- 执行对象 -->
          <div class="target-section">
            <span class="section-label">执行对象：</span>
            <span class="section-content">{{ getRoleSpecificTarget(item) }}</span>
          </div>
          
          <!-- 建议动作 - 分行显示 -->
          <div class="action-section">
            <span class="section-label">建议动作：</span>
            <div class="action-list">
              <div v-for="(actionLine, idx) in getActionLines(item)" :key="idx" class="action-item">
                {{ actionLine }}
              </div>
            </div>
          </div>

          <!-- 折叠区域：特征贡献和阈值命中，默认折叠 -->
          <div class="collapsible-section">
            <div class="collapsible-header" @click="toggleCollapse(item.id)">
              <span class="collapse-icon">{{ isCollapsed(item.id) ? '▶' : '▼' }}</span>
              <span class="collapse-title">技术详情</span>
              <span class="collapse-hint">(特征贡献、阈值命中)</span>
            </div>
            <div v-show="!isCollapsed(item.id)" class="collapsible-content">
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
import { useUserStore } from '@/stores/user'
import weatherService, { type WeatherData } from '@/services/weatherService'
import riskPointsData from '@/../public/data/risk_points.json'

const props = defineProps<{
  point: any
}>()

const userStore = useUserStore()
const userRole = computed(() => userStore.userInfo?.role || 'resident')
const userRoleLevel = computed(() => userStore.userInfo?.role_level || 3)

// 计算总影响人口（从 risk_points.json 中累加 threat 字段）
const totalAffectedPopulation = computed(() => {
  try {
    const points = riskPointsData.points || []
    let total = 0
    points.forEach((point: any) => {
      if (point.threat) {
        const match = point.threat.match(/\d+/)
        if (match) {
          total += parseInt(match[0], 10)
        }
      }
    })
    return total
  } catch (e) {
    return 504 // 默认值
  }
})

// 角色名称映射
const roleNameMap: Record<string, string> = {
  emergency_cmd: '应急指挥部',
  gov_dept: '政府部门',
  community: '基层单位',
  rescue_team: '救援队伍',
  utility_worker: '抢修人员',
  resident: '居民',
  tourist: '游客',
  business: '企业人员'
}

const currentRoleName = computed(() => roleNameMap[userRole.value] || '用户')

// 折叠状态管理，默认所有项都是折叠的
const collapsedItems = ref<Set<number>>(new Set())

const toggleCollapse = (id: number) => {
  if (collapsedItems.value.has(id)) {
    collapsedItems.value.delete(id)
  } else {
    collapsedItems.value.add(id)
  }
}

const isCollapsed = (id: number) => {
  return collapsedItems.value.has(id)
}

// 将建议动作拆分成多行（按句号或分号分割）
const getActionLines = (item: any) => {
  let actionText = getRoleSpecificAction(item)
  
  // 移除末尾多余的句号
  actionText = actionText.replace(/[。；]+$/, '')
  
  // 按句号、分号、换行符分割
  let lines = actionText.split(/[。；\n]/)
  
  // 过滤空行，并清理每行首尾空格
  lines = lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    // 去除以"-"开头的行前的空白，但保留"-"
    .map(line => line.replace(/^[-—]\s*/, '• '))
  
  // 如果分割后只有一行，尝试按关键词分割
  if (lines.length === 1 && actionText.length > 30) {
    // 按"、"分割作为备用
    const commaLines = actionText.split(/[、，]/)
    if (commaLines.length > 1) {
      lines = commaLines.map(l => l.trim()).filter(l => l.length > 0)
    }
  }
  
  return lines
}

// 根据角色生成不同的建议动作（不带重复标点）
const getRoleSpecificAction = (item: any) => {
  const baseAction = item.action || ''
  // 清理基础动作中的重复标点
  let cleanBaseAction = baseAction.replace(/[。；]+$/, '').replace(/[。；]{2,}/g, '。')
  
  switch (userRole.value) {
    case 'emergency_cmd':
      return `${cleanBaseAction}。请立即启动应急响应预案，协调救援力量待命，通知相关单位做好物资准备`
    case 'gov_dept':
      return `${cleanBaseAction}。请督促相关单位落实防范措施，24小时内报送落实情况`
    case 'community':
      return `${cleanBaseAction}。立即组织网格员对辖区内隐患点进行巡查，通过微信群/广播通知居民做好防范，重点区域安排专人值守`
    case 'rescue_team':
      return `${cleanBaseAction}。请救援队伍集结待命，检查救援装备，确保30分钟内可出动`
    case 'utility_worker':
      return `${cleanBaseAction}。请抢修人员检查基础设施，做好应急抢修准备，保障水电气通信畅通`
    case 'resident':
      return `${cleanBaseAction}。请密切关注预警信息，避免前往危险区域，提前做好转移准备`
    case 'tourist':
      return `${cleanBaseAction}。请暂停前往地质灾害高风险景区，已在景区的游客听从工作人员指引`
    case 'business':
      return `${cleanBaseAction}。请企业暂停户外高危作业，检查厂区边坡稳定情况，做好应急准备`
    default:
      return cleanBaseAction
  }
}

// 根据角色生成不同的执行对象
const getRoleSpecificTarget = (item: any) => {
  const baseTarget = item.target || ''
  
  switch (userRole.value) {
    case 'emergency_cmd':
      return `${baseTarget}、应急指挥部、各联动单位`
    case 'gov_dept':
      return `${baseTarget}、相关监管部门`
    case 'community':
      return `${baseTarget}、社区网格员、辖区居民`
    case 'rescue_team':
      return `${baseTarget}、救援队伍`
    case 'utility_worker':
      return `${baseTarget}、抢修班组`
    default:
      return baseTarget
  }
}

// 可编辑的现场文本
const dutyNote = ref('巡查员反馈：汤山北麓沟谷口有新裂缝，昨夜累计降雨38mm。')
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
      
      if (weather.rain_intensity !== 'none' && !dutyNote.value.includes('降雨')) {
        console.log(`当前天气: ${weather.rainfall}`)
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
  userRole: userRole.value,
  userRoleLevel: userRoleLevel.value
})

const generateDecision = async () => {
  await aiStore.refreshDecision(buildRequest())
  if (error.value) {
    ElMessage.error(error.value)
    return
  }
  // 新决策生成后，将所有新项设为折叠状态
  if (decisions.value.length) {
    decisions.value.forEach(item => {
      collapsedItems.value.add(item.id)
    })
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

// 监听 decisions 变化，确保新添加的项默认折叠
watch(decisions, (newDecisions) => {
  if (newDecisions.length) {
    newDecisions.forEach(item => {
      if (!collapsedItems.value.has(item.id)) {
        collapsedItems.value.add(item.id)
      }
    })
  }
}, { immediate: true, deep: true })
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
  flex-wrap: wrap;
}

.cockpit-header h3 {
  margin: 0;
  color: #00f0ff;
  font-size: 18px;
}

.role-tag {
  background: rgba(0, 150, 200, 0.3);
  border-color: rgba(0, 200, 255, 0.5);
  color: #7bc5ff;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;
}

.meta-item {
  font-size: 11px;
  color: #87a5bf;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(0, 180, 255, 0.2);
  background: rgba(0, 65, 104, 0.24);
  white-space: nowrap;
}

.mode-tag {
  font-size: 11px;
  color: #9fe99f;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(92, 209, 92, 0.25);
  background: rgba(36, 92, 36, 0.26);
  cursor: pointer;
  white-space: nowrap;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  line-height: 1.4;
  word-break: break-word;
  white-space: normal;
}

.decision-head p {
  margin: 3px 0 0;
  color: #90adc4;
  font-size: 12px;
}

.decision-body {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 执行对象和动作样式 */
.target-section,
.action-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.section-label {
  color: #8fb4cd;
  font-weight: 500;
  min-width: 65px;
}

.section-content {
  color: #c7dced;
  flex: 1;
}

.action-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.action-item {
  color: #c7dced;
  position: relative;
  padding-left: 12px;
}

.action-item::before {
  content: "•";
  position: absolute;
  left: 0;
  color: #00f0ff;
}

/* 折叠区域样式 */
.collapsible-section {
  margin-top: 6px;
}

.collapsible-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 8px;
  background: rgba(0, 100, 150, 0.2);
  border-radius: 6px;
  transition: background 0.2s;
}

.collapsible-header:hover {
  background: rgba(0, 120, 180, 0.3);
}

.collapse-icon {
  font-size: 10px;
  color: #00f0ff;
}

.collapse-title {
  font-size: 12px;
  color: #8fb4cd;
}

.collapse-hint {
  font-size: 10px;
  color: #6c8eaa;
}

.collapsible-content {
  margin-top: 8px;
  padding-left: 20px;
}

.explain-block {
  border: 1px solid rgba(0, 180, 255, 0.2);
  border-radius: 8px;
  background: rgba(2, 26, 43, 0.5);
  padding: 8px;
  margin-bottom: 8px;
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
  margin: 8px 0 0;
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
