/**
 * L-System 植物渲染器
 * 
 * 用 L-System 生成自然的植物形态
 * 替代原来的手绘方案
 */

import { _decorator, Component, Graphics, Color, UITransform } from 'cc';
import { PlantData, getCurrentStage } from './Plant';
import { PlantType } from './PlantTypes';
import { 
  LSystem, 
  LSystemConfig,
  getLSystemConfig, 
  getIterationsFromProgress,
  ROOT_LSYSTEM,
  CLOVER_STEM_LSYSTEM,
  SUNFLOWER_STEM_LSYSTEM,
  STRAWBERRY_RUNNER_LSYSTEM,
  SAKURA_BRANCH_LSYSTEM
} from './LSystem';

const { ccclass, property } = _decorator;

/**
 * 海龟状态（扩展版，支持更多信息）
 */
interface TurtleState {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  depth: number;
  color: Color;
}

/**
 * 节点信息（用于在特定位置画叶子/花）
 */
interface NodeInfo {
  x: number;
  y: number;
  angle: number;
  depth: number;
  type: 'leaf' | 'flower' | 'fruit';
}

@ccclass('LSystemPlantRenderer')
export class LSystemPlantRenderer extends Component {
  
  private graphics: Graphics | null = null;
  
  // 当前植物的唯一种子
  private plantSeed: number = 0;
  
  // 动画时间
  private animTime: number = 0;
  
  // 收集的节点（用于画叶子/花）
  private nodes: NodeInfo[] = [];
  
  // 颜色配置
  private stemColor = new Color(76, 130, 60);
  private rootColor = new Color(180, 140, 100);
  private leafColor = new Color(60, 160, 60);
  private flowerColor = new Color(255, 255, 255);
  private fruitColor = new Color(220, 60, 60);
  
  onLoad() {
    this.graphics = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
    
    if (!this.node.getComponent(UITransform)) {
      const transform = this.node.addComponent(UITransform);
      transform.setContentSize(400, 500);
    }
  }
  
  /**
   * 渲染植物
   */
  render(plant: PlantData, deltaTime: number = 0) {
    if (!this.graphics) return;
    
    this.animTime += deltaTime;
    this.plantSeed = this.hashString(plant.id);
    this.nodes = [];
    
    this.graphics.clear();
    
    // 更新颜色
    this.updateColors(plant);
    
    const progress = plant.growthProgress;
    const isDead = plant.healthState === 3;
    const wiltLevel = plant.wiltLevel || 0;
    
    if (isDead) {
      this.renderDead(plant);
    } else if (progress < 0.05) {
      this.renderSeed(plant);
    } else if (progress < 0.15) {
      this.renderSprout(plant);
    } else {
      this.renderFullPlant(plant);
    }
  }
  
  /**
   * 更新颜色
   */
  private updateColors(plant: PlantData) {
    const wiltLevel = plant.wiltLevel || 0;
    const isDead = plant.healthState === 3;
    
    if (isDead) {
      this.stemColor = new Color(100, 80, 50);
      this.leafColor = new Color(120, 100, 60);
      this.rootColor = new Color(120, 90, 60);
    } else if (wiltLevel > 0.5) {
      const wf = (wiltLevel - 0.5) * 2;
      this.stemColor = new Color(76 + Math.round(40 * wf), 130 - Math.round(50 * wf), 60);
      this.leafColor = new Color(60 + Math.round(60 * wf), 160 - Math.round(80 * wf), 60);
    } else {
      this.stemColor = new Color(76, 130, 60);
      this.leafColor = new Color(60, 160, 60);
      this.rootColor = new Color(180, 140, 100);
    }
    
    // 根据植物类型调整颜色
    switch (plant.type) {
      case PlantType.SUNFLOWER:
        this.flowerColor = new Color(255, 200, 50);
        break;
      case PlantType.STRAWBERRY:
        this.flowerColor = new Color(255, 255, 255);
        this.fruitColor = new Color(220, 40, 40);
        break;
      case PlantType.SAKURA:
        this.flowerColor = new Color(255, 200, 200);
        break;
      case PlantType.CLOVER:
        // 幸运草花色随机：白色或粉色
        const cloverRand = this.seededRandom(this.plantSeed + 999);
        if (cloverRand > 0.5) {
          this.flowerColor = new Color(255, 255, 255);  // 白色
        } else {
          this.flowerColor = new Color(255, 180, 200);  // 粉色
        }
        break;
      default:
        this.flowerColor = new Color(255, 255, 255);
    }
  }
  
  /**
   * 渲染种子
   */
  private renderSeed(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    const seedY = -10;
    
    // 种子
    g.fillColor = new Color(139, 90, 43);
    g.ellipse(0, seedY, 8, 5);
    g.fill();
    
    // 胚根萌发
    if (progress > 0.02) {
      const rootProgress = (progress - 0.02) / 0.03;
      const rootLength = rootProgress * 15;
      
      g.strokeColor = this.rootColor;
      g.lineWidth = 1.5;
      g.moveTo(0, seedY - 5);
      g.lineTo(0, seedY - 5 - rootLength);
      g.stroke();
    }
  }
  
  /**
   * 渲染发芽阶段
   */
  private renderSprout(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    const sproutProgress = (progress - 0.05) / 0.10;
    
    // 简单根系
    this.renderSimpleRoots(g, sproutProgress * 0.3);
    
    // 茎
    const stemHeight = sproutProgress * 30;
    g.strokeColor = this.stemColor;
    g.lineWidth = 2;
    g.moveTo(0, 0);
    g.lineTo(0, stemHeight);
    g.stroke();
    
    // 子叶
    if (sproutProgress > 0.3) {
      const leafSize = 8 + sproutProgress * 6;
      g.fillColor = this.leafColor;
      
      // 左子叶
      g.ellipse(-leafSize * 0.8, stemHeight, leafSize * 0.6, leafSize * 0.4);
      g.fill();
      
      // 右子叶
      g.ellipse(leafSize * 0.8, stemHeight, leafSize * 0.6, leafSize * 0.4);
      g.fill();
    }
  }
  
  /**
   * 渲染完整植物（使用 L-System）
   */
  private renderFullPlant(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    
    // 1. 画根系（L-System）
    this.renderRoots(plant);
    
    // 2. 画茎/枝（L-System）
    this.renderStem(plant);
    
    // 3. 画叶子（在收集的节点位置）
    this.renderLeaves(plant);
    
    // 4. 画花/果（根据阶段）
    if (progress >= 0.6) {
      this.renderFlowers(plant);
    }
    if (progress >= 0.9) {
      this.renderFruits(plant);
    }
  }
  
  /**
   * 渲染根系（L-System）
   */
  private renderRoots(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    
    // 根系配置 - 加粗
    const config: LSystemConfig = {
      ...ROOT_LSYSTEM,
      initialLength: 10 + progress * 15,
      initialWidth: 4 + progress * 4,  // 加粗：4~8
    };
    
    const lsystem = new LSystem(config);
    const iterations = Math.min(4, Math.floor(progress * 5));
    lsystem.generate(iterations, this.plantSeed);
    
    // 渲染（向下生长，所以起始角度是 -90）
    this.renderLSystem(g, lsystem, 0, 0, -90, this.rootColor);
  }
  
  /**
   * 渲染茎（L-System）
   */
  private renderStem(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    
    // 根据植物类型选择配置
    let config: LSystemConfig;
    let maxIterations: number;
    
    switch (plant.type) {
      case PlantType.SUNFLOWER:
        config = { ...SUNFLOWER_STEM_LSYSTEM };
        config.initialLength = 20 + progress * 40;
        config.initialWidth = 3 + progress * 3;
        maxIterations = 4;
        break;
        
      case PlantType.STRAWBERRY:
        config = { ...STRAWBERRY_RUNNER_LSYSTEM };
        config.initialLength = 15 + progress * 20;
        config.initialWidth = 2 + progress * 1;
        maxIterations = 3;
        break;
        
      case PlantType.SAKURA:
        config = { ...SAKURA_BRANCH_LSYSTEM };
        config.initialLength = 25 + progress * 35;
        config.initialWidth = 4 + progress * 4;
        maxIterations = 5;
        break;
        
      case PlantType.CLOVER:
      default:
        config = { ...CLOVER_STEM_LSYSTEM };
        config.initialLength = 15 + progress * 30;  // 高度恢复：15~45
        config.initialWidth = 6 + progress * 6;     // 茎更粗：6~12
        config.angle = 25;                          // 角度小一点，更自然
        maxIterations = 3;
        break;
    }
    
    const lsystem = new LSystem(config);
    const iterations = Math.min(maxIterations, Math.floor(progress * maxIterations * 1.2));
    lsystem.generate(iterations, this.plantSeed + 1000);
    
    // 渲染并收集节点
    this.renderLSystemWithNodes(g, lsystem, 0, 0, 90, this.stemColor);
  }
  
  /**
   * 渲染 L-System（基础版）
   */
  private renderLSystem(g: Graphics, lsystem: LSystem, startX: number, startY: number, startAngle: number, color: Color) {
    const str = lsystem.getString();
    const config = (lsystem as any).config as LSystemConfig;
    const stack: TurtleState[] = [];
    
    let state: TurtleState = {
      x: startX,
      y: startY,
      angle: startAngle,
      length: config.initialLength,
      width: config.initialWidth,
      depth: 0,
      color: color
    };
    
    let seedIndex = 0;
    
    for (const char of str) {
      switch (char) {
        case 'F':
        case 'G':
          this.drawSegment(g, state, seedIndex++);
          break;
          
        case 'f':
          this.moveForward(state);
          break;
          
        case '+':
          state.angle -= this.getAngleWithVariance(config.angle, config.angleVariance || 0, seedIndex++);
          break;
          
        case '-':
          state.angle += this.getAngleWithVariance(config.angle, config.angleVariance || 0, seedIndex++);
          break;
          
        case '[':
          stack.push({ ...state });
          state.depth++;
          state.length *= config.lengthFactor;
          state.width *= config.widthFactor;
          break;
          
        case ']':
          if (stack.length > 0) {
            state = stack.pop()!;
          }
          break;
      }
    }
  }
  
  /**
   * 渲染 L-System 并收集节点位置（用于画叶子/花）
   */
  private renderLSystemWithNodes(g: Graphics, lsystem: LSystem, startX: number, startY: number, startAngle: number, color: Color) {
    const str = lsystem.getString();
    const config = (lsystem as any).config as LSystemConfig;
    const stack: TurtleState[] = [];
    
    let state: TurtleState = {
      x: startX,
      y: startY,
      angle: startAngle,
      length: config.initialLength,
      width: config.initialWidth,
      depth: 0,
      color: color
    };
    
    let seedIndex = 0;
    
    for (const char of str) {
      switch (char) {
        case 'F':
        case 'G':
        case 'A':
          this.drawSegment(g, state, seedIndex++);
          break;
          
        case 'f':
          this.moveForward(state);
          break;
          
        case '+':
          state.angle -= this.getAngleWithVariance(config.angle, config.angleVariance || 0, seedIndex++);
          break;
          
        case '-':
          state.angle += this.getAngleWithVariance(config.angle, config.angleVariance || 0, seedIndex++);
          break;
          
        case '[':
          stack.push({ ...state });
          state.depth++;
          state.length *= config.lengthFactor;
          state.width *= config.widthFactor;
          break;
          
        case ']':
          // 分支结束时收集节点（画叶子的位置）
          this.nodes.push({
            x: state.x,
            y: state.y,
            angle: state.angle,
            depth: state.depth,
            type: 'leaf'
          });
          
          if (stack.length > 0) {
            state = stack.pop()!;
          }
          break;
          
        case 'L':
        case 'l':
          // 显式叶子标记
          this.nodes.push({
            x: state.x,
            y: state.y,
            angle: state.angle,
            depth: state.depth,
            type: 'leaf'
          });
          break;
          
        case 'W':
        case 'w':
          // 显式花朵标记
          this.nodes.push({
            x: state.x,
            y: state.y,
            angle: state.angle,
            depth: state.depth,
            type: 'flower'
          });
          break;
      }
    }
    
    // 顶端也收集一个节点
    this.nodes.push({
      x: state.x,
      y: state.y,
      angle: state.angle,
      depth: state.depth,
      type: 'flower'
    });
  }
  
  /**
   * 画一段茎/根
   */
  private drawSegment(g: Graphics, state: TurtleState, seedIndex: number) {
    const variance = this.seededRandom(this.plantSeed + seedIndex * 17);
    const length = state.length * (0.9 + variance * 0.2);
    const angleRad = state.angle * Math.PI / 180;
    
    const endX = state.x + Math.cos(angleRad) * length;
    const endY = state.y + Math.sin(angleRad) * length;
    
    // 使用贝塞尔曲线让茎更自然（S 型）
    const bendFactor = (this.seededRandom(this.plantSeed + seedIndex * 31) - 0.5) * 0.3;
    const perpAngle = angleRad + Math.PI / 2;
    const ctrlX = (state.x + endX) / 2 + Math.cos(perpAngle) * length * bendFactor;
    const ctrlY = (state.y + endY) / 2 + Math.sin(perpAngle) * length * bendFactor;
    
    g.strokeColor = state.color;
    g.lineWidth = Math.max(1, state.width);
    g.moveTo(state.x, state.y);
    g.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
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
   * 渲染叶子
   */
  private renderLeaves(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    const wiltLevel = plant.wiltLevel || 0;
    
    // 幸运草特殊处理：叶子画在茎上、花的下方
    if (plant.type === PlantType.CLOVER) {
      const flowerNodes = this.nodes.filter(n => n.type === 'flower');
      if (flowerNodes.length > 0) {
        // 找到最高点
        const topNode = flowerNodes.reduce((a, b) => a.y > b.y ? a : b);
        const size = (12 + progress * 15);
        const droop = wiltLevel * 15;
        // 叶子画在茎顶端下方一点（不被花遮挡）
        const leafY = topNode.y - 20 - droop;  // 比茎顶端低 20
        this.drawCloverTop(g, topNode.x, leafY, size * 18);
      }
      return;
    }
    
    // 其他植物：叶子画在分支位置
    const maxLeaves = this.getMaxLeaves(plant.type);
    const leafNodes = this.nodes.filter(n => n.type === 'leaf').slice(0, maxLeaves);
    
    for (let i = 0; i < leafNodes.length; i++) {
      const node = leafNodes[i];
      const size = (12 + progress * 15) * (1 - node.depth * 0.15);
      const droop = wiltLevel * 15;
      
      this.drawLeaf(g, node.x, node.y - droop, size, node.angle, plant.type);
    }
  }
  
  /**
   * 画幸运草顶端（三片或四片叶子围成一圈，连在茎上）
   */
  private drawCloverTop(g: Graphics, x: number, y: number, size: number) {
    // 随机决定是三叶草还是四叶草
    const isFourLeaf = this.seededRandom(this.plantSeed + 888) > 0.9;  // 10% 概率四叶草
    const leafCount = isFourLeaf ? 4 : 3;
    const leafSize = size * 0.9;  // 叶子放大，更像真实幸运草
    const stemLength = 55;  // 叶柄稍长，防止叶子重叠
    
    for (let i = 0; i < leafCount; i++) {
      const angle = (i / leafCount) * Math.PI * 2 - Math.PI / 2;  // 从上方开始
      
      // 叶柄终点（叶子位置）
      const leafX = x + Math.cos(angle) * stemLength;
      const leafY = y + Math.sin(angle) * stemLength;
      
      // 画叶柄（从茎顶端到叶子）
      g.strokeColor = this.stemColor;
      g.lineWidth = 2;
      g.moveTo(x, y);
      g.lineTo(leafX, leafY);
      g.stroke();
      
      // 画叶子（凹陷朝外，尖端指向中心，旋转角度 = angle - 90°）
      g.fillColor = this.leafColor;
      this.drawHeartLeaf(g, leafX, leafY, leafSize, angle - Math.PI / 2);
    }
  }
  
  /**
   * 画单片叶子
   */
  private drawLeaf(g: Graphics, x: number, y: number, size: number, angle: number, plantType: PlantType) {
    g.fillColor = this.leafColor;
    
    switch (plantType) {
      case PlantType.CLOVER:
        // 心形叶（三叶草）- 放大 18 倍
        this.drawHeartLeaf(g, x, y, size * 18);
        break;
        
      case PlantType.SUNFLOWER:
        // 大心形叶
        this.drawHeartLeaf(g, x, y, size * 1.3);
        break;
        
      case PlantType.STRAWBERRY:
        // 锯齿状三出复叶
        this.drawTrifoliateLeaf(g, x, y, size);
        break;
        
      case PlantType.SAKURA:
        // 椭圆形叶
        const angleRad = angle * Math.PI / 180;
        g.ellipse(x, y, size * 0.4, size * 0.6);
        g.fill();
        break;
        
      default:
        g.ellipse(x, y, size * 0.5, size * 0.3);
        g.fill();
    }
  }
  
  /**
   * 画心形叶（带叶脉和3D效果），支持旋转
   */
  private drawHeartLeaf(g: Graphics, x: number, y: number, size: number, rotation: number = 0) {
    // 保存当前变换
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    
    // 辅助函数：旋转坐标
    const rotate = (px: number, py: number) => {
      const dx = px - x;
      const dy = py - y;
      return {
        x: x + dx * cos - dy * sin,
        y: y + dx * sin + dy * cos
      };
    };
    
    // 叶片关键点（相对于中心）
    const p0 = rotate(x, y + size * 0.3);  // 底部尖端
    const c1 = rotate(x - size * 0.5, y + size * 0.6);
    const c2 = rotate(x - size * 0.5, y - size * 0.2);
    const p1 = rotate(x, y - size * 0.1);  // 顶部凹陷
    const c3 = rotate(x + size * 0.5, y - size * 0.2);
    const c4 = rotate(x + size * 0.5, y + size * 0.6);
    
    // 3D效果：先画阴影（偏移 + 深色）
    const shadowOffset = size * 0.05;
    g.fillColor = new Color(30, 80, 30, 180);  // 深绿色阴影
    g.moveTo(p0.x + shadowOffset, p0.y - shadowOffset);
    g.bezierCurveTo(c1.x + shadowOffset, c1.y - shadowOffset, c2.x + shadowOffset, c2.y - shadowOffset, p1.x + shadowOffset, p1.y - shadowOffset);
    g.bezierCurveTo(c3.x + shadowOffset, c3.y - shadowOffset, c4.x + shadowOffset, c4.y - shadowOffset, p0.x + shadowOffset, p0.y - shadowOffset);
    g.fill();
    
    // 叶片主体填充
    g.fillColor = this.leafColor;
    g.moveTo(p0.x, p0.y);
    g.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
    g.bezierCurveTo(c3.x, c3.y, c4.x, c4.y, p0.x, p0.y);
    g.fill();
    
    // 3D效果：高光（左上角偏亮）
    const highlightColor = new Color(120, 200, 120, 100);
    g.fillColor = highlightColor;
    const h0 = rotate(x - size * 0.15, y + size * 0.1);
    const hc1 = rotate(x - size * 0.35, y + size * 0.3);
    const hc2 = rotate(x - size * 0.3, y - size * 0.05);
    const h1 = rotate(x - size * 0.05, y);
    g.moveTo(h0.x, h0.y);
    g.bezierCurveTo(hc1.x, hc1.y, hc2.x, hc2.y, h1.x, h1.y);
    g.bezierCurveTo(h1.x, h1.y + size * 0.05, h0.x, h0.y + size * 0.05, h0.x, h0.y);
    g.fill();
    
    // 叶脉（经络）
    const veinColor = new Color(40, 120, 40);  // 深绿色叶脉
    g.strokeColor = veinColor;
    g.lineWidth = Math.max(1, size * 0.03);
    
    // 主脉
    const v1 = rotate(x, y + size * 0.25);
    const v2 = rotate(x, y - size * 0.05);
    g.moveTo(v1.x, v1.y);
    g.lineTo(v2.x, v2.y);
    g.stroke();
    
    // 侧脉（左边）
    const v3 = rotate(x, y + size * 0.15);
    const v4 = rotate(x - size * 0.25, y + size * 0.25);
    g.moveTo(v3.x, v3.y);
    g.lineTo(v4.x, v4.y);
    g.stroke();
    
    const v5 = rotate(x, y + size * 0.05);
    const v6 = rotate(x - size * 0.2, y + size * 0.1);
    g.moveTo(v5.x, v5.y);
    g.lineTo(v6.x, v6.y);
    g.stroke();
    
    // 侧脉（右边）
    const v7 = rotate(x, y + size * 0.15);
    const v8 = rotate(x + size * 0.25, y + size * 0.25);
    g.moveTo(v7.x, v7.y);
    g.lineTo(v8.x, v8.y);
    g.stroke();
    
    const v9 = rotate(x, y + size * 0.05);
    const v10 = rotate(x + size * 0.2, y + size * 0.1);
    g.moveTo(v9.x, v9.y);
    g.lineTo(v10.x, v10.y);
    g.stroke();
  }
  
  /**
   * 画三出复叶（草莓）
   */
  private drawTrifoliateLeaf(g: Graphics, x: number, y: number, size: number) {
    // 中间叶
    g.ellipse(x, y + size * 0.3, size * 0.3, size * 0.4);
    g.fill();
    
    // 左叶
    g.ellipse(x - size * 0.35, y + size * 0.15, size * 0.25, size * 0.35);
    g.fill();
    
    // 右叶
    g.ellipse(x + size * 0.35, y + size * 0.15, size * 0.25, size * 0.35);
    g.fill();
    
    // 叶脉
    const veinColor = new Color(40, 120, 40);
    g.strokeColor = veinColor;
    g.lineWidth = Math.max(1, size * 0.02);
    
    // 中间叶主脉
    g.moveTo(x, y + size * 0.5);
    g.lineTo(x, y + size * 0.15);
    g.stroke();
    
    // 左叶主脉
    g.moveTo(x - size * 0.35, y + size * 0.35);
    g.lineTo(x - size * 0.35, y);
    g.stroke();
    
    // 右叶主脉
    g.moveTo(x + size * 0.35, y + size * 0.35);
    g.lineTo(x + size * 0.35, y);
    g.stroke();
  }
  
  /**
   * 渲染花朵
   */
  private renderFlowers(plant: PlantData) {
    const g = this.graphics!;
    const progress = plant.growthProgress;
    
    // 找到顶端节点画花
    const flowerNodes = this.nodes.filter(n => n.type === 'flower');
    if (flowerNodes.length === 0) return;
    
    // 取最高的节点
    const topNode = flowerNodes.reduce((a, b) => a.y > b.y ? a : b);
    const flowerProgress = Math.min(1, (progress - 0.6) / 0.3);
    const size = 15 + flowerProgress * 20;
    
    // 幸运草特殊处理：从叶子中间伸出花茎，花在最顶端
    if (plant.type === PlantType.CLOVER) {
      const flowerStemHeight = 35;  // 花茎长度
      
      // 画花茎（从叶子中心往上）
      g.strokeColor = this.stemColor;
      g.lineWidth = 3;
      g.moveTo(topNode.x, topNode.y);
      g.lineTo(topNode.x, topNode.y + flowerStemHeight);
      g.stroke();
      
      // 画花（在花茎顶端）
      this.drawFlower(g, topNode.x, topNode.y + flowerStemHeight + size * 2, size, plant.type);
    } else {
      this.drawFlower(g, topNode.x, topNode.y, size, plant.type);
    }
  }
  
  /**
   * 画花
   */
  private drawFlower(g: Graphics, x: number, y: number, size: number, plantType: PlantType) {
    g.fillColor = this.flowerColor;
    
    switch (plantType) {
      case PlantType.SUNFLOWER:
        this.drawSunflowerHead(g, x, y, size);
        break;
        
      case PlantType.SAKURA:
        this.drawSakuraFlower(g, x, y, size);
        break;
        
      case PlantType.STRAWBERRY:
        this.drawSimpleFlower(g, x, y, size, 5);
        break;
        
      case PlantType.CLOVER:
      default:
        this.drawCloverFlower(g, x, y, size * 8);  // 三叶草球状花
        break;
    }
  }
  
  /**
   * 画三叶草球状花（由很多小花组成，围绕中心排列）
   */
  private drawCloverFlower(g: Graphics, x: number, y: number, size: number) {
    const baseColor = this.flowerColor;
    
    // 多层花瓣，从外到内画（这样内层会覆盖外层边缘）
    const layers = [
      { count: 12, radius: size * 0.35, petalSize: size * 0.12 },  // 外层
      { count: 8, radius: size * 0.2, petalSize: size * 0.1 },     // 中层
      { count: 5, radius: size * 0.08, petalSize: size * 0.08 },   // 内层
    ];
    
    for (const layer of layers) {
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2;
        const px = x + Math.cos(angle) * layer.radius;
        const py = y + Math.sin(angle) * layer.radius;
        
        // 阴影
        g.fillColor = new Color(
          Math.max(0, baseColor.r - 40),
          Math.max(0, baseColor.g - 40),
          Math.max(0, baseColor.b - 40),
          180
        );
        g.ellipse(px + 1, py - 1, layer.petalSize, layer.petalSize * 0.7);
        g.fill();
        
        // 小花瓣
        g.fillColor = baseColor;
        g.ellipse(px, py, layer.petalSize, layer.petalSize * 0.7);
        g.fill();
        
        // 小高光
        g.fillColor = new Color(255, 255, 255, 80);
        g.ellipse(px - layer.petalSize * 0.2, py + layer.petalSize * 0.2, layer.petalSize * 0.3, layer.petalSize * 0.2);
        g.fill();
      }
    }
    
    // 中心点
    g.fillColor = new Color(255, 240, 200);
    g.circle(x, y, size * 0.05);
    g.fill();
    
    // 顶部高光
    g.fillColor = new Color(255, 255, 255, 50);
    g.circle(x - size * 0.1, y + size * 0.1, size * 0.15);
    g.fill();
  }
  
  /**
   * 画向日葵花盘
   */
  private drawSunflowerHead(g: Graphics, x: number, y: number, size: number) {
    // 花瓣
    g.fillColor = new Color(255, 200, 50);
    const petalCount = 16;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const px = x + Math.cos(angle) * size * 0.6;
      const py = y + Math.sin(angle) * size * 0.6;
      
      g.ellipse(px, py, size * 0.3, size * 0.15);
      g.fill();
    }
    
    // 花盘
    g.fillColor = new Color(90, 60, 30);
    g.circle(x, y, size * 0.4);
    g.fill();
  }
  
  /**
   * 画樱花
   */
  private drawSakuraFlower(g: Graphics, x: number, y: number, size: number) {
    g.fillColor = new Color(255, 200, 200);
    const petalCount = 5;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * size * 0.3;
      const py = y + Math.sin(angle) * size * 0.3;
      
      g.ellipse(px, py, size * 0.25, size * 0.15);
      g.fill();
    }
    
    // 花心
    g.fillColor = new Color(255, 220, 100);
    g.circle(x, y, size * 0.1);
    g.fill();
  }
  
  /**
   * 画简单花朵（带3D效果，更自然的花瓣）
   */
  private drawSimpleFlower(g: Graphics, x: number, y: number, size: number, petalCount: number) {
    // 获取基础花色
    const baseColor = this.flowerColor;
    
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      // 花瓣从花心向外延伸
      const petalLength = size * 0.5;  // 花瓣更长
      const petalWidth = size * 0.25;   // 花瓣更宽
      const px = x + Math.cos(angle) * petalLength * 0.5;
      const py = y + Math.sin(angle) * petalLength * 0.5;
      
      // 计算花瓣旋转
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      // 3D效果：阴影
      const shadowOffset = size * 0.03;
      g.fillColor = new Color(
        Math.max(0, baseColor.r - 50),
        Math.max(0, baseColor.g - 50),
        Math.max(0, baseColor.b - 50),
        150
      );
      this.drawPetal(g, px + shadowOffset, py - shadowOffset, petalLength, petalWidth, angle);
      
      // 花瓣主体（渐变效果：外边缘稍深）
      g.fillColor = baseColor;
      this.drawPetal(g, px, py, petalLength, petalWidth, angle);
      
      // 3D效果：花瓣内侧高光
      g.fillColor = new Color(255, 255, 255, 60);
      this.drawPetal(g, px - cos * size * 0.05, py - sin * size * 0.05, petalLength * 0.5, petalWidth * 0.5, angle);
    }
    
    // 花心阴影
    g.fillColor = new Color(180, 140, 80);
    g.circle(x + size * 0.02, y - size * 0.02, size * 0.12);
    g.fill();
    
    // 花心
    g.fillColor = new Color(255, 220, 100);
    g.circle(x, y, size * 0.12);
    g.fill();
    
    // 花心纹理（小点点）
    g.fillColor = new Color(220, 180, 60);
    for (let i = 0; i < 5; i++) {
      const dotAngle = (i / 5) * Math.PI * 2;
      const dotX = x + Math.cos(dotAngle) * size * 0.05;
      const dotY = y + Math.sin(dotAngle) * size * 0.05;
      g.circle(dotX, dotY, size * 0.02);
      g.fill();
    }
    
    // 花心高光
    g.fillColor = new Color(255, 255, 200, 180);
    g.circle(x - size * 0.04, y + size * 0.04, size * 0.04);
    g.fill();
  }
  
  /**
   * 画单个花瓣（水滴形）
   */
  private drawPetal(g: Graphics, x: number, y: number, length: number, width: number, angle: number) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // 花瓣尖端
    const tipX = x + cos * length;
    const tipY = y + sin * length;
    
    // 花瓣两侧
    const perpCos = Math.cos(angle + Math.PI / 2);
    const perpSin = Math.sin(angle + Math.PI / 2);
    
    const side1X = x + perpCos * width * 0.5;
    const side1Y = y + perpSin * width * 0.5;
    const side2X = x - perpCos * width * 0.5;
    const side2Y = y - perpSin * width * 0.5;
    
    // 控制点（让花瓣饱满）
    const ctrl1X = x + cos * length * 0.6 + perpCos * width * 0.6;
    const ctrl1Y = y + sin * length * 0.6 + perpSin * width * 0.6;
    const ctrl2X = x + cos * length * 0.6 - perpCos * width * 0.6;
    const ctrl2Y = y + sin * length * 0.6 - perpSin * width * 0.6;
    
    g.moveTo(x, y);
    g.bezierCurveTo(ctrl1X, ctrl1Y, ctrl1X, ctrl1Y, tipX, tipY);
    g.bezierCurveTo(ctrl2X, ctrl2Y, ctrl2X, ctrl2Y, x, y);
    g.fill();
  }

  /**
   * 渲染果实
   */
  private renderFruits(plant: PlantData) {
    const g = this.graphics!;
    
    if (plant.type === PlantType.STRAWBERRY) {
      // 草莓果实
      const fruitNodes = this.nodes.filter(n => n.type === 'leaf').slice(0, 3);
      for (const node of fruitNodes) {
        this.drawStrawberry(g, node.x, node.y - 10, 12);
      }
    }
  }
  
  /**
   * 画草莓
   */
  private drawStrawberry(g: Graphics, x: number, y: number, size: number) {
    g.fillColor = this.fruitColor;
    
    // 果实（倒心形）
    g.moveTo(x, y - size);
    g.bezierCurveTo(
      x - size * 0.6, y - size * 0.5,
      x - size * 0.4, y + size * 0.3,
      x, y + size * 0.4
    );
    g.bezierCurveTo(
      x + size * 0.4, y + size * 0.3,
      x + size * 0.6, y - size * 0.5,
      x, y - size
    );
    g.fill();
    
    // 种子点
    g.fillColor = new Color(255, 220, 100);
    for (let i = 0; i < 5; i++) {
      const sx = x + (this.seededRandom(i * 7) - 0.5) * size * 0.5;
      const sy = y + (this.seededRandom(i * 11) - 0.5) * size * 0.6;
      g.circle(sx, sy, 1);
      g.fill();
    }
  }
  
  /**
   * 渲染简单根系（发芽阶段用）
   */
  private renderSimpleRoots(g: Graphics, progress: number) {
    g.strokeColor = this.rootColor;
    g.lineWidth = 1.5;
    
    const depth = 10 + progress * 30;
    
    // 主根
    g.moveTo(0, 0);
    g.lineTo(0, -depth);
    g.stroke();
    
    // 侧根
    if (progress > 0.3) {
      const sideProgress = (progress - 0.3) / 0.7;
      const sideLen = sideProgress * 15;
      
      g.moveTo(0, -depth * 0.4);
      g.lineTo(-sideLen, -depth * 0.5);
      g.stroke();
      
      g.moveTo(0, -depth * 0.6);
      g.lineTo(sideLen, -depth * 0.7);
      g.stroke();
    }
  }
  
  /**
   * 渲染死亡状态
   */
  private renderDead(plant: PlantData) {
    const g = this.graphics!;
    
    // 枯萎倒下的茎
    g.strokeColor = new Color(100, 80, 50);
    g.lineWidth = 2;
    g.moveTo(0, 0);
    g.quadraticCurveTo(30, 20, 50, 10);
    g.stroke();
    
    // 枯叶
    g.fillColor = new Color(120, 100, 60);
    g.ellipse(50, 10, 10, 6);
    g.fill();
  }
  
  /**
   * 获取最大叶子数
   */
  private getMaxLeaves(plantType: PlantType): number {
    switch (plantType) {
      case PlantType.CLOVER: return 4;
      case PlantType.SUNFLOWER: return 8;
      case PlantType.STRAWBERRY: return 6;
      case PlantType.SAKURA: return 12;
      default: return 6;
    }
  }
  
  /**
   * 带变化的角度
   */
  private getAngleWithVariance(baseAngle: number, variance: number, seedIndex: number): number {
    const v = (this.seededRandom(this.plantSeed + seedIndex) - 0.5) * 2 * variance;
    return baseAngle * (1 + v);
  }
  
  /**
   * 确定性伪随机
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
  
  /**
   * 字符串哈希
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
