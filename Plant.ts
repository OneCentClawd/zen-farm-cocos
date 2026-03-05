/**
 * 植物实例 - 单棵植物的状态管理
 */

import { 
  PlantType, PlantData, HealthState, GrowthStage, StressType,
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
export function createPlant(type: PlantType): PlantData {
  return {
    id: generateId(),
    type,
    plantedAt: Date.now(),
    healthState: HealthState.HEALTHY,
    healthValue: 100,
    growthProgress: 0,
    lastWateredAt: Date.now(),
    harvestCount: 0,
    stressDays: {},
    vernalizationDays: 0,
    canBloom: type !== PlantType.SAKURA,  // 樱花需要春化才能开花
  };
}

/**
 * 获取生长阶段
 */
export function getGrowthStage(plant: PlantData): GrowthStage {
  if (plant.healthState === HealthState.DEAD) return GrowthStage.DEAD;
  
  const progress = plant.growthProgress;
  
  if (progress < 0.05) return GrowthStage.SEED;
  if (progress < 0.15) return GrowthStage.SPROUT;
  if (progress < 0.35) return GrowthStage.SEEDLING;
  if (progress < 0.7) return GrowthStage.GROWING;
  if (progress < 1.0) return GrowthStage.MATURE;
  
  // 超过 1.0 表示衰老
  const config = PLANT_CONFIGS[plant.type];
  if (config.lifespan > 0 && progress > 1.2) {
    return GrowthStage.AGING;
  }
  
  return GrowthStage.MATURE;
}

/**
 * 获取显示用的 emoji
 */
export function getPlantEmoji(plant: PlantData): string {
  const stage = getGrowthStage(plant);
  const config = PLANT_CONFIGS[plant.type];
  
  switch (stage) {
    case GrowthStage.SEED: return '🌰';
    case GrowthStage.SPROUT: return '🌱';
    case GrowthStage.DEAD: return '🥀';
    case GrowthStage.SEEDLING: return '🌿';
    case GrowthStage.GROWING: return '🌿';
    default: return config.emoji;
  }
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
 * 模拟一天的变化
 */
export function simulateDay(
  plant: PlantData,
  soilMoisture: number,
  weather: WeatherData,
  watered: boolean = false
): { plant: PlantData; newSoilMoisture: number } {
  const config = PLANT_CONFIGS[plant.type];
  
  // 已死亡不再变化
  if (plant.healthState === HealthState.DEAD) {
    return { plant, newSoilMoisture: soilMoisture };
  }
  
  // 1. 更新土壤湿度
  const newSoilMoisture = updateSoilMoisture(soilMoisture, weather, 24, watered);
  
  // 2. 检查各类胁迫，累计伤害
  let totalDamage = 0;
  
  const tempStress = checkTemperatureStress(plant, config, weather.temperature);
  totalDamage += tempStress.damage;
  if (tempStress.stressType) {
    plant.stressDays[tempStress.stressType] = (plant.stressDays[tempStress.stressType] || 0) + 1;
  }
  
  const waterStress = checkWaterStress(plant, config, newSoilMoisture);
  totalDamage += waterStress.damage;
  if (waterStress.stressType) {
    plant.stressDays[waterStress.stressType] = (plant.stressDays[waterStress.stressType] || 0) + 1;
  }
  
  const lightStress = checkLightStress(plant, config, weather.sunlight);
  totalDamage += lightStress.damage;
  if (lightStress.stressType) {
    plant.stressDays[lightStress.stressType] = (plant.stressDays[lightStress.stressType] || 0) + 1;
  }
  
  // 3. 恢复（无胁迫时每天恢复 5 点）
  if (totalDamage === 0 && plant.healthValue < 100) {
    plant.healthValue = Math.min(100, plant.healthValue + 5);
  } else {
    plant.healthValue = Math.max(0, plant.healthValue - totalDamage);
  }
  
  // 4. 更新健康状态
  plant.healthState = healthValueToState(plant.healthValue);
  
  // 5. 生长
  if (plant.healthState !== HealthState.DEAD) {
    const growthRate = calculateGrowthRate(plant, config, weather, newSoilMoisture);
    const dailyGrowth = growthRate / config.growthDays;
    plant.growthProgress += dailyGrowth;
    
    // 樱花春化检测
    if (config.needsVernalization && weather.temperature < 7) {
      plant.vernalizationDays++;
      if (plant.vernalizationDays >= (config.vernalizationDays || 30)) {
        plant.canBloom = true;
      }
    }
    
    // 一年生植物超龄死亡
    if (config.lifespan > 0) {
      const age = (Date.now() - plant.plantedAt) / (24 * 60 * 60 * 1000);
      if (age > config.lifespan) {
        plant.healthValue = Math.max(0, plant.healthValue - 5);
        plant.healthState = healthValueToState(plant.healthValue);
      }
    }
  }
  
  return { plant, newSoilMoisture };
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
