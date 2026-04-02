// src/services/weatherService.ts
import axios from 'axios';

// 注意：前端暴露 API Key 有安全风险，仅作为临时方案
const GAODE_KEY = '4d95a8667039c3e5bb3ddb03ce1c71b8';

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
      
      // 直接调用高德 API
      // 1. 逆地理编码获取 adcode
      const geoResponse = await axios.get('https://restapi.amap.com/v3/geocode/regeo', {
        params: {
          location: `${lng},${lat}`,
          key: GAODE_KEY,
          output: 'JSON'
        },
        timeout: 10000
      });
      
      if (geoResponse.data.status === '1' && geoResponse.data.regeocode) {
        const adcode = geoResponse.data.regeocode.addressComponent.adcode;
        const city = geoResponse.data.regeocode.addressComponent.city || 
                     geoResponse.data.regeocode.addressComponent.province;
        
        // 2. 获取天气
        const weatherResponse = await axios.get('https://restapi.amap.com/v3/weather/weatherInfo', {
          params: {
            city: adcode,
            key: 4d95a8667039c3e5bb3ddb03ce1c71b8,
            extensions: 'all'
          },
          timeout: 10000
        });
        
        if (weatherResponse.data.status === '1' && weatherResponse.data.lives?.[0]) {
          const live = weatherResponse.data.lives[0];
          
          return {
            city: city || live.city,
            weather: live.weather,
            temperature: `${live.temperature}°C`,
            humidity: `${live.humidity}%`,
            rainfall: '无降雨',
            rain_intensity: 'none',
            wind_direction: live.winddirection,
            wind_power: live.windpower
          };
        }
      }
      
      // 返回模拟数据
      return {
        city: '南京市',
        weather: '多云',
        temperature: '22°C',
        humidity: '65%',
        rainfall: '无降雨',
        rain_intensity: 'none'
      };
    } catch (error) {
      console.error('获取天气失败:', error);
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
