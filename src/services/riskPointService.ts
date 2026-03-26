export interface RiskPoint {
  name: string
  type: string
  level: string
  risk_probability: number
  threat: string
  longitude: number
  latitude: number
  elevation: number
  slope: number
  projection_x: number
  projection_y: number
  actual_population: number
  velocity: number
}

export interface RiskPointsData {
  total_count: number
  high_risk_count: number
  sampling_params: {
    total_points_target: number
    min_pixel_distance: number
    population_method: string
    population_radius: number
  }
  points: RiskPoint[]
}

class RiskPointService {
  private riskPointsData: RiskPointsData | null = null

  // 加载风险点数据
  async loadRiskPoints(): Promise<RiskPointsData | null> {
  if (this.riskPointsData) {
    return this.riskPointsData
  }

  try {
    const response = await fetch('/data/risk_points.json')
    if (!response.ok) {
      throw new Error('加载风险点数据失败')
    }
    this.riskPointsData = await response.json()
    // 添加可选链，或者先判断再输出
    console.log('风险点数据加载成功:', this.riskPointsData?.total_count, '个点')
    return this.riskPointsData
  } catch (error) {
    console.error('加载风险点数据失败:', error)
    return null
  }
}

  // 根据点名称获取风险点信息
  getRiskPointByName(pointName: string): RiskPoint | null {
    if (!this.riskPointsData?.points) return null
    
    // 模糊匹配点名称
    const point = this.riskPointsData.points.find(p => 
      p.name.includes(pointName) || pointName.includes(p.name)
    )
    
    return point || null
  }

  // 根据坐标获取最近的风险点
  getRiskPointByLocation(lng: number, lat: number): RiskPoint | null {
    if (!this.riskPointsData?.points) return null
    
    let minDistance = Infinity
    let closestPoint: RiskPoint | null = null
    
    for (const point of this.riskPointsData.points) {
      const distance = Math.sqrt(
        Math.pow(point.longitude - lng, 2) + 
        Math.pow(point.latitude - lat, 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        closestPoint = point
      }
    }
    
    return closestPoint
  }

  // 获取总人口
  getTotalPopulation(): number {
    if (!this.riskPointsData?.points) return 0
    return this.riskPointsData.points.reduce((sum, point) => sum + point.actual_population, 0)
  }

  // 获取高风险点数量（极高风险 + 高风险）
  getHighRiskCount(): number {
    if (!this.riskPointsData?.points) return 0
    return this.riskPointsData.points.filter(p => 
      p.level === '极高风险' || p.level === '高风险'
    ).length
  }

  // 获取指定点的影响人口
  getAffectedPopulation(pointName: string, lng?: number, lat?: number): number {
    if (!this.riskPointsData?.points) return 0
    
    let riskPoint: RiskPoint | null = null
    
    if (pointName) {
      riskPoint = this.getRiskPointByName(pointName)
    }
    
    if (!riskPoint && lng && lat) {
      riskPoint = this.getRiskPointByLocation(lng, lat)
    }
    
    return riskPoint?.actual_population || 0
  }
}

export default new RiskPointService()