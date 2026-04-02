// api/weather.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { lng, lat } = req.query;
  const gaodeKey = '4d95a8667039c3e5bb3ddb03ce1c71b8';
  
  // 参数验证
  if (!lng || !lat) {
    return res.status(400).json({ error: '缺少经纬度参数' });
  }
  
  try {
    console.log('🌤️ 高德天气 API 被调用:', { lng, lat });
    
    // 1. 逆地理编码获取 adcode
    const geoResponse = await axios.get('https://restapi.amap.com/v3/geocode/regeo', {
      params: {
        location: `${lng},${lat}`,
        key: gaodeKey,
        output: 'JSON'
      },
      timeout: 10000
    });
    
    if (geoResponse.data.status !== '1') {
      console.error('逆地理编码失败:', geoResponse.data);
      return res.status(404).json({ error: '无法获取位置信息' });
    }
    
    const adcode = geoResponse.data.regeocode.addressComponent.adcode;
    const city = geoResponse.data.regeocode.addressComponent.city || 
                 geoResponse.data.regeocode.addressComponent.province;
    
    console.log('📍 获取到城市:', city, 'adcode:', adcode);
    
    // 2. 获取实时天气 (extensions: 'base')
    const weatherResponse = await axios.get('https://restapi.amap.com/v3/weather/weatherInfo', {
      params: {
        city: adcode,
        key: gaodeKey,
        extensions: 'base'
      },
      timeout: 10000
    });
    
    if (weatherResponse.data.status !== '1' || !weatherResponse.data.lives?.[0]) {
      console.error('获取天气失败:', weatherResponse.data);
      return res.status(404).json({ error: '无法获取天气信息' });
    }
    
    const live = weatherResponse.data.lives[0];
    console.log('☁️ 获取到天气:', live);
    
    // 返回天气数据
    return res.status(200).json({
      city: city || live.city,
      weather: live.weather,
      temperature: `${live.temperature}°C`,
      humidity: `${live.humidity}%`,
      rainfall: '无降雨',
      rain_intensity: 'none',
      wind_direction: live.winddirection,
      wind_power: live.windpower,
      report_time: live.reporttime
    });
    
  } catch (error) {
    console.error('天气代理错误:', error);
    return res.status(500).json({ error: '获取天气失败', details: String(error) });
  }
}
