// api/weather.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { lng, lat } = req.query;
  const gaodeKey = process.env.GAODE_API_KEY || '你的高德地图Key';
  
  try {
    console.log('🌤️ 天气代理被调用:', lng, lat);
    
    // 逆地理编码获取城市 adcode
    const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?location=${lng},${lat}&key=${gaodeKey}&output=JSON`;
    const geoResponse = await axios.get(geoUrl);
    
    if (geoResponse.data.status === '1') {
      const adcode = geoResponse.data.regeocode.addressComponent.adcode;
      const city = geoResponse.data.regeocode.addressComponent.city || 
                   geoResponse.data.regeocode.addressComponent.province;
      
      // 获取天气
      const weatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${gaodeKey}&extensions=all`;
      const weatherResponse = await axios.get(weatherUrl);
      
      if (weatherResponse.data.status === '1' && weatherResponse.data.lives?.[0]) {
        const live = weatherResponse.data.lives[0];
        const forecasts = weatherResponse.data.forecasts?.[0]?.casts || [];
        
        let rainfall = '无降雨';
        let rainIntensity: 'none' | 'light' | 'moderate' | 'heavy' = 'none';
        
        if (forecasts[0] && forecasts[0].dayweather && forecasts[0].dayweather.includes('雨')) {
          rainfall = forecasts[0].dayweather;
          if (forecasts[0].dayweather.includes('暴雨')) rainIntensity = 'heavy';
          else if (forecasts[0].dayweather.includes('大雨')) rainIntensity = 'heavy';
          else if (forecasts[0].dayweather.includes('中雨')) rainIntensity = 'moderate';
          else if (forecasts[0].dayweather.includes('小雨')) rainIntensity = 'light';
        }
        
        return res.status(200).json({
          city: city || live.city,
          weather: live.weather,
          temperature: `${live.temperature}°C`,
          humidity: `${live.humidity}%`,
          rainfall: rainfall,
          rain_intensity: rainIntensity,
          wind_direction: live.winddirection,
          wind_power: live.windpower
        });
      }
    }
    
    return res.status(404).json({ error: '未找到天气信息' });
  } catch (error) {
    console.error('天气代理错误:', error);
    return res.status(500).json({ error: '获取天气失败' });
  }
}
