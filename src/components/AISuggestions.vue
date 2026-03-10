<template>
  <div class="ai-suggestions">
    <div class="header">
      <h3>🤖 AI决策建议</h3>
      <el-badge :value="3" class="badge" type="danger">
        <el-button size="small" :icon="Refresh" circle />
      </el-badge>
    </div>

    <div class="chat-container">
      <!-- 决策建议卡片 -->
      <div class="suggestion-card">
        <div class="ai-avatar">AI</div>
        <div class="suggestion-content">
          <div class="suggestion-text">
            <p>基于当前宁镇山脉区域的风险分析，发现以下关键问题：</p>
            <ul>
              <li>
                🚨
                <span class="highlight">汤山滑坡群</span
                >（极高风险）威胁2所学校、1座桥梁，建议立即启动应急预案
              </li>
              <li>
                ⚠️
                <span class="highlight">宝华山崩塌</span>（高风险）影响范围约0.5km²，威胁居民830人
              </li>
              <li>📊 未来72小时降雨量预计增加60%，可能触发新的滑坡点</li>
            </ul>
            <p class="recommendation">
              💡
              <strong>推荐行动方案：</strong>
              立即组织汤山小学师生疏散，在宝华山路段设置警戒线，启动24小时监测。
            </p>
          </div>
          <div class="suggestion-time">刚刚</div>
        </div>
      </div>

      <!-- 应急资源调度 -->
      <div class="resource-card">
        <h4>应急资源调度建议</h4>
        <div class="resource-grid">
          <div class="resource-item">
            <span class="resource-label">最近救援队</span>
            <span class="resource-value">汤山救援队 (2.3km)</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">可用物资</span>
            <span class="resource-value">帐篷200顶、食品5吨</span>
          </div>
          <div class="resource-item">
            <span class="resource-label">最优路线</span>
            <span class="resource-value">G42沪蓉高速 → 汤泉路</span>
          </div>
        </div>
      </div>

      <!-- 用户输入框 -->
      <div class="input-area">
        <el-input
          v-model="userInput"
          placeholder="输入具体问题，如'汤山小学的疏散方案'..."
          :prefix-icon="Message"
          @keyup.enter="sendMessage"
        >
          <template #append>
            <el-button @click="sendMessage">发送</el-button>
          </template>
        </el-input>
      </div>

      <!-- 快捷问题 -->
      <div class="quick-questions">
        <el-tag v-for="q in quickQuestions" :key="q" size="small" @click="userInput = q">
          {{ q }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElButton, ElInput, ElBadge, ElTag } from 'element-plus'
import { Refresh, Message } from '@element-plus/icons-vue'

const userInput = ref('')

const quickQuestions = ref([
  '汤山小学如何疏散？',
  '最近救援队位置？',
  '高风险点转移路线',
  '物资需求预测',
])

const sendMessage = () => {
  if (!userInput.value.trim()) return
  console.log('发送问题:', userInput.value)
  // 这里将来调用AI API
  userInput.value = ''
}
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
</style>
