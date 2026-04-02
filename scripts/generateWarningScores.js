// scripts/generateWarningScores.js
const fs = require('fs');
const path = require('path');

// 配置
const INPUT_FILE = path.join(__dirname, '../public/data/risk_points.json');
const OUTPUT_FILE = path.join(__dirname, '../public/data/risk_points_with_warning.json');

/**
 * 计算综合预警指数
 * 权重: 滑坡概率20% + 降雨25% + 人口30% + 设施25% = 100分
 */
function calcWarningScore(point) {
  // 1. 滑坡概率评分 (0-20分)
  let probScore = 0;
  const prob = point.risk_probability || 0;
  if (prob >= 0.92) probScore = 20;
  else if (prob >= 0.91) probScore = 15;
  else if (prob >= 0.85) probScore = 10;
  else if (prob >= 0.70) probScore = 5;
  
  // 2. 降雨评分 (0-25分) - 基于汛期判断
  const currentMonth = new Date().getMonth() + 1;
  const isRainySeason = currentMonth >= 4 && currentMonth <= 9;
  let rainScore = isRainySeason ? 15 : 5;
  
  // 3. 人口评分 (0-30分)
  const population = point.actual_population || 0;
  let popScore = 0;
  if (population >= 5000) popScore = 30;
  else if (population >= 2000) popScore = 25;
  else if (population >= 1000) popScore = 20;
  else if (population >= 500) popScore = 15;
  else if (population >= 200) popScore = 10;
  else if (population >= 50) popScore = 5;
  else if (population >= 10) popScore = 3;
  
  // 4. 设施评分 (0-25分)
  let facilityScore = 0;
  // 基于人口估算
  if (population >= 5000) facilityScore += 10;
  else if (population >= 2000) facilityScore += 8;
  else if (population >= 1000) facilityScore += 6;
  else if (population >= 500) facilityScore += 4;
  else if (population >= 100) facilityScore += 2;
  else if (population >= 10) facilityScore += 1;
  
  // 基于风险等级
  const level = point.level || '中风险';
  if (level === '极高风险') facilityScore += 8;
  else if (level === '高风险') facilityScore += 6;
  else if (level === '中风险') facilityScore += 4;
  else facilityScore += 2;
  
  // 铁路影响（宁镇地区主要铁路线）
  const lng = point.longitude;
  const lat = point.latitude;
  const isNearRailway = (lng > 118.5 && lng < 119.2 && lat > 31.9 && lat < 32.3);
  if (isNearRailway) facilityScore += 7;
  
  facilityScore = Math.min(facilityScore, 25);
  
  // 总分
  const total = probScore + rainScore + popScore + facilityScore;
  return Math.min(Math.round(total), 100);
}

/**
 * 根据分数获取预警等级
 */
function getWarningLevel(score) {
  if (score >= 70) return '红色预警';
  if (score >= 50) return '橙色预警';
  if (score >= 30) return '黄色预警';
  return '蓝色预警';
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始生成预警指数...');
  
  // 读取原始数据
  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  const data = JSON.parse(rawData);
  const points = data.points;
  
  console.log(`📊 共加载 ${points.length} 个风险点`);
  
  // 计算每个点的预警指数
  const pointsWithWarning = points.map(point => {
    const score = calcWarningScore(point);
    const warningLevel = getWarningLevel(score);
    
    return {
      name: point.name,
      type: point.type,
      level: point.level,
      threat: point.threat,
      longitude: point.longitude,
      latitude: point.latitude,
      warning_score: score,
      warning_level: warningLevel
    };
  });
  
  // 按预警分数排序（高分在前）
  pointsWithWarning.sort((a, b) => b.warning_score - a.warning_score);
  
  // 统计各等级数量
  const stats = {
    total: pointsWithWarning.length,
    red: pointsWithWarning.filter(p => p.warning_level === '红色预警').length,
    orange: pointsWithWarning.filter(p => p.warning_level === '橙色预警').length,
    yellow: pointsWithWarning.filter(p => p.warning_level === '黄色预警').length,
    blue: pointsWithWarning.filter(p => p.warning_level === '蓝色预警').length,
    avgScore: Math.round(pointsWithWarning.reduce((sum, p) => sum + p.warning_score, 0) / pointsWithWarning.length)
  };
  
  // 构建输出数据
  const outputData = {
    statistics: stats,
    generatedAt: new Date().toISOString(),
    points: pointsWithWarning
  };
  
  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputData, null, 2), 'utf-8');
  
  console.log('✅ 生成完成！');
  console.log(`📁 输出文件: ${OUTPUT_FILE}`);
  console.log(`📊 统计: 红色${stats.red} 橙色${stats.orange} 黄色${stats.yellow} 蓝色${stats.blue} | 平均分${stats.avgScore}`);
}

main();
