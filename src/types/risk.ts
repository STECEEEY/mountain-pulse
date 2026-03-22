import type { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'

export interface MapBounds {
  west: number
  east: number
  south: number
  north: number
}

export interface MapConfig {
  bounds: MapBounds
  center: [number, number]
  zoom: number
  risk_thresholds: {
    high: number
    medium: number
    low: number
  }
  color_scale: {
    low: string
    medium: string
    high: string
  }
}

export interface RiskPoint {
  name: string
  type: string
  level: string
  velocity: number
  threat: string
  longitude: number
  latitude: number
  elevation: number
  slope: number
}

export type RiskLevel = '极高' | '高' | '中' | '低' | 'danger' | 'warning' | 'medium' | 'safe'

export interface RiskPointsPayload {
  total_count: number
  high_risk_count: number
  points: RiskPoint[]
}

export interface RiskStatistics {
  total_pixels: number
  total_area_km2: number
  high_risk: {
    pixels: number
    percentage: number
    area_km2: number
  }
  medium_risk: {
    pixels: number
    percentage: number
    area_km2: number
  }
  low_risk: {
    pixels: number
    percentage: number
    area_km2: number
  }
  mean_risk: number
  median_risk: number
  max_risk: number
  min_risk: number
  std_risk: number
}

export interface FeatureImportance {
  features: Record<string, number>
  top_feature: string
  description: Record<string, string>
}

export interface HighRiskGeoJSON extends FeatureCollection<Geometry, GeoJsonProperties> {
  metadata?: Record<string, string | number | null | undefined>
}

export interface DeformationRecord {
  date: string
  displacement: number
}

export interface DeformationLocation {
  lat: number
  lng: number
  pixel?: {
    row: number
    col: number
  }
}

export interface DeformationResponse {
  status: string
  location: DeformationLocation
  deformation_data: DeformationRecord[]
}
