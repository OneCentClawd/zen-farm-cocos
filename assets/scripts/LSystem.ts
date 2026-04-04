/**
 * L-System（林德迈耶系统）植物生成引擎
 * 
 * 用简单规则生成复杂的植物形态
 * 支持：茎、根、枝、叶的自然生长
 */

import { Graphics, Color, Vec2 } from 'cc';

/**
 * L-System 规则
 */
export interface LSystemRule {
  symbol: string;           // 要替换的符号
  replacement: string;      // 替换成什么
  probability?: number;     // 概率（0~1），用于随机变异
}

/**
 * L-System 配置
 */
export interface LSystemConfig {
  axiom: string;            // 初始字符串（种子）
  rules: LSystemRule[];     // 规则集
  angle: number;            // 转向角度（度）
  lengthFactor: number;     // 每次迭代长度缩减比例
  widthFactor: number;      // 每次迭代宽度缩减比例
  initialLength: number;    // 初始线段长度
  initialWidth: number;     // 初始线段宽度
  lengthVariance?: number;  // 长度随机变化范围（0~1）
  angleVariance?: number;   // 角度随机变化范围（0~1）
}

/**
 * 海龟状态（用于绘制）
 */
interface TurtleState {
  x: number;
  y: number;
  angle: number;      // 当前朝向（度），0=向上，90=向右
  length: number;     // 当前线段长度
  width: number;      // 当前线段宽度
  depth: number;      // 分支深度
}

/**
 * 绘制上下文
 */
interface DrawContext {
  g: Graphics;
  color: Color;
  seed: number;       // 随机种子（保证同一植物形态一致）
}

/**
 * L-System 生成器
 */
export class LSystem {
  private config: LSystemConfig;
  private currentString: string = '';
  private iterations: number = 0;
  
  constructor(config: LSystemConfig) {
    this.config = config;
    this.currentString = config.axiom;
  }
  
  /**
   * 迭代生成
   * @param n 迭代次数
   * @param seed 随机种子（用于概率规则）
   */
  generate(n: number, seed: number = 0): string {
    this.currentString = this.config.axiom;
    this.iterations = n;
    
    for (let i = 0; i < n; i++) {
      this.currentString = this.iterate(this.currentString, seed + i * 1000);
    }
    
    return this.currentString;
  }
  
  /**
   * 单次迭代
   */
  private iterate(str: string, seed: number): string {
    let result = '';
    let seedIndex = 0;
    
    for (const char of str) {
      let replaced = false;
      
      for (const rule of this.config.rules) {
        if (rule.symbol === char) {
          // 概率规则
          if (rule.probability !== undefined && rule.probability < 1) {
            const rand = this.seededRandom(seed + seedIndex++);
            if (rand > rule.probability) {
              continue;  // 不应用这条规则
            }
          }
          result += rule.replacement;
          replaced = true;
          break;
        }
      }
      
      if (!replaced) {
        result += char;
      }
    }
    
    return result;
  }
  
  /**
   * 获取当前字符串
   */
  getString(): string {
    return this.currentString;
  }
  
  /**
   * 设置字符串（从存档恢复）
   */
  setString(str: string) {
    this.currentString = str;
  }
  
  /**
   * 获取迭代次数
   */
  getIterations(): number {
    return this.iterations;
  }
  
  /**
   * 渲染到 Graphics
   */
  render(ctx: DrawContext, startX: number = 0, startY: number = 0, startAngle: number = 90) {
    const { g, color, seed } = ctx;
    const stack: TurtleState[] = [];
    
    let state: TurtleState = {
      x: startX,
      y: startY,
      angle: startAngle,  // 90 = 向上
      length: this.config.initialLength,
      width: this.config.initialWidth,
      depth: 0
    };
    
    let seedIndex = 0;
    
    for (let i = 0; i < this.currentString.length; i++) {
      const char = this.currentString[i];
      
      switch (char) {
        case 'F':  // 前进并画线
        case 'G':  // 前进并画线（另一种符号）
          this.drawSegment(g, state, color, seed + seedIndex++);
          break;
          
        case 'f':  // 前进不画线
          this.moveForward(state);
          break;
          
        case '+':  // 右转
          state.angle -= this.getAngle(seed + seedIndex++);
          break;
          
        case '-':  // 左转
          state.angle += this.getAngle(seed + seedIndex++);
          break;
          
        case '[':  // 保存状态（开始分支）
          stack.push({ ...state });
          state.depth++;
          state.length *= this.config.lengthFactor;
          state.width *= this.config.widthFactor;
          break;
          
        case ']':  // 恢复状态（结束分支）
          if (stack.length > 0) {
            state = stack.pop()!;
          }
          break;
          
        case '!':  // 减少宽度
          state.width *= this.config.widthFactor;
          break;
          
        case '@':  // 减少长度
          state.length *= this.config.lengthFactor;
          break;
          
        case 'L':  // 画叶子（自定义扩展）
        case 'l':
          // 叶子由外部处理
          break;
          
        case 'W':  // 画花（自定义扩展）
        case 'w':
          // 花由外部处理
          break;
      }
    }
  }
  
  /**
   * 画一段线并前进
   */
  private drawSegment(g: Graphics, state: TurtleState, color: Color, seed: number) {
    const length = this.getLength(state.length, seed);
    const angleRad = state.angle * Math.PI / 180;
    
    const endX = state.x + Math.cos(angleRad) * length;
    const endY = state.y + Math.sin(angleRad) * length;
    
    g.strokeColor = color;
    g.lineWidth = Math.max(1, state.width);
    g.moveTo(state.x, state.y);
    g.lineTo(endX, endY);
    g.stroke();
    
    state.x = endX;
    state.y = endY;
  }
  
  /**
   * 只移动不画线
   */
  private moveForward(state: TurtleState) {
    const angleRad = state.angle * Math.PI / 180;
    state.x += Math.cos(angleRad) * state.length;
    state.y += Math.sin(angleRad) * state.length;
  }
  
  /**
   * 获取长度（带随机变化）
   */
  private getLength(baseLength: number, seed: number): number {
    if (!this.config.lengthVariance) return baseLength;
    const variance = (this.seededRandom(seed) - 0.5) * 2 * this.config.lengthVariance;
    return baseLength * (1 + variance);
  }
  
  /**
   * 获取角度（带随机变化）
   */
  private getAngle(seed: number): number {
    let angle = this.config.angle;
    if (this.config.angleVariance) {
      const variance = (this.seededRandom(seed) - 0.5) * 2 * this.config.angleVariance;
      angle *= (1 + variance);
    }
    return angle;
  }
  
  /**
   * 确定性伪随机
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
}

// ==================== 预设配置 ====================

/**
 * 根系 L-System 配置
 */
export const ROOT_LSYSTEM: LSystemConfig = {
  axiom: 'F',
  rules: [
    { symbol: 'F', replacement: 'F[+F]F[-F]F' },
  ],
  angle: 45,              // 增大角度，让根系更横向扩散
  lengthFactor: 0.6,      // 每次迭代长度缩短更多，控制深度
  widthFactor: 0.8,
  initialLength: 15,      // 初始长度减小
  initialWidth: 3,
  lengthVariance: 0.2,
  angleVariance: 0.3,
};

/**
 * 幸运草茎 L-System 配置
 */
export const CLOVER_STEM_LSYSTEM: LSystemConfig = {
  axiom: 'A',
  rules: [
    { symbol: 'A', replacement: 'F[+L][-L]FA' },
    { symbol: 'F', replacement: 'FF' },
  ],
  angle: 30,
  lengthFactor: 0.85,
  widthFactor: 0.9,
  initialLength: 15,
  initialWidth: 2,
  lengthVariance: 0.15,
  angleVariance: 0.2,
};

/**
 * 向日葵茎 L-System 配置
 */
export const SUNFLOWER_STEM_LSYSTEM: LSystemConfig = {
  axiom: 'A',
  rules: [
    { symbol: 'A', replacement: 'F[+L]F[-L]A' },
    { symbol: 'F', replacement: 'FF' },
  ],
  angle: 35,
  lengthFactor: 0.9,
  widthFactor: 0.95,
  initialLength: 25,
  initialWidth: 4,
  lengthVariance: 0.1,
  angleVariance: 0.15,
};

/**
 * 草莓匍匐茎 L-System 配置
 */
export const STRAWBERRY_RUNNER_LSYSTEM: LSystemConfig = {
  axiom: 'A',
  rules: [
    { symbol: 'A', replacement: 'F[-L][+L]FA' },
  ],
  angle: 45,
  lengthFactor: 0.8,
  widthFactor: 0.85,
  initialLength: 20,
  initialWidth: 2,
  lengthVariance: 0.2,
  angleVariance: 0.25,
};

/**
 * 樱花树枝 L-System 配置
 */
export const SAKURA_BRANCH_LSYSTEM: LSystemConfig = {
  axiom: 'A',
  rules: [
    { symbol: 'A', replacement: 'F[+A][-A]FA' },
    { symbol: 'F', replacement: 'FF' },
  ],
  angle: 22,
  lengthFactor: 0.75,
  widthFactor: 0.7,
  initialLength: 30,
  initialWidth: 5,
  lengthVariance: 0.25,
  angleVariance: 0.3,
};

/**
 * 根据植物类型和成长阶段获取 L-System 配置
 */
export function getLSystemConfig(plantType: string, part: 'root' | 'stem' | 'branch'): LSystemConfig {
  if (part === 'root') {
    return { ...ROOT_LSYSTEM };
  }
  
  switch (plantType) {
    case 'clover':
      return { ...CLOVER_STEM_LSYSTEM };
    case 'sunflower':
      return { ...SUNFLOWER_STEM_LSYSTEM };
    case 'strawberry':
      return { ...STRAWBERRY_RUNNER_LSYSTEM };
    case 'sakura':
      return { ...SAKURA_BRANCH_LSYSTEM };
    default:
      return { ...CLOVER_STEM_LSYSTEM };
  }
}

/**
 * 根据成长进度计算迭代次数
 */
export function getIterationsFromProgress(progress: number, maxIterations: number = 5): number {
  return Math.floor(progress * maxIterations);
}
