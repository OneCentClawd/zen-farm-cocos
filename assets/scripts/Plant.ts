/**
 * 植物实例 - 单棵植物的状态管理
 */

import { 
  PlantType, PlantData, HealthState, StressType, StageConfig,
  PLANT_CONFIGS, PlantConfig, RootBranch 
} from './PlantTypes';
import { WeatherData, updateSoilMoisture } from './Environment';

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * 生成初始根系结构（独一无二）
 */
function generateInitialRoots(): RootBranch[] {
  const branches: RootBranch[] = [];
  // 生成 3-6 条初始侧根"基因"
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    branches.push({
      angle: (i % 2 === 0 ? 1 : -1) * (20 + Math.random() * 40) * Math.PI / 180,
      length: 0.4 + Math.random() * 0.5,  // 40%~90% 的最大宽度
      depth: 0.1 + (i / count) * 0.6,     // 分布在不同深度
      thickness: 0.5 + Math.random() * 0.5,
      subBranches: Math.floor(1 + Math.random() * 3),
      createdAt: 0.02 + Math.random() * 0.1,  // 在早期就"决定"要长出来
    });
  }
  return branches;
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
    rootSpread: 0,
    rootStructure: generateInitialRoots(),  // 独一无二的根系"基因"
    stemWidth: 0,
    tiltAngle: 0,
    tiltDirection: Math.random() * 360,  // 初始随机方向
    
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
    stressHistory: [],
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
 * 获取胁迫类型名称
 */
function getStressName(stress: StressType): string {
  switch (stress) {
    case StressType.HEAT: return '热害';
    case StressType.COLD: return '冻害';
    case StressType.DROUGHT: return '干旱';
    case StressType.WATERLOG: return '积涝';
    case StressType.LOW_LIGHT: return '缺光';
    default: return '未知';
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
    // 首次遭受该类型胁迫时记录事件
    if (updated.stressDays[tempStress.stressType] === 1) {
      const date = new Date().toISOString().split('T')[0];
      updated.stressHistory.push(`${date} ${getStressName(tempStress.stressType)}`);
    }
  }
  
  const waterStress = checkWaterStress(updated, config, newSoilMoisture);
  totalDamage += waterStress.damage;
  if (waterStress.stressType) {
    updated.stressDays[waterStress.stressType] = (updated.stressDays[waterStress.stressType] || 0) + 1;
    if (updated.stressDays[waterStress.stressType] === 1) {
      const date = new Date().toISOString().split('T')[0];
      updated.stressHistory.push(`${date} ${getStressName(waterStress.stressType)}`);
    }
  }
  
  const lightStress = checkLightStress(updated, config, weather.sunlight);
  totalDamage += lightStress.damage;
  if (lightStress.stressType) {
    updated.stressDays[lightStress.stressType] = (updated.stressDays[lightStress.stressType] || 0) + 1;
    if (updated.stressDays[lightStress.stressType] === 1) {
      const date = new Date().toISOString().split('T')[0];
      updated.stressHistory.push(`${date} ${getStressName(lightStress.stressType)}`);
    }
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
    
    // ========== 物理特征：当天环境实时影响形态 ==========
    const baseHeightGrowth = (config.maxHeight / config.growthDays) * growthRate;
    
    // 高度：遮挡下徒长（长得高但细），阳光充足长得矮壮
    let heightMultiplier = 1.0;
    if (inShelter) {
      heightMultiplier = 1.3;  // 遮挡下徒长 30%
    } else if (weather.sunlight > 0.7) {
      heightMultiplier = 0.9;  // 阳光好，矮壮
    }
    updated.height += baseHeightGrowth * heightMultiplier * (0.9 + Math.random() * 0.2);
    updated.height = Math.min(updated.height, config.maxHeight);
    
    // 茎秆粗度：风大长得粗（抗风），遮挡下长得细
    let stemMultiplier = 1.0;
    if (weather.windSpeed > 20) {
      stemMultiplier = 1.5;  // 大风，茎秆加粗
    } else if (inShelter) {
      stemMultiplier = 0.7;  // 遮挡下细弱
    }
    updated.stemWidth += baseHeightGrowth * 0.02 * stemMultiplier;
    
    // 倾斜：风大且茎细容易倾斜，向风向倾斜
    if (!inShelter && weather.windSpeed > 10) {
      // 茎越粗越不容易倾斜
      const stiffness = Math.min(1, updated.stemWidth / 5);  // 茎粗5mm以上基本不倒
      const tiltForce = (weather.windSpeed / 50) * (1 - stiffness);
      
      // 向风向倾斜（渐变，不是突变）
      updated.tiltAngle = Math.min(30, updated.tiltAngle + tiltForce * 2);
      // 倾斜方向渐变到风向
      const windDir = weather.windDirection || 0;
      const dirDiff = ((windDir - updated.tiltDirection + 540) % 360) - 180;
      updated.tiltDirection += dirDiff * 0.1;  // 缓慢转向风向
    } else if (updated.tiltAngle > 0) {
      // 无风时慢慢恢复（茎粗恢复快）
      const recovery = Math.min(1, updated.stemWidth / 3) * 0.5;
      updated.tiltAngle = Math.max(0, updated.tiltAngle - recovery);
    }
    
    // 叶片：阳光好叶子多，缺光叶子少
    const leafChance = weather.sunlight > 0.5 ? 0.4 : 0.15;
    if (updated.growthProgress > 0.1 && Math.random() < leafChance * growthRate) {
      updated.leafCount++;
    }
    
    // 根系深度：干旱时根系长得深（找水），水多则浅
    let rootMultiplier = 1.0;
    if (newSoilMoisture < config.moistureMin) {
      rootMultiplier = 1.5;  // 缺水，根系拼命往下长
    } else if (newSoilMoisture > config.moistureMax) {
      rootMultiplier = 0.6;  // 水多，根系不需要深
    }
    updated.rootDepth += baseHeightGrowth * 0.5 * rootMultiplier * (0.8 + Math.random() * 0.4);
    updated.rootSpread += baseHeightGrowth * 0.3 * (0.8 + Math.random() * 0.4);  // 根系也横向生长
    
    // 叶色：阳光充足颜色深，缺光颜色浅
    const targetColor = weather.sunlight > 0.5 ? updated.growthProgress * 1.2 : updated.growthProgress * 0.8;
    updated.leafColor = Math.min(1, (updated.leafColor * 0.9 + targetColor * 0.1));  // 渐变
    
    // ========== 累计环境数据（仅记录，不影响计算） ==========
    updated.totalSunlightHours += weather.sunlight * 12;
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
