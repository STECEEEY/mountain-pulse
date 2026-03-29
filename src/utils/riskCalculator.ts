// utils/riskCalculator.ts
import type { RiskPoint, DynamicRiskFactor, DynamicRiskFactors } from '@/types/risk'

// 根据坡度计算风险权重（坡度越陡风险越高）
const calculateSlopeRisk = (slope: number): number => {
  // 坡度范围 0-90度，风险权重 0-1
  if (slope <= 10) return 0.2
  if (slope <= 25) return 0.5
  if (slope <= 40) return 0.8
  return 1.0
}

// 根据高程计算风险权重（特定高程范围风险高）
const calculateElevationRisk = (elevation: number): number => {
  // 根据滑坡发生的高程分布规律
  if (elevation < 50) return 0.3
  if (elevation < 200) return 0.7 // 常见滑坡高程范围
  if (elevation < 500) return 0.5
  return 0.2
}

// 根据形变速率计算风险权重（速率越大风险越高）
const calculateVelocityRisk = (velocity: number): number => {
  // 形变速率 mm/年
  const absVelocity = Math.abs(velocity)
  if (absVelocity <= 5) return 0.2
  if (absVelocity <= 15) return 0.5
  if (absVelocity <= 30) return 0.8
  return 1.0
}

// 根据风险等级计算权重
const calculateLevelRisk = (level: string): number => {
  const levelMap: Record<string, number> = {
    '极高风险': 0.95,
    '高': 0.8,
    '中': 0.5,
    '低': 0.2,
    'danger': 0.9,
    'warning': 0.6,
    'medium': 0.5,
    'safe': 0.2
  }
  return levelMap[level] || 0.5
}

// 获取风险等级文本
const getRiskLevelText = (weight: number): string => {
  if (weight >= 0.8) return '高风险'
  if (weight >= 0.5) return '中风险'
  return '低风险'
}

// 获取风险等级样式
const getRiskLevel = (weight: number): 'low' | 'medium' | 'high' => {
  if (weight < 0.4) return 'low'
  if (weight < 0.7) return 'medium'
  return 'high'
}

// 获取因子的单位
const getFactorUnit = (factorName: string): string => {
  const units: Record<string, string> = {
    '坡度': '°',
    '高程': 'm',
    '形变速率': 'mm/年',
    '风险等级': ''
  }
  return units[factorName] || ''
}

// 动态计算监测点的风险因子
export const calculateDynamicRiskFactors = (point: RiskPoint): DynamicRiskFactors => {
  // 计算各个因子的风险权重
  const slopeRisk = calculateSlopeRisk(point.slope)
  const elevationRisk = calculateElevationRisk(point.elevation)
  const velocityRisk = calculateVelocityRisk(point.velocity)
  const levelRisk = calculateLevelRisk(point.level)

  const factors: DynamicRiskFactor[] = [
    {
      name: '坡度',
      actualValue: point.slope,
      weight: slopeRisk,
      riskLevel: getRiskLevel(slopeRisk),
      contribution: 0,
      unit: getFactorUnit('坡度')
    },
    {
      name: '高程',
      actualValue: point.elevation,
      weight: elevationRisk,
      riskLevel: getRiskLevel(elevationRisk),
      contribution: 0,
      unit: getFactorUnit('高程')
    },
    {
      name: '形变速率',
      actualValue: point.velocity,
      weight: velocityRisk,
      riskLevel: getRiskLevel(velocityRisk),
      contribution: 0,
      unit: getFactorUnit('形变速率')
    },
    {
      name: '风险等级',
      actualValue: 0,
      weight: levelRisk,
      riskLevel: getRiskLevel(levelRisk),
      contribution: 0,
      unit: getFactorUnit('风险等级')
    }
  ]

  // 计算总风险分数（加权平均）
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0)
  const totalRiskScore = totalWeight / factors.length

  // 计算每个因子的贡献度（归一化）
  factors.forEach(factor => {
    factor.contribution = factor.weight / totalWeight
  })

  // 找出主要风险因子 - 使用更安全的方法
  let maxWeight = -1
  let topFactorName = ''
  
  for (let i = 0; i < factors.length; i++) {
    const factor = factors[i]
    if (factor && factor.weight > maxWeight) {
      maxWeight = factor.weight
      topFactorName = factor.name
    }
  }

  return {
    pointId: point.name,
    pointName: point.name,
    factors,
    totalRiskScore,
    topRiskFactor: topFactorName,
    riskLevel: getRiskLevelText(totalRiskScore)
  }
}

// 获取风险因子的动态说明
export const getDynamicFactorDescription = (factor: DynamicRiskFactor): string => {
  const descriptions: Record<string, (value: number) => string> = {
    '坡度': (value) => {
      if (value > 40) return `坡度为 ${value.toFixed(1)}°，坡度极陡，下滑力巨大，极易发生滑坡`
      if (value > 25) return `坡度为 ${value.toFixed(1)}°，坡度较陡，下滑力较大，需重点关注`
      if (value > 10) return `坡度为 ${value.toFixed(1)}°，坡度适中，相对稳定`
      return `坡度为 ${value.toFixed(1)}°，坡度平缓，稳定性较好`
    },
    '高程': (value) => {
      if (value >= 50 && value <= 500) return `高程 ${value.toFixed(0)}m，处于滑坡易发高程范围（50-500m），风险较高`
      if (value < 50) return `高程 ${value.toFixed(0)}m，高程较低，地形平坦，风险较低`
      return `高程 ${value.toFixed(0)}m，高程较高，地形复杂，需综合评估`
    },
    '形变速率': (value) => {
      const absValue = Math.abs(value)
      if (absValue > 30) return `形变速率为 ${absValue.toFixed(2)}mm/年，形变剧烈，处于加速变形阶段，需立即采取措施`
      if (absValue > 15) return `形变速率为 ${absValue.toFixed(2)}mm/年，形变明显，处于活跃期，需加强监测`
      if (absValue > 5) return `形变速率为 ${absValue.toFixed(2)}mm/年，形变较缓，处于稳定变形阶段`
      return `形变速率为 ${absValue.toFixed(2)}mm/年，形变微弱，坡体基本稳定`
    },
    '风险等级': (value) => {
      const level = getRiskLevelText(value)
      if (level === '高风险') return '综合评估为高风险等级，存在较大的滑坡风险，建议立即采取防治措施'
      if (level === '中风险') return '综合评估为中风险等级，存在一定的滑坡风险，建议加强监测预警'
      return '综合评估为低风险等级，滑坡风险较小，可常规监测'
    }
  }

  const descFunc = descriptions[factor.name]
  if (descFunc) {
    return descFunc(factor.actualValue)
  }
  return `${factor.name}对滑坡风险有显著影响，当前风险权重为${(factor.weight * 100).toFixed(1)}%`
}

// 获取因子的显示值
export const formatFactorValue = (factor: DynamicRiskFactor): string => {
  if (factor.name === '风险等级') {
    const level = getRiskLevelText(factor.weight)
    return level
  }
  return `${factor.actualValue.toFixed(2)}${factor.unit}`
}
