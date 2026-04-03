// src/utils/warningCalculator.ts

// 计算单个点的预警等级
export function calculateWarningLevel(point: {
  risk_probability?: number;
  actual_population?: number;
  level?: string;
  velocity?: number;
}): string {
  // 滑坡概率评分 (0-40分)
  const probScore = (point.risk_probability || 0) * 40;
  
  // 人口评分 (0-20分)
  const pop = point.actual_population || 0;
  let popScore = 0;
  if (pop >= 1000) popScore = 20;
  else if (pop >= 500) popScore = 15;
  else if (pop >= 200) popScore = 12;
  else if (pop >= 100) popScore = 8;
  else if (pop >= 50) popScore = 5;
  else if (pop >= 10) popScore = 3;
  
  // 降雨评分（基于汛期）
  let rainScore = 5;
  const month = new Date().getMonth() + 1;
  const isRainy = month >= 4 && month <= 9;
  if (isRainy) rainScore = 15;
  
  // 设施评分（基于风险等级）
  let facilityScore = 0;
  const level = point.level || '中风险';
  if (level === '极高风险') facilityScore = 12;
  else if (level === '高风险') facilityScore = 8;
  else if (level === '中风险') facilityScore = 5;
  else facilityScore = 2;
  
  const total = probScore + popScore + rainScore + facilityScore;
  const finalScore = Math.min(Math.round(total), 100);
  
  if (finalScore >= 90) return '红色预警';
  if (finalScore >= 85) return '橙色预警';
  if (finalScore >= 75) return '黄色预警';
  return '蓝色预警';
}
