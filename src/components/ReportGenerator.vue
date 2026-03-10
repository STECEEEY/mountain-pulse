<template>
  <div class="report-generator">
    <div class="header">
      <h3>📑 决策报告生成</h3>
      <el-button type="primary" :icon="Document" @click="generateReport">生成新报告</el-button>
    </div>

    <!-- 报告配置 -->
    <div class="report-config">
      <el-form :model="reportConfig" label-width="100px">
        <el-form-item label="报告区域">
          <el-radio-group v-model="reportConfig.region">
            <el-radio label="ningzhen">宁镇山脉全域</el-radio>
            <el-radio label="custom">自定义区域</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="包含内容">
          <el-checkbox-group v-model="reportConfig.contents">
            <el-checkbox label="risk">风险统计</el-checkbox>
            <el-checkbox label="exposure">承灾体分析</el-checkbox>
            <el-checkbox label="curve">时序形变</el-checkbox>
            <el-checkbox label="suggestion">AI决策建议</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="报告格式">
          <el-radio-group v-model="reportConfig.format">
            <el-radio label="pdf">PDF</el-radio>
            <el-radio label="word">Word</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- 最近生成的报告 -->
    <div class="recent-reports">
      <h4>最近生成的报告</h4>
      <div class="report-list">
        <div v-for="report in recentReports" :key="report.id" class="report-item">
          <div class="report-icon">📄</div>
          <div class="report-info">
            <div class="report-name">{{ report.name }}</div>
            <div class="report-meta">
              <span>生成时间: {{ report.generateTime }}</span>
              <span>大小: {{ report.size }}</span>
            </div>
          </div>
          <div class="report-actions">
            <el-button link type="primary" size="small" @click="downloadReport(report)"
              >下载</el-button
            >
            <el-button link type="info" size="small" @click="previewReport(report)">预览</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- AI决策建议预览 -->
    <div class="ai-preview" v-if="showAIPreview">
      <h4>🤖 AI决策建议预览</h4>
      <div class="ai-content">
        <p>基于宁镇山脉区域2026年3月监测数据，当前风险态势如下：</p>
        <ul>
          <li><span class="highlight">高风险点3处</span>（汤山滑坡群、宝华山崩塌、紫金山北坡）</li>
          <li>
            威胁人口总计<span class="highlight">2.3万人</span>，威胁财产<span class="highlight"
              >5.6亿元</span
            >
          </li>
          <li>关键设施：2所学校、1座桥梁、1个隧道处于高风险区</li>
          <li>近一周形变速率加快，建议启动黄色预警</li>
        </ul>
        <p class="recommendation">
          💡 建议立即组织汤山小学师生疏散演练，在宝华山路段增设监测点，安排24小时值班。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document, Download, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const showAIPreview = ref(true)

const reportConfig = ref({
  region: 'ningzhen',
  contents: ['risk', 'exposure', 'curve', 'suggestion'],
  format: 'pdf',
})

const recentReports = ref([
  {
    id: 1,
    name: '宁镇山脉风险周报_20260310.pdf',
    generateTime: '2026-03-10 10:30',
    size: '2.4 MB',
  },
  {
    id: 2,
    name: '汤山区域风险评估报告.pdf',
    generateTime: '2026-03-09 15:20',
    size: '1.8 MB',
  },
  {
    id: 3,
    name: '宝华山应急决策报告.docx',
    generateTime: '2026-03-08 09:15',
    size: '856 KB',
  },
])

const generateReport = () => {
  ElMessage.success('报告生成任务已提交，稍后可在列表中下载')
  // 模拟生成新报告
  setTimeout(() => {
    recentReports.value.unshift({
      id: Date.now(),
      name: `宁镇山脉报告_${new Date().toISOString().slice(0, 10)}.${reportConfig.value.format}`,
      generateTime: new Date().toLocaleString(),
      size: '1.2 MB',
    })
  }, 2000)
}

const downloadReport = (report: any) => {
  ElMessage.success('开始下载: ' + report.name)
  // 实际调用下载API
}

const previewReport = (report: any) => {
  ElMessage.info('预览功能开发中')
}
</script>

<style scoped>
.report-generator {
  background: rgba(10, 20, 30, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  color: #e0f0ff;
  border: 1px solid rgba(0, 200, 255, 0.2);
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
  font-size: 16px;
}

.report-config {
  background: rgba(0, 40, 60, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

:deep(.el-form-item__label) {
  color: #a0d0ff;
}

:deep(.el-radio__label),
:deep(.el-checkbox__label) {
  color: #e0f0ff;
}

:deep(.el-radio.is-checked) {
  color: #00f0ff;
}

.recent-reports {
  margin-bottom: 20px;
}

.recent-reports h4,
.ai-preview h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #a0d0ff;
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.report-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(0, 30, 50, 0.4);
  border-radius: 8px;
  padding: 12px;
}

.report-icon {
  font-size: 24px;
  opacity: 0.8;
}

.report-info {
  flex: 1;
}

.report-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.report-meta {
  display: flex;
  gap: 16px;
  font-size: 11px;
  color: #88a0b0;
}

.report-actions {
  display: flex;
  gap: 8px;
}

.ai-preview {
  background: rgba(0, 50, 100, 0.3);
  border-radius: 12px;
  padding: 16px;
}

.ai-content {
  font-size: 13px;
  line-height: 1.6;
  color: #e0f0ff;
}

.ai-content p {
  margin: 0 0 8px 0;
}

.ai-content ul {
  margin: 0 0 8px 0;
  padding-left: 20px;
}

.ai-content li {
  margin-bottom: 4px;
}

.highlight {
  color: #00f0ff;
  font-weight: 500;
}

.recommendation {
  background: rgba(0, 150, 255, 0.1);
  border-left: 3px solid #00aaff;
  padding: 8px 12px;
  border-radius: 4px;
  margin: 8px 0 0 0;
}
</style>
