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
  private gaodeKey = '4d95a8667039c3e5bb3ddb03ce1c71b8'; // 替换成你的高德Key
  
  /**
   * 根据经纬度获取天气信息（使用高德 API）
   */
  async getWeatherByLocation(lng: number, lat: number): Promise<WeatherData | null> {
    try {
      console.log('🌤️ 获取天气信息:', lng, lat);
      
      // 1. 先通过高德逆地理编码获取城市编码
      const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${this.gaodeKey}&output=JSON`;
      
      const geoResponse = await axios.get(geoUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (geoResponse.data.status === '1' && geoResponse.data.regeocode) {
        const adcode = geoResponse.data.regeocode.addressComponent.adcode;
        const city = geoResponse.data.regeocode.addressComponent.city || 
                     geoResponse.data.regeocode.addressComponent.province;
        
        // 2. 根据城市编码获取天气
        const weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${this.gaodeKey}&extensions=all`;
        
        const weatherResponse = await axios.get(weatherUrl, {
          timeout: 10000,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (weatherResponse.data.status === '1' && weatherResponse.data.lives && weatherResponse.data.lives[0]) {
          const live = weatherResponse.data.lives[0];
          const forecasts = weatherResponse.data.forecasts?.[0]?.casts || [];
          
          // 获取今日降水概率和降水量
          let rainfall = '无降雨';
          let rainIntensity: 'none' | 'light' | 'moderate' | 'heavy' = 'none';
          
          if (forecasts[0] && forecasts[0].dayweather && forecasts[0].dayweather.includes('雨')) {
            rainfall = forecasts[0].dayweather;
            // 根据天气判断雨强
            if (forecasts[0].dayweather.includes('暴雨')) rainIntensity = 'heavy';
            else if (forecasts[0].dayweather.includes('大雨')) rainIntensity = 'heavy';
            else if (forecasts[0].dayweather.includes('中雨')) rainIntensity = 'moderate';
            else if (forecasts[0].dayweather.includes('小雨')) rainIntensity = 'light';
            else rainIntensity = 'light';
          }
          
          return {
            city: city || live.city,
            weather: live.weather,
            temperature: `${live.temperature}°C`,
            humidity: `${live.humidity}%`,
            rainfall: rainfall,
            rain_intensity: rainIntensity,
            wind_direction: live.winddirection,
            wind_power: live.windpower
          };
        }
      }
      
      return null;
      
    } catch (error) {
      console.error('获取天气失败:', error);
      return null;
    }
  }
}

export default new WeatherService();
