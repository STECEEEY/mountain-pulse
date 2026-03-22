<template>
  <div class="point-detail">
    <!-- 基本信息 -->
    <div class="info-section">
      <h4>基本信息</h4>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">编号</span>
          <span class="info-value">{{ point?.id ?? '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">名称</span>
          <span class="info-value">{{ point?.name || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">类型</span>
          <span class="info-value">{{ point?.type || '暂无' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">经度</span>
          <span class="info-value">{{ point?.lng ? `${Number(point.lng).toFixed(6)}°E` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">纬度</span>
          <span class="info-value">{{ point?.lat ? `${Number(point.lat).toFixed(6)}°N` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">高程</span>
          <span class="info-value">{{ point?.elevation !== undefined ? `${Number(point.elevation).toFixed(2)} m` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">坡度</span>
          <span class="info-value">{{ point?.slope !== undefined ? `${Number(point.slope).toFixed(2)}°` : '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">威胁人口</span>
          <span class="info-value">{{ point?.threat || '暂无' }}</span>
        </div>
      </div>
    </div>

    <!-- 监测信息 -->
    <div class="info-section">
      <h4>监测信息</h4>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">监测开始</span>
          <span class="info-value">-</span>
        </div>
        <div class="info-row">
          <span class="info-label">数据源</span>
          <span class="info-value">暂无</span>
        </div>
        <div class="info-row">
          <span class="info-label">最近更新</span>
          <span class="info-value">-</span>
        </div>
        <div class="info-row">
          <span class="info-label">监测周期</span>
          <span class="info-value">-</span>
        </div>
      </div>
    </div>

    <!-- 地质信息 -->
    <div class="info-section">
      <h4>地质特征</h4>
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">岩性</span>
          <span class="info-value">暂无</span>
        </div>
        <div class="info-row">
          <span class="info-label">构造</span>
          <span class="info-value">暂无</span>
        </div>
        <div class="info-row">
          <span class="info-label">规模</span>
          <span class="info-value">暂无</span>
        </div>
        <div class="info-row">
          <span class="info-label">稳定性</span>
          <span class="info-value danger">{{ point?.level ? `${point.level}风险` : '暂无' }}</span>
        </div>
      </div>
    </div>

    <!-- 历史灾害 -->
    <div class="info-section">
      <h4>历史灾害记录</h4>
      <div class="empty-history">暂无历史记录</div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button type="primary" :icon="Download">导出数据</el-button>
      <el-button :icon="Printer">打印报告</el-button>
      <el-button :icon="Share">分享</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Download, Printer, Share } from '@element-plus/icons-vue'

defineProps<{
  point: {
    id?: number
    name?: string
    type?: string
    lng?: number
    lat?: number
    elevation?: number
    slope?: number
    threat?: string
    level?: string
  } | null
}>()
</script>

<style scoped>
.point-detail {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.info-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 13px;
  color: #64748b;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
}

.info-value.danger {
  color: #dc2626;
  font-weight: 600;
}

.disaster-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disaster-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 13px;
}

.disaster-date {
  color: #3b82f6;
  font-weight: 600;
  white-space: nowrap;
}

.disaster-desc {
  color: #64748b;
  line-height: 1.4;
}

.empty-history {
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
}

.action-buttons .el-button {
  flex: 1;
}
</style>
