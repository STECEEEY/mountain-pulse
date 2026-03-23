<template>
  <div class="ai-suggestions">
    <div class="header">
      <h3>🤖 AI决策建议</h3>
        <el-button size="small" :icon="Refresh" circle @click="refreshSuggestions" :loading="loading" />
      </el-badge>
    </div>

    <div class="chat-container">
      <!-- AI 决策建议卡片（动态生成） -->
      <div v-if="aiSuggestion" class="suggestion-card">
        <div class="ai-avatar">AI</div>
        <div class="suggestion-content">
          <div class="suggestion-text">
            <p>基于当前宁镇山脉区域的风险分析，发现以下关键问题：</p>
            <ul>
              <li v-for="(issue, idx) in aiSuggestion.issues" :key="idx">
                {{ issue.icon }} <span class="highlight">{{ issue.area }}</span> {{ issue.description }}
              </li>
              <li v-if="aiSuggestion.weatherWarning">
                📊 {{ aiSuggestion.weatherWarning }}
              </li>
            </ul>
            <p class="recommendation">
              💡 <strong>推荐行动方案：</strong> {{ aiSuggestion.recommendation }}
            </p>
          </div>
          <div class="suggestion-time">{{ aiSuggestion.time }}</div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading && !aiSuggestion" class="loading-card">
        <div class="ai-avatar">AI</div>
        <div class="suggestion-content">
          <div class="suggestion-text">
            <p>🤔 AI 正在分析数据...</p>
          </div>
        </div>
      </div>

      <!-- 应急资源调度（动态生成） -->
      <div v-if="resourceData" class="resource-card">
        <h4>应急资源调度建议</h4>
        <div class="resource-grid">
          <div class="resource-item">
            <span class="resource-label">最近救援队</span>
            <span class="resource-value">{{ resourceData.nearestTeam }}</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">可用物资</span>
            <span class="resource-value">{{ resourceData.availableSupplies }}</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">最优路线</span>
            <span class="resource-value">{{ resourceData.bestRoute }}</span>
          </div>
        </div>
      </div>

      <!-- 用户对话历史 -->
      <div v-for="(msg, idx) in chatHistory" :key="idx" class="message-item" :class="msg.role">
        <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
        <div class="message-content">{{ msg.content }}</div>
      </div>

      <!-- 用户输入框 -->
      <div class="input-area">
        <el-input
          v-model="userInput"
          placeholder="输入具体问题，如'汤山小学的疏散方案'..."
          :prefix-icon="Message"
          @keyup.enter="sendMessage"
          :disabled="loading"
        >
          <template #append>
            <el-button @click="sendMessage" :loading="loading">发送</el-button>
          </template>
        </el-input>
      </div>

      <!-- 快捷问题 -->
      <div class="quick-questions">
        <el-tag 
          v-for="q in quickQuestions" 
          :key="q" 
          size="small" 
          @click="userInput = q"
          :disabled="loading"
        >
          {{ q }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElButton, ElInput, ElBadge, ElTag, ElMessage } from 'element-plus'
import { Refresh, Message } from '@element-plus/icons-vue'
import { riskService } from '@/services/riskService'

// 状态
const userInput = ref('')
const loading = ref(false)
const aiSuggestion = ref<any>(null)
const resourceData = ref<any>(null)
const chatHistory = ref<Array<{ role: string; content: string }>>([])
const aiBadgeCount = ref(0)
const aiBadgeType = ref('danger')

// 快捷问题
const quickQuestions = ref([
  '汤山小学如何疏散？',
  '最近救援队位置？',
  '高风险点转移路线',
  '物资需求预测',
])

// 获取当前风险统计数据
const getRiskStats = async () => {
  try {
    const response = await riskService.loadRiskPoints()
    const points = response.points
    
    return {
      highRiskCount: points.filter((p: any) => p.level === '极高风险').length,
      riskCount: points.filter((p: any) => p.level === '高风险').length,
      mediumRiskCount: points.filter((p: any) => p.level === '中风险').length,
      lowRiskCount: points.filter((p: any) => p.level === '低风险').length,
      // 获取前几个高风险点名称
      topRiskAreas: points
        .filter((p: any) => p.level === '极高风险')
        .slice(0, 3)
        .map((p: any) => ({ name: p.name, type: p.type }))
    }
  } catch (error) {
    console.error('获取风险数据失败', error)
    return null
  }
}

// 获取降雨数据（从你的模块获取）
const getRainfallData = async () => {
  // 这里可以根据实际情况获取
  return 96.5 // 示例数据
}

// 调用 AI 生成决策建议
const generateAISuggestion = async () => {
  loading.value = true
  
  try {
    const riskStats = await getRiskStats()
    const rainfall = await getRainfallData()
    
    if (!riskStats) {
      ElMessage.error('无法获取风险数据')
      return
    }
    
    const response = await fetch('http://localhost:3000/api/ai/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riskData: riskStats,
        rainfall: rainfall
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      throw new Error(data.error)
    }
    
    // 格式化 AI 返回的数据为 UI 可用的格式
    aiSuggestion.value = {
      issues: [
        {
          icon: '🚨',
          area: riskStats.topRiskAreas[0]?.name || '高风险区域',
          description: `（${data.riskLevel}风险）${data.mainThreat}`
        }
      ],
      weatherWarning: data.warning,
      recommendation: data.actions?.join('；') || data.mainThreat,
      time: '刚刚'
    }
    
    resourceData.value = {
      nearestTeam: '汤山救援队 (2.3km)',
      availableSupplies: '帐篷200顶、食品5吨',
      bestRoute: 'G42沪蓉高速 → 汤泉路'
    }
    
    aiBadgeCount.value = 1
    
  } catch (error) {
    console.error('AI 调用失败', error)
    ElMessage.error('AI 决策生成失败，请稍后重试')
    // 使用本地默认建议
    aiSuggestion.value = {
      issues: [
        { icon: '🚨', area: '汤山滑坡群', description: '（极高风险）威胁2所学校、1座桥梁，建议立即启动应急预案' },
        { icon: '⚠️', area: '宝华山崩塌', description: '（高风险）影响范围约0.5km²，威胁居民830人' }
      ],
      weatherWarning: '未来72小时降雨量预计增加60%，可能触发新的滑坡点',
      recommendation: '立即组织汤山小学师生疏散，在宝华山路段设置警戒线，启动24小时监测。',
      time: '刚刚'
    }
  } finally {
    loading.value = false
  }
}

// 刷新建议
const refreshSuggestions = () => {
  generateAISuggestion()
}

// 发送用户问题
const sendMessage = async () => {
  if (!userInput.value.trim()) return
  
  const question = userInput.value
  chatHistory.value.push({ role: 'user', content: question })
  userInput.value = ''
  loading.value = true
  
  try {
    const riskStats = await getRiskStats()
    const rainfall = await getRainfallData()
    
    const response = await fetch('http://localhost:3000/api/ai/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riskData: riskStats,
        rainfall: rainfall,
        question: question  // 传入用户的具体问题
      })
    })
    
    const data = await response.json()
    
    chatHistory.value.push({ 
      role: 'ai', 
      content: data.answer || data.mainThreat || '根据当前数据，建议加强监测和巡查。' 
    })
    
  } catch (error) {
    chatHistory.value.push({ 
      role: 'ai', 
      content: '抱歉，暂时无法获取AI建议，请稍后重试。' 
    })
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  generateAISuggestion()
})
</script>


<style scoped>
.ai-suggestions {
  background: rgba(10, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  color: #e0f0ff;
  border: 1px solid rgba(0, 200, 255, 0.2);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h3 {
  margin: 0;
  color: #00f0ff;
  text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.suggestion-card {
  display: flex;
  gap: 12px;
}

.ai-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #00c6ff, #0072ff);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
}

.suggestion-content {
  flex: 1;
  background: rgba(0, 50, 80, 0.4);
  border-radius: 12px;
  padding: 12px;
  position: relative;
}

.suggestion-text {
  font-size: 13px;
  line-height: 1.6;
}

.suggestion-text p {
  margin: 0 0 8px 0;
}

.suggestion-text ul {
  margin: 0 0 8px 0;
  padding-left: 20px;
}

.suggestion-text li {
  margin-bottom: 6px;
}

.highlight {
  color: #ffaa00;
  font-weight: bold;
}

.recommendation {
  background: rgba(0, 150, 255, 0.1);
  border-left: 3px solid #00aaff;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 8px 0 0 0;
}

.suggestion-time {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 10px;
  color: #88a0b0;
}

.resource-card {
  background: rgba(0, 60, 100, 0.3);
  border-radius: 12px;
  padding: 12px;
}

.resource-card h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #a0d0ff;
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.resource-item {
  display: flex;
  flex-direction: column;
}

.resource-label {
  font-size: 11px;
  color: #88a0b0;
  margin-bottom: 2px;
}

.resource-value {
  font-size: 13px;
  font-weight: 500;
  color: #00f0ff;
}

.input-area {
  margin-top: auto;
}

.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.el-tag) {
  background: rgba(0, 100, 200, 0.2);
  border-color: rgba(0, 150, 255, 0.3);
  color: #a0d0ff;
  cursor: pointer;
}

:deep(.el-tag:hover) {
  background: rgba(0, 150, 255, 0.3);
}

:deep(.el-input__wrapper) {
  background: rgba(0, 30, 50, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
}

:deep(.el-input__inner) {
  color: #e0f0ff;
}

.loading-card {
  display: flex;
  gap: 12px;
  opacity: 0.7;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-item .avatar {
  width: 32px;
  height: 32px;
  background: rgba(0, 100, 200, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.message-item .message-content {
  max-width: 80%;
  background: rgba(0, 50, 80, 0.4);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.5;
}

.message-item.user .message-content {
  background: rgba(0, 150, 255, 0.2);
}

:deep(.el-badge__content) {
  background-color: #ff4444;
}

:deep(.el-button) {
  background: rgba(0, 50, 80, 0.6);
  border-color: rgba(0, 150, 255, 0.3);
  color: #88a0b0;
}
</style>
