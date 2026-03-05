/**
 * 地块系统 - 管理多块地和植物
 */

import { PlantType, PlantData, HealthState, PLANT_CONFIGS } from './PlantTypes';
import { WeatherData } from './Environment';
import { createPlant, simulateDay, simulateOffline } from './Plant';

/**
 * 地块数据
 */
export interface PlotData {
  id: number;
  plant: PlantData | null;
  soilMoisture: number;
  lastUpdatedAt: number;
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
  };
}

/**
 * 种植
 */
export function plantSeed(plot: PlotData, type: PlantType): PlotData {
  return {
    ...plot,
    plant: createPlant(type),
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
  
  // 一年生植物收获后死亡
  if (config.lifespan > 0 && config.lifespan < 365) {
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
  if (!plot.plant) return plot;
  
  // 计算经过的小时数
  const now = Date.now();
  const hours = (now - plot.lastUpdatedAt) / (1000 * 60 * 60);
  
  // 不足 1 小时不更新
  if (hours < 1) return plot;
  
  // 按天模拟
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    const result = simulateDay(plot.plant, plot.soilMoisture, weather, false);
    return {
      ...plot,
      plant: result.plant,
      soilMoisture: result.newSoilMoisture,
      lastUpdatedAt: now,
    };
  }
  
  return { ...plot, lastUpdatedAt: now };
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
