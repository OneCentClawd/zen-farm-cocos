/**
 * 植物实例 - 单棵植物的状态管理
 */

import { 
  PlantType, PlantData, HealthState, StressType, StageConfig,
  PLANT_CONFIGS, PlantConfig 
} from './PlantTypes';
import { WeatherData, updateSoilMoisture } from './Environment';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 创建新植物
 */
export function createPlant(type: PlantType, hardMode: boolean = false): PlantData {
  const config = PLANT_CONFIGS[type];
  return {
    id: generateId(),
    type,
    plantedAt: Date.now(),
    
    // 健康状态
    healthState: HealthState.HEALTHY,
    healthValue: 100,
    
    // 成长进度
    growthProgress: 0,
    currentStageId: 'seed',
    
    // 物理特征 - 初始值（带少量随机性）
    height: 0,
    leafCount: 0,
    rootDepth: 0,
    stemWidth: 0,
    
    // 外观
    leafColor: 0,      // 嫩绿
    wiltLevel: 0,      // 健康
    
    // 养护记录
    lastWateredAt: Date.now(),
    harvestCount: 0,
    totalWaterReceived: 0,
    totalSunlightHours: 0,
    totalRainfallReceived: 0,
    totalWindExposure: 0,
    
    // 极端天气记录
    maxTempSeen: 20,      // 初始假设常温
    minTempSeen: 20,
    maxWindSeen: 0,
    daysInShelter: 0,
    
    // 环境
    stressDays: {},
    vernalizationDays: 0,
    canBloom: type !== PlantType.SAKURA,  // 樱花需要春化才能开花
    
    // 游戏模式
    hardMode,
    
    // 成长日记
    milestones: [{
      stageId: 'seed',
      date: Date.now(),
      weather: '播种',
      height: 0,
    }],
  };
}

/**
 * 根据进度获取当前阶段
 */
export function getCurrentStage(plant: PlantData): StageConfig {
  const config = PLANT_CONFIGS[plant.type];
  const stages = config.stages;
  
  // 死亡特殊处理
  if (plant.healthState === HealthState.DEAD) {
    return { id: 'dead', name: '枯萎', emoji: '🥀', progress: 0, description: '植物已经枯萎' };
  }
  
  // 从后往前找，找到第一个 progress <= 当前进度 的阶段
  for (let i = stages.length - 1; i >= 0; i--) {
    const stage = stages[i];
    
    // 检查条件
    if (stage.condition === 'vernalization' && !plant.canBloom) {
      continue;  // 跳过需要春化但未完成的阶段
    }
    
    if (plant.growthProgress >= stage.progress) {
      return stage;
    }
  }
  
  return stages[0];
}

/**
 * 获取显示用的 emoji
 */
export function getPlantEmoji(plant: PlantData): string {
  const stage = getCurrentStage(plant);
  return stage.emoji;
}

/**
 * 获取健康状态 emoji
 */
export function getHealthEmoji(state: HealthState): string {
  switch (state) {
    case HealthState.HEALTHY: return '🟢';
    case HealthState.MINOR_DAMAGE: return '🟡';
    case HealthState.DAMAGED: return '🟠';
    case HealthState.SEVERE: return '🔴';
    case HealthState.DEAD: return '⚫';
  }
}

/**
 * 健康值转状态
 */
function healthValueToState(value: number): HealthState {
  if (value <= 0) return HealthState.DEAD;
  if (value < 25) return HealthState.SEVERE;
  if (value < 50) return HealthState.DAMAGED;
  if (value < 75) return HealthState.MINOR_DAMAGE;
  return HealthState.HEALTHY;
}

/**
 * 检查温度胁迫
 */
function checkTemperatureStress(
  plant: PlantData,
  config: PlantConfig,
  temperature: number
): { damage: number; stressType: StressType | null } {
  // 高温致死
  if (temperature >= config.tempLethalHigh) {
    return { damage: 50, stressType: StressType.HEAT };
  }
  
  // 低温致死
  if (temperature <= config.tempLethalLow) {
    return { damage: 50, stressType: StressType.COLD };
  }
  
  // 热害
  if (temperature >= config.tempHeatDamage) {
    const severity = (temperature - config.tempHeatDamage) / 10;
    const damage = severity * (1 - config.heatTolerance) * 5;
    return { damage, stressType: StressType.HEAT };
  }
  
  // 冻害
  if (temperature <= config.tempColdDamage) {
    const severity = (config.tempColdDamage - temperature) / 10;
    const damage = severity * (1 - config.coldTolerance) * 8;
    return { damage, stressType: StressType.COLD };
  }
  
  return { damage: 0, stressType: null };
}

/**
 * 检查水分胁迫
 */
function checkWaterStress(
  plant: PlantData,
  config: PlantConfig,
  soilMoisture: number
): { damage: number; stressType: StressType | null } {
  // 干旱
  if (soilMoisture < config.moistureMin) {
    const severity = (config.moistureMin - soilMoisture) / config.moistureMin;
    const damage = severity * (1 - config.droughtTolerance) * 8;
    return { damage, stressType: StressType.DROUGHT };
  }
  
  // 积涝
  if (soilMoisture > config.moistureMax) {
    const severity = (soilMoisture - config.moistureMax) / (100 - config.moistureMax);
    const damage = severity * (1 - config.waterlogTolerance) * 10;
    return { damage, stressType: StressType.WATERLOG };
  }
  
  return { damage: 0, stressType: null };
}

/**
 * 检查光照胁迫
 */
function checkLightStress(
  plant: PlantData,
  config: PlantConfig,
  sunlight: number
): { damage: number; stressType: StressType | null } {
  if (sunlight < config.sunlightMin) {
    const severity = (config.sunlightMin - sunlight) / config.sunlightMin;
    const damage = severity * 3;
    return { damage, stressType: StressType.LOW_LIGHT };
  }
  return { damage: 0, stressType: null };
}

/**
 * 计算生长速度
 */
function calculateGrowthRate(
  plant: PlantData,
  config: PlantConfig,
  weather: WeatherData,
  soilMoisture: number
): number {
  let rate = 1.0;
  
  // 健康影响
  rate *= plant.healthValue / 100;
  
  // 温度影响
  const temp = weather.temperature;
  if (temp >= config.tempMin && temp <= config.tempMax) {
    rate *= 1.0;
  } else if (temp < config.tempMin) {
    rate *= Math.max(0.1, 1 - (config.tempMin - temp) / 20);
  } else {
    rate *= Math.max(0.1, 1 - (temp - config.tempMax) / 20);
  }
  
  // 水分影响
  if (soilMoisture < config.moistureMin || soilMoisture > config.moistureMax) {
    rate *= 0.5;
  } else if (Math.abs(soilMoisture - config.moistureOptimal) < 10) {
    rate *= 1.2;  // 最佳湿度加成
  }
  
  // 日照影响
  if (weather.sunlight < config.sunlightMin) {
    rate *= 0.5;
  }
  
  return Math.max(0, rate);
}

/**
 * 模拟一天的变化（纯函数，不修改原对象）
 */
export function simulateDay(
  plant: PlantData,
  soilMoisture: number,
  weather: WeatherData,
  watered: boolean = false,
  inShelter: boolean = false
): { plant: PlantData; newSoilMoisture: number } {
  const config = PLANT_CONFIGS[plant.type];
  
  // 已死亡不再变化
  if (plant.healthState === HealthState.DEAD) {
    return { plant, newSoilMoisture: soilMoisture };
  }
  
  // 创建副本，不修改原对象
  const updated: PlantData = {
    ...plant,
    stressDays: { ...plant.stressDays },
    milestones: [...plant.milestones],
  };
  
  // 记录遮挡天数
  if (inShelter) {
    updated.daysInShelter++;
  }
  
  // 记录浇水
  if (watered) {
    updated.totalWaterReceived++;
    updated.lastWateredAt = Date.now();
  }
  
  // 1. 更新土壤湿度
  const newSoilMoisture = updateSoilMoisture(soilMoisture, weather, 24, watered);
  
  // 2. 检查各类胁迫，累计伤害
  let totalDamage = 0;
  
  const tempStress = checkTemperatureStress(updated, config, weather.temperature);
  totalDamage += tempStress.damage;
  if (tempStress.stressType) {
    updated.stressDays[tempStress.stressType] = (updated.stressDays[tempStress.stressType] || 0) + 1;
  }
  
  const waterStress = checkWaterStress(updated, config, newSoilMoisture);
  totalDamage += waterStress.damage;
  if (waterStress.stressType) {
    updated.stressDays[waterStress.stressType] = (updated.stressDays[waterStress.stressType] || 0) + 1;
  }
  
  const lightStress = checkLightStress(updated, config, weather.sunlight);
  totalDamage += lightStress.damage;
  if (lightStress.stressType) {
    updated.stressDays[lightStress.stressType] = (updated.stressDays[lightStress.stressType] || 0) + 1;
  }
  
  // 3. 恢复（无胁迫时每天恢复 5 点）
  if (totalDamage === 0 && updated.healthValue < 100) {
    updated.healthValue = Math.min(100, updated.healthValue + 5);
  } else {
    updated.healthValue = Math.max(0, updated.healthValue - totalDamage);
  }
  
  // 4. 更新健康状态和外观
  updated.healthState = healthValueToState(updated.healthValue);
  updated.wiltLevel = 1 - updated.healthValue / 100;  // 萎蔫程度
  
  // 5. 生长
  if (updated.healthState !== HealthState.DEAD) {
    const oldStageId = getCurrentStage(updated).id;
    
    const growthRate = calculateGrowthRate(updated, config, weather, newSoilMoisture);
    const dailyGrowth = growthRate / config.growthDays;
    updated.growthProgress = Math.min(1, updated.growthProgress + dailyGrowth);  // 限制上限
    
    // 更新物理特征（带少量随机性，让每棵植物独特）
    const heightGrowth = (config.maxHeight / config.growthDays) * growthRate;
    updated.height += heightGrowth * (0.9 + Math.random() * 0.2);
    updated.height = Math.min(updated.height, config.maxHeight);
    
    // 叶片随进度增长
    if (updated.growthProgress > 0.1 && Math.random() < 0.3 * growthRate) {
      updated.leafCount++;
    }
    
    // 根系深度
    updated.rootDepth += heightGrowth * 0.5 * (0.8 + Math.random() * 0.4);
    
    // 茎秆粗度
    updated.stemWidth += heightGrowth * 0.02;
    
    // 叶色随成熟度变深
    updated.leafColor = Math.min(1, updated.growthProgress * 1.2);
    
    // 累计环境数据
    updated.totalSunlightHours += weather.sunlight * 12;  // 假设白天12小时
    updated.totalRainfallReceived += weather.precipitation;
    updated.totalWindExposure += weather.windSpeed;
    
    // 记录极端天气
    updated.maxTempSeen = Math.max(updated.maxTempSeen, weather.temperature);
    updated.minTempSeen = Math.min(updated.minTempSeen, weather.temperature);
    updated.maxWindSeen = Math.max(updated.maxWindSeen, weather.windSpeed);
    
    // 检测阶段变化，记录里程碑
    const newStage = getCurrentStage(updated);
    if (newStage.id !== oldStageId) {
      updated.currentStageId = newStage.id;
      updated.milestones.push({
        stageId: newStage.id,
        date: Date.now(),
        weather: getWeatherDescription(weather),
        height: updated.height,
      });
      console.log(`🌱 ${config.name} 进入新阶段: ${newStage.name}`);
    }
    
    // 樱花春化检测
    if (config.needsVernalization && weather.temperature < 7) {
      updated.vernalizationDays++;
      if (updated.vernalizationDays >= (config.vernalizationDays || 30)) {
        updated.canBloom = true;
      }
    }
    
    // 一年生植物超龄死亡
    if (config.lifespan > 0) {
      const age = (Date.now() - updated.plantedAt) / (24 * 60 * 60 * 1000);
      if (age > config.lifespan) {
        updated.healthValue = Math.max(0, updated.healthValue - 5);
        updated.healthState = healthValueToState(updated.healthValue);
      }
    }
  }
  
  return { plant: updated, newSoilMoisture };
}

/**
 * 获取天气描述
 */
function getWeatherDescription(weather: WeatherData): string {
  const temp = weather.temperature.toFixed(0);
  if (weather.precipitation > 5) return `🌧️ 雨天 ${temp}°C`;
  if (weather.precipitation > 0) return `🌦️ 小雨 ${temp}°C`;
  if (weather.sunlight > 0.8) return `☀️ 晴天 ${temp}°C`;
  if (weather.sunlight > 0.5) return `⛅ 多云 ${temp}°C`;
  return `☁️ 阴天 ${temp}°C`;
}

/**
 * 模拟多天（离线补算）
 */
export function simulateOffline(
  plant: PlantData,
  soilMoisture: number,
  weatherHistory: WeatherData[]
): { plant: PlantData; soilMoisture: number } {
  let currentMoisture = soilMoisture;
  
  for (const weather of weatherHistory) {
    const result = simulateDay(plant, currentMoisture, weather, false);
    plant = result.plant;
    currentMoisture = result.newSoilMoisture;
    
    if (plant.healthState === HealthState.DEAD) break;
  }
  
  return { plant, soilMoisture: currentMoisture };
}
