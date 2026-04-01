// src/services/weatherService.ts
import axios from 'axios';

export interface WeatherData {
  city: string;
  weather: string;
  temperature: string;
  humidity: string;
  rainfall: string;
  rain_intensity: 'none' | 'light' | 'moderate' | 'heavy';
  wind_direction?: string;
  wind_power?: string;
}

class WeatherService {
  /**
   * 根据经纬度获取天气信息（通过 Vercel 代理）
   */
  async getWeatherByLocation(lng: number, lat: number): Promise<WeatherData | null> {
    try {
      console.log('🌤️ 获取天气信息:', lng, lat);
      
      // 调用 Vercel 代理
      const response = await axios.get(`/api/weather?lng=${lng}&lat=${lat}`, {
        timeout: 10000
      });
      
      console.log('✅ 天气API返回:', response.data);
      
      if (response.data && response.data.city) {
        return {
          city: response.data.city,
          weather: response.data.weather,
          temperature: response.data.temperature,
          humidity: response.data.humidity,
          rainfall: response.data.rainfall,
          rain_intensity: response.data.rain_intensity,
          wind_direction: response.data.wind_direction,
          wind_power: response.data.wind_power
        };
      }
      
      return null;
    } catch (error) {
      console.error('获取天气失败:', error);
      // 返回模拟数据作为降级方案
      return {
        city: '南京市',
        weather: '多云',
        temperature: '22°C',
        humidity: '65%',
        rainfall: '无降雨',
        rain_intensity: 'none'
      };
    }
  }
}

export default new WeatherService();
