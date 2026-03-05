/**
 * 植物类型定义
 */
export enum PlantType {
  CLOVER = 'clover',           // 幸运草 ★
  SUNFLOWER = 'sunflower',     // 向日葵 ★★
  STRAWBERRY = 'strawberry',   // 草莓 ★★★★
  SAKURA = 'sakura',           // 樱花 ★★★★★
}

/**
 * 健康状态
 */
export enum HealthState {
  HEALTHY = 'healthy',              // 健康
  MINOR_DAMAGE = 'minor_damage',    // 轻微受损
  DAMAGED = 'damaged',              // 明显受损
  SEVERE = 'severe',                // 严重衰弱
  DEAD = 'dead',                    // 死亡
}

/**
 * 生长阶段
 */
export enum GrowthStage {
  SEED = 'seed',           // 种子
  SPROUT = 'sprout',       // 发芽
  SEEDLING = 'seedling',   // 幼苗
  GROWING = 'growing',     // 成长
  MATURE = 'mature',       // 成熟
  AGING = 'aging',         // 衰老
  DEAD = 'dead',           // 死亡
}

/**
 * 胁迫类型
 */
export enum StressType {
  HEAT = 'heat',           // 热害
  COLD = 'cold',           // 冻害
  DROUGHT = 'drought',     // 干旱
  WATERLOG = 'waterlog',   // 积涝
  LOW_LIGHT = 'low_light', // 缺光
}

/**
 * 植物实例数据
 */
export interface PlantData {
  id: string;
  type: PlantType;
  plantedAt: number;              // 播种时间戳
  healthState: HealthState;
  healthValue: number;            // 0~100
  growthProgress: number;         // 0~1
  lastWateredAt: number;
  harvestCount: number;
  stressDays: Record<string, number>;  // 各类胁迫累计天数
}

/**
 * 植物配置（生长条件）
 */
export interface PlantConfig {
  type: PlantType;
  name: string;
  emoji: string;
  difficulty: number;             // 1-5
  
  // 温度
  tempMin: number;                // 适宜最低温
  tempMax: number;                // 适宜最高温
  tempHeatDamage: number;         // 热害温度
  tempColdDamage: number;         // 冻害温度
  tempLethal: number;             // 致死温度
  
  // 水分
  moistureMin: number;            // 最低湿度
  moistureMax: number;            // 最高湿度
  moistureOptimal: number;        // 最佳湿度
  
  // 日照
  sunlightMin: number;            // 最低日照 0~1
  
  // 生长
  growthDays: number;             // 成熟天数
  lifespan: number;               // 寿命（天），-1 表示多年生
  
  // 耐受性
  droughtTolerance: number;       // 耐旱 0~1
  waterlogTolerance: number;      // 耐涝 0~1
  heatTolerance: number;          // 耐热 0~1
  coldTolerance: number;          // 耐寒 0~1
}

/**
 * 植物配置表
 */
export const PLANT_CONFIGS: Record<PlantType, PlantConfig> = {
  [PlantType.CLOVER]: {
    type: PlantType.CLOVER,
    name: '幸运草',
    emoji: '🍀',
    difficulty: 1,
    tempMin: 10,
    tempMax: 25,
    tempHeatDamage: 30,
    tempColdDamage: -5,
    tempLethal: 40,
    moistureMin: 20,
    moistureMax: 70,
    moistureOptimal: 45,
    sunlightMin: 0.2,
    growthDays: 14,
    lifespan: -1,  // 多年生
    droughtTolerance: 0.8,
    waterlogTolerance: 0.5,
    heatTolerance: 0.6,
    coldTolerance: 0.9,
  },
  
  [PlantType.SUNFLOWER]: {
    type: PlantType.SUNFLOWER,
    name: '向日葵',
    emoji: '🌻',
    difficulty: 2,
    tempMin: 18,
    tempMax: 30,
    tempHeatDamage: 35,
    tempColdDamage: 10,
    tempLethal: 0,
    moistureMin: 30,
    moistureMax: 60,
    moistureOptimal: 45,
    sunlightMin: 0.6,
    growthDays: 60,
    lifespan: 120,  // 一年生
    droughtTolerance: 0.5,
    waterlogTolerance: 0.4,
    heatTolerance: 0.7,
    coldTolerance: 0.2,
  },
  
  [PlantType.STRAWBERRY]: {
    type: PlantType.STRAWBERRY,
    name: '草莓',
    emoji: '🍓',
    difficulty: 4,
    tempMin: 15,
    tempMax: 25,
    tempHeatDamage: 28,
    tempColdDamage: -5,
    tempLethal: 35,
    moistureMin: 50,
    moistureMax: 70,
    moistureOptimal: 60,
    sunlightMin: 0.5,
    growthDays: 90,
    lifespan: 730,  // 2年
    droughtTolerance: 0.2,
    waterlogTolerance: 0.1,
    heatTolerance: 0.2,
    coldTolerance: 0.4,
  },
  
  [PlantType.SAKURA]: {
    type: PlantType.SAKURA,
    name: '樱花',
    emoji: '🌸',
    difficulty: 5,
    tempMin: 15,
    tempMax: 25,
    tempHeatDamage: 35,
    tempColdDamage: -15,
    tempLethal: 40,
    moistureMin: 30,
    moistureMax: 60,
    moistureOptimal: 45,
    sunlightMin: 0.5,
    growthDays: 365,
    lifespan: -1,  // 多年生
    droughtTolerance: 0.5,
    waterlogTolerance: 0.2,
    heatTolerance: 0.4,
    coldTolerance: 0.8,
  },
};
