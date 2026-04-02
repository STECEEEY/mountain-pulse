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
  async getWeatherByLocation(lng: number, lat: number): Promise<WeatherData | null> {
    try {
      console.log('🌤️ 获取天气信息:', lng, lat);
      
      const response = await axios.get('/api/weather', {
        params: { lng, lat },
        timeout: 15000
      });
      
      if (response.data && response.data.city) {
        console.log('✅ 天气API返回:', response.data);
        return {
          city: response.data.city,
          weather: response.data.weather,
          temperature: response.data.temperature,
          humidity: response.data.humidity,
          rainfall: response.data.rainfall || '无降雨',
          rain_intensity: response.data.rain_intensity || 'none',
          wind_direction: response.data.wind_direction,
          wind_power: response.data.wind_power
        };
      }
      
      throw new Error('天气数据格式错误');
      
    } catch (error) {
      console.error('❌ 获取天气失败:', error);
      // 降级返回模拟数据
      return {
        city: '南京市',
        weather: '多云',
        temperature: '29°C',
        humidity: '65%',
        rainfall: '无降雨',
        rain_intensity: 'none'
      };
    }
  }
}

export default new WeatherService();
