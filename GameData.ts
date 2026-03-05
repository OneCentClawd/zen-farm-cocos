/**
 * 地块系统 - 管理多块地和植物
 */

import { PlantType, PlantData, HealthState, PLANT_CONFIGS } from './PlantTypes';
import { WeatherData, updateSoilMoisture } from './Environment';
import { createPlant, simulateDay, simulateOffline } from './Plant';

/**
 * 地块数据
 */
export interface PlotData {
  id: number;
  plant: PlantData | null;
  soilMoisture: number;
  lastUpdatedAt: number;
  hasShelter: boolean;          // 是否有遮雨棚
  hasDehumidifier: boolean;     // 是否有除湿器
}

/**
 * 游戏存档数据
 */
export interface GameSaveData {
  version: number;
  plots: PlotData[];
  unlockedPlots: number;      // 已解锁地块数
  lastOnlineAt: number;       // 上次在线时间
  location: { lat: number; lon: number };
  totalHarvests: number;      // 总收获次数
}

/**
 * 创建新地块
 */
export function createPlot(id: number): PlotData {
  return {
    id,
    plant: null,
    soilMoisture: 50,
    lastUpdatedAt: Date.now(),
    hasShelter: false,
    hasDehumidifier: false,
  };
}

/**
 * 种植
 */
export function plantSeed(plot: PlotData, type: PlantType, hardMode: boolean = false): PlotData {
  return {
    ...plot,
    plant: createPlant(type, hardMode),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 浇水
 */
export function waterPlot(plot: PlotData): PlotData {
  const newMoisture = Math.min(100, plot.soilMoisture + 20);
  return {
    ...plot,
    soilMoisture: newMoisture,
    plant: plot.plant ? { ...plot.plant, lastWateredAt: Date.now() } : null,
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 收获
 */
export function harvestPlot(plot: PlotData): { plot: PlotData; harvested: boolean } {
  if (!plot.plant) return { plot, harvested: false };
  
  const config = PLANT_CONFIGS[plot.plant.type];
  
  // 只有成熟且健康的植物才能收获
  if (plot.plant.growthProgress < 1.0 || plot.plant.healthState === HealthState.DEAD) {
    return { plot, harvested: false };
  }
  
  // 一年生植物收获后死亡（用 isAnnual 判断，而不是 lifespan）
  if (config.isAnnual) {
    return {
      plot: {
        ...plot,
        plant: null,
        lastUpdatedAt: Date.now(),
      },
      harvested: true,
    };
  }
  
  // 多年生植物可以继续收获
  return {
    plot: {
      ...plot,
      plant: {
        ...plot.plant,
        harvestCount: plot.plant.harvestCount + 1,
      },
      lastUpdatedAt: Date.now(),
    },
    harvested: true,
  };
}

/**
 * 挖掉植物
 */
export function removePlant(plot: PlotData): PlotData {
  return {
    ...plot,
    plant: null,
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 更新地块（实时）
 */
export function updatePlot(plot: PlotData, weather: WeatherData): PlotData {
  // 计算经过的小时数
  const now = Date.now();
  const hours = (now - plot.lastUpdatedAt) / (1000 * 60 * 60);
  
  // 不足 1 小时不更新
  if (hours < 1) return plot;
  
  // 调整天气效果（遮雨棚/除湿器）
  let effectiveWeather = { ...weather };
  
  // 遮雨棚：阻挡降雨
  if (plot.hasShelter) {
    effectiveWeather.precipitation = 0;
  }
  
  // 更新土壤湿度
  let newMoisture = updateSoilMoisture(plot.soilMoisture, effectiveWeather, hours, false);
  
  // 除湿器：每小时降低 2% 湿度
  if (plot.hasDehumidifier) {
    newMoisture = Math.max(0, newMoisture - hours * 2);
  }
  
  // 没有植物，只更新土壤
  if (!plot.plant) {
    return {
      ...plot,
      soilMoisture: newMoisture,
      lastUpdatedAt: now,
    };
  }
  
  // 按天模拟植物
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    const result = simulateDay(plot.plant, plot.soilMoisture, effectiveWeather, false);
    return {
      ...plot,
      plant: result.plant,
      soilMoisture: result.newSoilMoisture,
      lastUpdatedAt: now,
    };
  }
  
  // 不足一天，只更新土壤湿度
  return { 
    ...plot, 
    soilMoisture: newMoisture,
    lastUpdatedAt: now,
  };
}

/**
 * 安装遮雨棚
 */
export function installShelter(plot: PlotData): PlotData {
  return { ...plot, hasShelter: true };
}

/**
 * 移除遮雨棚
 */
export function removeShelter(plot: PlotData): PlotData {
  return { ...plot, hasShelter: false };
}

/**
 * 安装除湿器
 */
export function installDehumidifier(plot: PlotData): PlotData {
  return { ...plot, hasDehumidifier: true };
}

/**
 * 移除除湿器
 */
export function removeDehumidifier(plot: PlotData): PlotData {
  return { ...plot, hasDehumidifier: false };
}

/**
 * 离线补算
 */
export function updatePlotOffline(
  plot: PlotData,
  weatherHistory: WeatherData[]
): PlotData {
  if (!plot.plant || weatherHistory.length === 0) return plot;
  
  const result = simulateOffline(plot.plant, plot.soilMoisture, weatherHistory);
  
  return {
    ...plot,
    plant: result.plant,
    soilMoisture: result.soilMoisture,
    lastUpdatedAt: Date.now(),
  };
}

/**
 * 初始化新游戏存档
 */
export function createNewGame(lat: number = 31.23, lon: number = 121.47): GameSaveData {
  return {
    version: 1,
    plots: [createPlot(0)],
    unlockedPlots: 1,
    lastOnlineAt: Date.now(),
    location: { lat, lon },
    totalHarvests: 0,
  };
}

/**
 * 解锁新地块
 */
export function unlockPlot(save: GameSaveData): GameSaveData {
  const newPlotId = save.plots.length;
  return {
    ...save,
    plots: [...save.plots, createPlot(newPlotId)],
    unlockedPlots: save.unlockedPlots + 1,
  };
}
