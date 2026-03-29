// services/riskService.ts - 确保已正确导入类型

import type {
  DeformationResponse,
  FeatureImportance,
  HighRiskGeoJSON,
  MapConfig,
  RiskPointsPayload,
  RiskStatistics,
} from '@/types/risk'

const fetchJson = async <T>(path: string): Promise<T> => {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const riskService = {
  loadMapConfig() {
    return fetchJson<MapConfig>('/data/map_config.json')
  },
  loadRiskPoints() {
    return fetchJson<RiskPointsPayload>('/data/risk_points.json')
  },
  loadRiskStatistics() {
    return fetchJson<RiskStatistics>('/data/risk_statistics.json')
  },
  loadFeatureImportance() {
    return fetchJson<FeatureImportance>('/data/feature_importance.json')
  },
  loadHighRiskGeoJSON() {
    return fetchJson<HighRiskGeoJSON>('/data/high_risk_points.geojson')
  },
  
  // 形变数据 API（通过 Vercel 代理）
  async loadDeformationData(lat: number, lng: number) {
    const url = `/api/deformation/query?lat=${lat}&lng=${lng}`
    console.log('形变请求URL:', url)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`形变接口请求失败: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data) {
      throw new Error('形变接口返回结构无效')
    }

    return data
  },
}
