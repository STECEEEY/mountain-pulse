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
          <el-progress :percentage="geologicalFactor" :stroke-width="8" color="#3b82f6" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">形变速率</span>
          <el-progress :percentage="deformationFactor" :stroke-width="8" color="#f59e0b" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">降雨影响</span>
          <el-progress :percentage="rainfallFactor" :stroke-width="8" color="#22c55e" />
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">人口暴露</span>
          <el-progress :percentage="populationExposure" :stroke-width="8" color="#8b5cf6" />
        </div>
      </div>
    </div>

    <!-- AI 风险预测 -->
    <div class="ai-prediction">
      <div class="section-header">
        <h4>模型风险预测</h4>
        <el-tag size="small" type="warning">趋势推演</el-tag>
      </div>
      <div class="prediction-content">
        <div class="prediction-item">
          <span class="time">今日</span>
          <div class="prediction-bar high" :style="{ width: `${currentRisk.score}%` }"></div>
          <span class="prob">{{ currentRisk.score }}%</span>
        </div>
        <div class="prediction-item">
          <span class="time">+24h</span>
          <div class="prediction-bar medium" :style="{ width: `${nextDayRisk}%` }"></div>
          <span class="prob">{{ nextDayRisk }}%</span>
        </div>
        <div class="prediction-item">
          <span class="time">+48h</span>
          <div class="prediction-bar medium" :style="{ width: `${twoDayRisk}%` }"></div>
          <span class="prob">{{ twoDayRisk }}%</span>
        </div>
      </div>
      <p class="prediction-note">
        {{ recommendation.note }}
      </p>
    </div>

    <!-- 承灾体信息 -->
    <div class="exposure-info">
      <h4>影响范围内承灾体</h4>
      <div class="exposure-grid">
        <div class="exposure-item">
          <span class="exposure-icon">POP</span>
          <div class="exposure-detail">
            <span class="exposure-value">{{ point?.threat || '暂无' }}</span>
            <span class="exposure-label">威胁人口</span>
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
          <span>{{ recommendation.primary }}</span>
        </div>
        <div class="rec-item">
          <el-icon><Location /></el-icon>
          <span>{{ recommendation.secondary }}</span>
        </div>
        <div class="rec-item">
          <el-icon><View /></el-icon>
          <span>{{ recommendation.tertiary }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { WarningFilled, Location, View } from '@element-plus/icons-vue'
import { normalizeRiskLevel } from '@/utils/riskLevel'

const props = defineProps<{
  point: {
    level?: string
    velocity?: number
    slope?: number
    threat?: string
  } | null
}>()

const parseThreatNumber = (value?: string) => {
  if (!value) return 0
  const matched = value.match(/-?\d+(\.\d+)?/)
  if (!matched) return 0
  return Number(matched[0])
}

const currentRisk = computed(() => {
  const level = normalizeRiskLevel(props.point?.level)
  const scoreMap: Record<string, number> = {
    极高: 90,
    高: 75,
    中: 55,
    低: 30,
    未知: 0,
  }
  const levelMap: Record<string, string> = {
    极高: 'high',
    高: 'high',
    中: 'medium',
    低: 'low',
    未知: 'low',
  }
  return {
    score: scoreMap[level] ?? 0,
    level: levelMap[level] ?? 'low',
  }
})

const deformationFactor = computed(() => Math.min(Math.round(Math.abs(Number(props.point?.velocity || 0))), 100))
const geologicalFactor = computed(() => Math.min(Math.round(Number(props.point?.slope || 0) * 3), 100))
const rainfallFactor = computed(() => Math.max(currentRisk.value.score - 20, 10))
const populationExposure = computed(() => Math.min(Math.round(parseThreatNumber(props.point?.threat) / 20), 100))

const nextDayRisk = computed(() => Math.min(currentRisk.value.score + 5, 99))
const twoDayRisk = computed(() => Math.min(currentRisk.value.score + 8, 99))

const recommendation = computed(() => {
  const level = normalizeRiskLevel(props.point?.level)
  if (level === '极高') {
    return {
      primary: '建议立即启动红色预警与人员疏散',
      secondary: '建议封控重点风险区并设置安全警戒线',
      tertiary: '建议开启高频巡检与连续形变监测',
      note: '当前风险等级较高，建议立即采取最高级别响应措施。',
    }
  }
  if (level === '高') {
    return {
      primary: '建议启动橙色预警并做好转移准备',
      secondary: '建议加强现场巡查并限制人员聚集',
      tertiary: '建议提高监测频次并每日复盘',
      note: '风险处于高位，建议尽快落实预警和防护。',
    }
  }
  if (level === '中') {
    return {
      primary: '建议保持黄色预警并持续跟踪变化',
      secondary: '建议完善排水和边坡巡检',
      tertiary: '建议按计划开展定时监测',
      note: '当前风险可控，需持续观测避免快速演化。',
    }
  }
  return {
    primary: '建议维持常态化监测',
    secondary: '建议定期排查重点区域',
    tertiary: '建议保留应急预案与联系人机制',
    note: '当前风险较低，保持常规监测即可。',
  }
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

.gauge-ring.low {
  background: conic-gradient(#22c55e 0% 30%, #f1f5f9 30% 100%);
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
