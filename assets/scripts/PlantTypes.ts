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
 * 成长阶段配置
 */
export interface StageConfig {
  id: string;            // 阶段 ID
  name: string;          // 阶段名称
  emoji: string;         // 临时占位
  sprite?: string;       // 美术素材路径
  progress: number;      // 触发进度 0~1
  description: string;   // 描述文字
  condition?: string;    // 可选条件：'vernalization' 需要春化
}

/**
 * 成长里程碑
 */
export interface Milestone {
  stageId: string;       // 阶段 ID
  date: number;          // 时间戳
  weather: string;       // 当时天气描述
  height: number;        // 当时高度
  note?: string;         // 可选备注
}

/**
 * 根系分支 - 记录每条侧根的形态
 */
export interface RootBranch {
  angle: number;         // 生长角度（弧度）
  length: number;        // 相对长度（0~1，实际长度 = rootSpread * length）
  depth: number;         // 生长深度比例（0~1，从哪个深度开始）
  thickness: number;     // 粗细（0~1）
  subBranches: number;   // 细根数量
  createdAt: number;     // 创建进度（当时的 growthProgress）
}

/**
 * 植物实例数据 - 每棵植物独一无二
 */
export interface PlantData {
  id: string;
  type: PlantType;
  plantedAt: number;              // 播种时间戳
  
  // 健康状态
  healthState: HealthState;
  healthValue: number;            // 0~100
  
  // 成长进度
  growthProgress: number;         // 0~1
  currentStageId: string;         // 当前阶段 ID
  
  // 物理特征 - 让每棵植物独一无二
  height: number;                 // 高度 cm
  leafCount: number;              // 叶片数量
  rootDepth: number;              // 根系深度 cm
  rootSpread: number;             // 根系宽度 cm
  rootStructure: RootBranch[];    // 根系结构（持久化）
  stemWidth: number;              // 茎秆粗度 mm
  tiltAngle: number;              // 倾斜角度（度），0=笔直
  tiltDirection: number;          // 倾斜方向（0-360度，0=北，90=东）
  
  // 颜色/外观（0~1，影响渲染）
  leafColor: number;              // 叶色深浅（0=嫩绿，1=深绿）
  wiltLevel: number;              // 萎蔫程度（0=健康，1=完全枯萎）
  
  // 养护记录
  lastWateredAt: number;
  harvestCount: number;
  totalWaterReceived: number;     // 累计浇水量 ml
  totalSunlightHours: number;     // 累计日照时长
  totalRainfallReceived: number;  // 累计雨水量 mm
  totalWindExposure: number;      // 累计风吹时长
  
  // 经历过的极端天气（影响外观和特性）
  maxTempSeen: number;            // 经历过的最高温
  minTempSeen: number;            // 经历过的最低温
  maxWindSeen: number;            // 经历过的最大风速
  daysInShelter: number;          // 在遮挡下的天数
  
  // 环境胁迫
  stressDays: Record<string, number>;  // 各类胁迫累计天数
  stressHistory: string[];        // 胁迫事件历史（如 "2026-03-06 热害"）
  vernalizationDays: number;      // 春化累计天数
  canBloom: boolean;              // 是否可以开花
  
  // 游戏模式
  hardMode: boolean;              // 困难模式（无提示）
  
  // 成长日记 - 记录每个里程碑
  milestones: Milestone[];
}

/**
 * 植物配置（生长条件）
 */
export interface PlantConfig {
  type: PlantType;
  name: string;
  emoji: string;
  difficulty: number;             // 1-5
  
  // 成长阶段
  stages: StageConfig[];
  maxHeight: number;              // 最大高度 cm
  
  // 温度
  tempMin: number;                // 适宜最低温
  tempMax: number;                // 适宜最高温
  tempHeatDamage: number;         // 热害温度
  tempColdDamage: number;         // 冻害温度
  tempLethalHigh: number;         // 高温致死
  tempLethalLow: number;          // 低温致死
  
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
  
  // 特殊需求
  needsVernalization?: boolean;   // 是否需要春化（樱花）
  vernalizationDays?: number;     // 春化需要的低温天数
  isAnnual?: boolean;             // 是否一年生（收获后死亡）
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
    maxHeight: 15,
    stages: [
      { id: 'seed', name: '种子', emoji: '🌰', progress: 0, description: '一粒小小的种子' },
      { id: 'sprout', name: '发芽', emoji: '🌱', progress: 0.05, description: '破土而出' },
      { id: 'leaf', name: '展叶', emoji: '🌿', progress: 0.15, description: '长出第一片叶子' },
      { id: 'clump', name: '成丛', emoji: '🍀', progress: 0.40, description: '叶片渐渐增多' },
      { id: 'bloom', name: '开花', emoji: '🍀', progress: 0.70, description: '小白花悄然绽放' },
      { id: 'lucky', name: '四叶', emoji: '☘️', progress: 1.0, description: '也许会遇到四叶草？' },
    ],
    tempMin: 10,
    tempMax: 25,
    tempHeatDamage: 30,
    tempColdDamage: -5,
    tempLethalHigh: 45,
    tempLethalLow: -20,
    moistureMin: 20,
    moistureMax: 70,
    moistureOptimal: 45,
    sunlightMin: 0.2,
    growthDays: 7,
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
    maxHeight: 200,
    stages: [
      { id: 'seed', name: '种子', emoji: '🌰', progress: 0, description: '葵花籽静静躺着' },
      { id: 'sprout', name: '破土', emoji: '🌱', progress: 0.03, description: '小芽钻出泥土' },
      { id: 'seedling', name: '幼苗', emoji: '🌿', progress: 0.08, description: '两片子叶舒展开' },
      { id: 'stem', name: '抽茎', emoji: '🌿', progress: 0.20, description: '茎秆开始长高' },
      { id: 'bud', name: '花苞', emoji: '🌻', progress: 0.50, description: '顶端鼓起花苞' },
      { id: 'bloom', name: '盛开', emoji: '🌻', progress: 0.70, description: '金黄花盘向阳开放' },
      { id: 'seed_head', name: '结籽', emoji: '🌻', progress: 1.0, description: '花盘里结满葵花籽' },
    ],
    tempMin: 18,
    tempMax: 30,
    tempHeatDamage: 35,
    tempColdDamage: 10,
    tempLethalHigh: 45,
    tempLethalLow: -5,
    moistureMin: 30,
    moistureMax: 60,
    moistureOptimal: 45,
    sunlightMin: 0.6,
    growthDays: 30,
    lifespan: 120,  // 一年生
    droughtTolerance: 0.5,
    waterlogTolerance: 0.4,
    heatTolerance: 0.7,
    coldTolerance: 0.2,
    isAnnual: true,
  },
  
  [PlantType.STRAWBERRY]: {
    type: PlantType.STRAWBERRY,
    name: '草莓',
    emoji: '🍓',
    difficulty: 4,
    maxHeight: 30,
    stages: [
      { id: 'seed', name: '种子', emoji: '🌰', progress: 0, description: '细小的草莓种子' },
      { id: 'sprout', name: '发芽', emoji: '🌱', progress: 0.03, description: '嫩芽探出头' },
      { id: 'leaf', name: '展叶', emoji: '🌿', progress: 0.10, description: '锯齿状叶片展开' },
      { id: 'runner', name: '匍匐茎', emoji: '🌿', progress: 0.25, description: '长出匍匐茎' },
      { id: 'bloom', name: '开花', emoji: '🌸', progress: 0.45, description: '小白花朵朵开放' },
      { id: 'green', name: '青果', emoji: '🫛', progress: 0.65, description: '绿色小果实长出' },
      { id: 'ripe', name: '红果', emoji: '🍓', progress: 1.0, description: '草莓红透了！' },
    ],
    tempMin: 15,
    tempMax: 25,
    tempHeatDamage: 28,
    tempColdDamage: -5,
    tempLethalHigh: 38,
    tempLethalLow: -15,
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
    maxHeight: 500,
    stages: [
      { id: 'seed', name: '种子', emoji: '🌰', progress: 0, description: '樱桃核静待发芽' },
      { id: 'sprout', name: '发芽', emoji: '🌱', progress: 0.02, description: '小苗破壳而出' },
      { id: 'seedling', name: '幼苗', emoji: '🌿', progress: 0.05, description: '纤细的小苗' },
      { id: 'woody', name: '木质化', emoji: '🪵', progress: 0.15, description: '茎秆开始木质化' },
      { id: 'branch', name: '枝繁', emoji: '🌳', progress: 0.35, description: '枝条渐渐丰满' },
      { id: 'bud', name: '花苞', emoji: '🌳', progress: 0.60, description: '枝头结满花苞', condition: 'vernalization' },
      { id: 'bloom', name: '盛开', emoji: '🌸', progress: 0.80, description: '满树樱花绚烂绽放' },
      { id: 'fall', name: '落樱', emoji: '🌸', progress: 1.0, description: '花瓣如雪飘落' },
    ],
    tempMin: 15,
    tempMax: 25,
    tempHeatDamage: 35,
    tempColdDamage: -15,
    tempLethalHigh: 45,
    tempLethalLow: -25,
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
    needsVernalization: true,
    vernalizationDays: 30,
  },
};
