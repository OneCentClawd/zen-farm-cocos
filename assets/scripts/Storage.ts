/**
 * 存储管理 - 本地数据持久化
 */

import { GameSaveData, createNewGame } from './GameData';
import { sys } from 'cc';

const SAVE_KEY = 'zen_farm_save';
const WEATHER_CACHE_KEY = 'zen_farm_weather_cache';

/**
 * 保存游戏
 */
export function saveGame(data: GameSaveData): void {
  try {
    const json = JSON.stringify(data);
    sys.localStorage.setItem(SAVE_KEY, json);
    console.log('💾 游戏已保存');
  } catch (e) {
    console.error('保存失败:', e);
  }
}

/**
 * 加载游戏
 */
export function loadGame(): GameSaveData | null {
  try {
    const json = sys.localStorage.getItem(SAVE_KEY);
    if (!json) return null;
    
    const data = JSON.parse(json) as GameSaveData;
    console.log('📂 存档已加载');
    return data;
  } catch (e) {
    console.error('加载失败:', e);
    return null;
  }
}

/**
 * 删除存档
 */
export function deleteSave(): void {
  sys.localStorage.removeItem(SAVE_KEY);
  console.log('🗑️ 存档已删除');
}

/**
 * 加载或创建新游戏
 */
export function loadOrCreateGame(lat?: number, lon?: number): GameSaveData {
  const saved = loadGame();
  if (saved) return saved;
  return createNewGame(lat, lon);
}

/**
 * 缓存天气数据
 */
export function cacheWeather(weather: any): void {
  try {
    const cache = {
      data: weather,
      timestamp: Date.now(),
    };
    sys.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('缓存天气失败:', e);
  }
}

/**
 * 获取缓存的天气（1小时内有效）
 */
export function getCachedWeather(): any | null {
  try {
    const json = sys.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!json) return null;
    
    const cache = JSON.parse(json);
    const age = Date.now() - cache.timestamp;
    
    // 超过 1 小时过期
    if (age > 60 * 60 * 1000) return null;
    
    return cache.data;
  } catch (e) {
    return null;
  }
}
