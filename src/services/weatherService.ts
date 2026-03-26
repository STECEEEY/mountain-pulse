export interface WeatherData {
  city: string
  weather: string
  temperature: string
  humidity: string
  rainfall: string  // 降雨描述
  rain_intensity: 'none' | 'light' | 'moderate' | 'heavy' | 'torrential'  // 降雨强度
  updateTime: string
}

class WeatherService {
  private apiKey = 'gHaJiDGVnTVL5jdAuLEBS0nZdgH5uxM1' 

  // 根据经纬度获取天气
  async getWeatherByLocation(lng: number, lat: number): Promise<WeatherData | null> {
    try {
      // 1. 先获取城市代码
      const locationRes = await fetch(
        `https://api.map.baidu.com/geocoder/v2/?location=${lat},${lng}&output=json&ak=${this.apiKey}`
      )
      const locationData = await locationRes.json()
      
      if (locationData.status !== 0) {
        console.error('获取城市信息失败:', locationData)
        return null
      }
      
      const city = locationData.result.addressComponent.city
      console.log('当前城市:', city)
      
      // 2. 获取天气信息
      const weatherRes = await fetch(
        `https://api.map.baidu.com/weather/v1/?district_id=${encodeURIComponent(city)}&data_type=all&ak=${this.apiKey}`
      )
      const weatherData = await weatherRes.json()
      
      if (weatherData.status !== 0) {
        console.error('获取天气失败:', weatherData)
        return null
      }
      
      const forecast = weatherData.result.forecasts[0]
      const todayWeather = forecast.weather
      const todayTemp = `${forecast.temp_low}℃ ~ ${forecast.temp_high}℃`
      const humidity = weatherData.result.humidity || '未知'
      
      // 解析降雨情况
      const rainfall = this.parseRainfall(todayWeather)
      const rain_intensity = this.getRainIntensity(todayWeather)
      
      return {
        city: city,
        weather: todayWeather,
        temperature: todayTemp,
        humidity: `${humidity}%`,
        rainfall: rainfall,
        rain_intensity: rain_intensity,
        updateTime: new Date().toLocaleString()
      }
    } catch (error) {
      console.error('获取天气失败:', error)
      return null
    }
  }

  // 解析降雨描述
  private parseRainfall(weather: string): string {
    if (weather.includes('雨')) {
      if (weather.includes('暴雨')) return '暴雨'
      if (weather.includes('大雨')) return '大雨'
      if (weather.includes('中雨')) return '中雨'
      if (weather.includes('小雨')) return '小雨'
      if (weather.includes('阵雨')) return '阵雨'
      if (weather.includes('雷阵雨')) return '雷阵雨'
      return '有雨'
    }
    return '无雨'
  }

  // 获取降雨强度
  private getRainIntensity(weather: string): 'none' | 'light' | 'moderate' | 'heavy' | 'torrential' {
    if (weather.includes('暴雨')) return 'torrential'
    if (weather.includes('大雨')) return 'heavy'
    if (weather.includes('中雨')) return 'moderate'
    if (weather.includes('小雨') || weather.includes('阵雨') || weather.includes('雷阵雨')) return 'light'
    return 'none'
  }

  // 构建天气描述文本
  buildWeatherDescription(weather: WeatherData | null): string {
    if (!weather) {
      return '天气信息获取失败'
    }
    
    let description = `当前天气：${weather.weather}，温度${weather.temperature}`
    if (weather.rain_intensity !== 'none') {
      description += `，${weather.rainfall}，请注意防范`
    }
    return description
  }
}

export default new WeatherService()