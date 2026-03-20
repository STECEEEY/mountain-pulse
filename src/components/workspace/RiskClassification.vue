<template>
  <div class="risk-classification">
    <!-- 风险概览 -->
    <div class="risk-overview">
      <div class="risk-gauge">
        <div class="gauge-ring" :class="currentRisk.level">
          <span class="gauge-value">{{ currentRisk.score }}</span>
        </div>
        <div class="gauge-label">综合风险指数</div>
      </div>
      <div class="risk-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">地质因素</span>
          <el-progress :percentage="75" :stroke-width="8" color="#3b82f6" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">形变速率</span>
          <el-progress :percentage="85" :stroke-width="8" color="#f59e0b" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">降雨影响</span>
          <el-progress :percentage="60" :stroke-width="8" color="#22c55e" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">人口暴露</span>
          <el-progress :percentage="70" :stroke-width="8" color="#8b5cf6" />
        </div>
      </div>
    </div>

    <!-- AI 风险预测 -->
    <div class="ai-prediction">
      <div class="section-header">
        <h4>模型风险预测</h4>
        <el-tag size="small" type="warning">72小时</el-tag>
      </div>
      <div class="prediction-content">
        <div class="prediction-item">
          <span class="time">今日</span>
          <div class="prediction-bar high" style="width: 85%"></div>
          <span class="prob">85%</span>
        </div>
        <div class="prediction-item">
          <span class="time">明日</span>
          <div class="prediction-bar medium" style="width: 72%"></div>
          <span class="prob">72%</span>
        </div>
        <div class="prediction-item">
          <span class="time">后日</span>
          <div class="prediction-bar medium" style="width: 68%"></div>
          <span class="prob">68%</span>
        </div>
      </div>
      <p class="prediction-note">
        预计降雨量增加将导致滑坡风险上升，建议提前做好防范准备。
      </p>
    </div>

    <!-- 承灾体信息 -->
    <div class="exposure-info">
      <h4>影响范围内承灾体</h4>
      <div class="exposure-grid">
        <div class="exposure-item">
          <span class="exposure-icon">POP</span>
          <div class="exposure-detail">
            <span class="exposure-value">1,250</span>
            <span class="exposure-label">威胁人口</span>
          </div>
        </div>
        <div class="exposure-item">
          <span class="exposure-icon">SCH</span>
          <div class="exposure-detail">
            <span class="exposure-value">2</span>
            <span class="exposure-label">学校</span>
          </div>
        </div>
        <div class="exposure-item">
          <span class="exposure-icon">HSP</span>
          <div class="exposure-detail">
            <span class="exposure-value">1</span>
            <span class="exposure-label">医院</span>
          </div>
        </div>
        <div class="exposure-item">
          <span class="exposure-icon">BRG</span>
          <div class="exposure-detail">
            <span class="exposure-value">1</span>
            <span class="exposure-label">桥梁</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 建议措施 -->
    <div class="recommendations">
      <h4>建议措施</h4>
      <div class="rec-list">
        <div class="rec-item urgent">
          <el-icon><WarningFilled /></el-icon>
          <span>立即通知汤山小学做好疏散准备</span>
        </div>
        <div class="rec-item">
          <el-icon><Location /></el-icon>
          <span>在危险区域设置警戒标志</span>
        </div>
        <div class="rec-item">
          <el-icon><View /></el-icon>
          <span>加密监测频率至每日2次</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WarningFilled, Location, View } from '@element-plus/icons-vue'

defineProps<{
  point: any
}>()

const currentRisk = ref({
  score: 78,
  level: 'high',
})
</script>

<style scoped>
.risk-classification {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.risk-overview {
  display: flex;
  gap: 24px;
  align-items: center;
}

.risk-gauge {
  text-align: center;
}

.gauge-ring {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  position: relative;
}

.gauge-ring::before {
  content: '';
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: #ffffff;
}

.gauge-ring.high {
  background: conic-gradient(#ef4444 0% 78%, #f1f5f9 78% 100%);
}

.gauge-ring.medium {
  background: conic-gradient(#f59e0b 0% 50%, #f1f5f9 50% 100%);
}

.gauge-value {
  position: relative;
  font-size: 28px;
  font-weight: 700;
  color: #ef4444;
}

.gauge-label {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.risk-breakdown {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.breakdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.breakdown-label {
  width: 70px;
  font-size: 13px;
  color: #64748b;
}

.ai-prediction {
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.prediction-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prediction-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prediction-item .time {
  width: 40px;
  font-size: 12px;
  color: #64748b;
}

.prediction-bar {
  height: 8px;
  border-radius: 4px;
  transition: width 0.3s;
}

.prediction-bar.high { background: #ef4444; }
.prediction-bar.medium { background: #f59e0b; }

.prediction-item .prob {
  width: 40px;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  text-align: right;
}

.prediction-note {
  margin: 12px 0 0 0;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.exposure-info h4,
.recommendations h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.exposure-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.exposure-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f8fafc;
  border-radius: 10px;
  padding: 12px;
}

.exposure-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid rgba(0, 180, 255, 0.25);
  background: rgba(0, 76, 112, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #9ad4f2;
}

.exposure-detail {
  display: flex;
  flex-direction: column;
}

.exposure-value {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.exposure-label {
  font-size: 11px;
  color: #64748b;
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rec-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
  color: #475569;
}

.rec-item.urgent {
  background: #fef2f2;
  color: #dc2626;
}

.rec-item .el-icon {
  font-size: 16px;
}
</style>
