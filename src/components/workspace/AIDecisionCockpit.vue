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

    <!-- 根据角色显示不同的交互区域 -->
    <!-- 居民身份：个人安全状态 -->
    <div class="input-zone" v-if="userRole === 'resident'">
      <label for="safetyStatus">个人安全状态</label>
      <div class="safety-options">
        <div class="safety-option" @click="selectSafetyOption('safe')" :class="{ active: safetyStatus === 'safe' }">
          <span class="safety-icon">✅</span>
          <span>安全</span>
        </div>
        <div class="safety-option" @click="selectSafetyOption('warning')" :class="{ active: safetyStatus === 'warning' }">
          <span class="safety-icon">⚠️</span>
          <span>有风险迹象</span>
        </div>
        <div class="safety-option" @click="selectSafetyOption('danger')" :class="{ active: safetyStatus === 'danger' }">
          <span class="safety-icon">🚨</span>
          <span>需要帮助</span>
        </div>
      </div>
      <div class="safety-note" v-if="safetyStatus === 'warning' || safetyStatus === 'danger'">
        <textarea
          v-model="safetyDetail"
          rows="2"
          placeholder="请描述具体情况..."
        />
      </div>
      <div class="action-row">
        <button class="generate-btn" :disabled="loading" @click="submitSafetyReport">
          {{ loading ? '提交中...' : '上报安全状态' }}
        </button>
      </div>
    </div>

    <!-- 基层单位身份：巡查情况 -->
    <div class="input-zone" v-if="userRole === 'community'">
      <label for="patrolStatus">巡查情况</label>
      <div class="patrol-options">
        <div class="patrol-option" @click="selectPatrolOption('safe')" :class="{ active: patrolStatus === 'safe' }">
          <span class="patrol-icon">✅</span>
          <span>一切正常</span>
        </div>
        <div class="patrol-option" @click="selectPatrolOption('crack')" :class="{ active: patrolStatus === 'crack' }">
          <span class="patrol-icon">🔄</span>
          <span>发现新裂缝</span>
        </div>
        <div class="patrol-option" @click="selectPatrolOption('landslide')" :class="{ active: patrolStatus === 'landslide' }">
          <span class="patrol-icon">⛰️</span>
          <span>滑坡迹象</span>
        </div>
      </div>
      <div class="patrol-note" v-if="patrolStatus !== 'safe'">
        <textarea
          v-model="patrolDetail"
          rows="2"
          placeholder="请描述具体情况、位置..."
        />
      </div>
      <div class="action-row">
        <button class="generate-btn" :disabled="loading" @click="submitPatrolReport">
          {{ loading ? '提交中...' : '上报巡查情况' }}
        </button>
        <button class="demo-btn" :disabled="demoRunning" @click="runDemo">
          {{ demoRunning ? '流程执行中...' : '一键流程演示' }}
        </button>
      </div>
    </div>

    <!-- 应急指挥部身份：指令下发 -->
    <div class="input-zone" v-if="userRole === 'emergency_cmd'">
      <label for="command">应急指令</label>
      <div class="command-options">
        <div class="command-option" @click="selectCommand('evacuate')" :class="{ active: selectedCommand === 'evacuate' }">
          <span class="command-icon">🚶</span>
          <span>人员转移</span>
        </div>
        <div class="command-option" @click="selectCommand('resource')" :class="{ active: selectedCommand === 'resource' }">
          <span class="command-icon">📦</span>
          <span>物资调配</span>
        </div>
        <div class="command-option" @click="selectCommand('rescue')" :class="{ active: selectedCommand === 'rescue' }">
          <span class="command-icon">🆘</span>
          <span>救援出动</span>
        </div>
      </div>
      <textarea
        v-model="commandDetail"
        rows="2"
        placeholder="输入具体指令内容..."
      />
      <div class="action-row">
        <button class="generate-btn" :disabled="loading" @click="submitCommand">
          {{ loading ? '发布中...' : '发布指令' }}
        </button>
        <button class="demo-btn" :disabled="demoRunning" @click="runDemo">
          {{ demoRunning ? '流程执行中...' : '一键流程演示' }}
        </button>
      </div>
    </div>

    <!-- 其他身份：保留原有文本输入 -->
    <div class="input-zone" v-if="!['resident', 'community', 'emergency_cmd'].includes(userRole)">
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
    </div>

    <p v-if="error" class="error-tip">{{ error }}</p>
          
    <div class="decision-list">
      <article v-for="item in decisions" :key="item.id" class="decision-card" :class="item.level">
        <header class="decision-head">
          <div>
            <h4>{{ item.title }}</h4>
            <p>{{ item.window }}</p>
          </div>
        </header>

        <section class="decision-body">
          <div class="target-section">
            <span class="section-label">执行对象：</span>
            <span class="section-content">{{ getRoleSpecificTarget(item) }}</span>
          </div>
          
          <div class="action-section">
            <span class="section-label">建议动作：</span>
            <div class="action-list">
              <div v-for="(actionLine, idx) in getActionLines(item)" :key="idx" class="action-item">
                {{ actionLine }}
              </div>
            </div>
          </div>

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

// 居民身份相关状态
const safetyStatus = ref('')
const safetyDetail = ref('')

// 基层单位身份相关状态
const patrolStatus = ref('')
const patrolDetail = ref('')

// 应急指挥部身份相关状态
const selectedCommand = ref('')
const commandDetail = ref('')

// 其他身份
const dutyNote = ref('巡查员反馈：汤山北麓沟谷口有新裂缝，昨夜累计降雨38mm。')

// 计算总影响人口
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
    return 504
  }
})

// 居民上报安全状态
const submitSafetyReport = async () => {
  if (!safetyStatus.value) {
    ElMessage.warning('请选择您的安全状态')
    return
  }
  
  let reportText = `居民上报：安全状态 - ${safetyStatus.value === 'safe' ? '安全' : safetyStatus.value === 'warning' ? '有风险迹象' : '需要帮助'}`
  if (safetyDetail.value) {
    reportText += `，详情：${safetyDetail.value}`
  }
  
  dutyNote.value = reportText
  await generateDecision()
  
  // 清空状态
  safetyStatus.value = ''
  safetyDetail.value = ''
}

// 基层单位上报巡查情况
const submitPatrolReport = async () => {
  if (!patrolStatus.value) {
    ElMessage.warning('请选择巡查情况')
    return
  }
  
  let reportText = `基层单位巡查：${patrolStatus.value === 'safe' ? '一切正常' : patrolStatus.value === 'crack' ? '发现新裂缝' : '发现滑坡迹象'}`
  if (patrolDetail.value) {
    reportText += `，详情：${patrolDetail.value}`
  }
  
  dutyNote.value = reportText
  await generateDecision()
  
  patrolStatus.value = ''
  patrolDetail.value = ''
}

// 应急指挥部发布指令
const submitCommand = async () => {
  if (!selectedCommand.value) {
    ElMessage.warning('请选择指令类型')
    return
  }
  
  if (!commandDetail.value) {
    ElMessage.warning('请输入具体指令内容')
    return
  }
  
  const commandMap: Record<string, string> = {
    evacuate: '人员转移',
    resource: '物资调配',
    rescue: '救援出动'
  }
  
  dutyNote.value = `【指挥部指令】${commandMap[selectedCommand.value]}：${commandDetail.value}`
  await generateDecision()
  
  selectedCommand.value = ''
  commandDetail.value = ''
}

// 选择安全状态
const selectSafetyOption = (status: string) => {
  safetyStatus.value = status
}

// 选择巡查情况
const selectPatrolOption = (status: string) => {
  patrolStatus.value = status
}

// 选择指令类型
const selectCommand = (command: string) => {
  selectedCommand.value = command
}

const weatherInfo = ref<WeatherData | null>(null)

const aiStore = useAiStore()
const { mode, loading, error, modelVersion, lastUpdated, summary, decisions, demoRunning, demoSteps } = storeToRefs(aiStore)

const pointName = computed(() => props.point?.name || '重点监测点')
const modeLabel = computed(() => (mode.value === 'real' ? '接口(阿里云)' : '模拟数据'))

const getWeather = async () => {
  console.log('🌤️ getWeather 被调用')
  console.log('props.point:', props.point)
  console.log('lng:', props.point?.lng, 'lat:', props.point?.lat)
  
  if (!props.point) {
    console.log('❌ props.point 为空')
    return
  }
  
  if (!props.point.lng || !props.point.lat) {
    console.log('❌ 缺少经纬度数据')
    return
  }
  
  try {
    console.log('📡 开始获取天气...')
    const weather = await weatherService.getWeatherByLocation(props.point.lng, props.point.lat)
    if (weather) {
      weatherInfo.value = weather
      console.log('✅ 天气获取成功:', weather)
    } else {
      console.log('❌ 天气数据为空')
    }
  } catch (error) {
    console.error('获取天气失败:', error)
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

// 角色相关函数
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

const getActionLines = (item: any) => {
  let actionText = getRoleSpecificAction(item)
  actionText = actionText.replace(/[。；]+$/, '')
  let lines = actionText.split(/[。；\n]/)
  lines = lines
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .map((line: string) => line.replace(/^[-—]\s*/, '• '))
  if (lines.length === 1 && actionText.length > 30) {
    const commaLines = actionText.split(/[、，]/)
    if (commaLines.length > 1) {
      lines = commaLines.map((l: string) => l.trim()).filter((l: string) => l.length > 0)
    }
  }
  return lines
}

const getRoleSpecificAction = (item: any) => {
  const baseAction = item.action || ''
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

/* 新增样式 */
.safety-options,
.patrol-options,
.command-options {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.safety-option,
.patrol-option,
.command-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 50, 80, 0.4);
  border: 1px solid rgba(0, 180, 255, 0.3);
  cursor: pointer;
  transition: all 0.2s;
}

.safety-option:hover,
.patrol-option:hover,
.command-option:hover {
  background: rgba(0, 100, 150, 0.4);
  border-color: rgba(0, 200, 255, 0.6);
}

.safety-option.active,
.patrol-option.active,
.command-option.active {
  background: rgba(0, 150, 200, 0.5);
  border-color: #00f0ff;
  box-shadow: 0 0 8px rgba(0, 240, 255, 0.3);
}

.safety-icon,
.patrol-icon,
.command-icon {
  font-size: 24px;
}

.safety-option span:last-child,
.patrol-option span:last-child,
.command-option span:last-child {
  font-size: 12px;
  color: #c7dced;
}

.safety-note,
.patrol-note {
  margin-bottom: 12px;
}

.safety-note textarea,
.patrol-note textarea {
  width: 100%;
  border: 1px solid rgba(0, 180, 255, 0.28);
  border-radius: 8px;
  background: rgba(1, 24, 42, 0.78);
  color: #dceeff;
  padding: 8px;
  resize: vertical;
}
</style>
