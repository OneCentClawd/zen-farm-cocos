/**
 * 植物程序化渲染器
 * 根据 PlantData 的物理特征动态绘制植物
 */

import { _decorator, Component, Graphics, Color, Node, UITransform, view } from 'cc';
import { PlantData, PhysicalTraits, HealthState, PLANT_CONFIGS, getCurrentStage } from './Plant';
const { ccclass, property } = _decorator;

@ccclass('PlantRenderer')
export class PlantRenderer extends Component {
  private graphics: Graphics | null = null;
  
  // 渲染参数（可调整）
  private readonly SCALE = 3;  // 整体缩放（厘米→像素）
  private readonly MAX_LEAF_SIZE = 25;
  private readonly MAX_FLOWER_SIZE = 35;
  
  onLoad() {
    // 获取或创建 Graphics 组件
    this.graphics = this.node.getComponent(Graphics);
    if (!this.graphics) {
      this.graphics = this.node.addComponent(Graphics);
    }
  }
  
  /**
   * 根据植物数据渲染
   */
  render(plant: PlantData, offsetX: number = 0, offsetY: number = 0) {
    if (!this.graphics) return;
    
    const config = PLANT_CONFIGS[plant.type];
    const traits = plant.physicalTraits;
    const stage = getCurrentStage(plant);
    
    // 计算渲染参数
    const height = traits.height * this.SCALE;
    const thickness = Math.max(2, traits.stemWidth * this.SCALE * 0.8);
    const tiltRad = (traits.tiltAngle * Math.PI) / 180;
    
    // 茎的终点（考虑倾斜）
    const topX = offsetX + Math.sin(tiltRad) * height;
    const topY = offsetY + Math.cos(tiltRad) * height;
    
    // 颜色：根据健康度和 leafColor 计算
    const healthFactor = plant.healthValue / 100;
    const leafColorFactor = traits.leafColor / 100;  // 0=嫩绿, 100=深绿
    
    const stemColor = this.getStemColor(healthFactor, leafColorFactor);
    const leafColor = this.getLeafColor(healthFactor, leafColorFactor);
    
    // 1. 画根系（半透明，在泥土下）
    this.drawRoots(offsetX, offsetY, traits.rootDepth * this.SCALE * 0.5, stemColor);
    
    // 2. 画茎
    this.drawStem(offsetX, offsetY, topX, topY, thickness, stemColor, traits.tiltAngle);
    
    // 3. 画叶子
    const leafSize = this.MAX_LEAF_SIZE * (0.5 + leafColorFactor * 0.005);
    this.drawLeaves(offsetX, offsetY, topX, topY, traits.leafCount, leafSize, leafColor, height);
    
    // 4. 画花/果（根据阶段）
    if (stage.index >= 2) {  // 开花期及以后
      this.drawFlowerOrFruit(topX, topY, plant, stage.index);
    }
  }
  
  /**
   * 清除画布
   */
  clear() {
    if (this.graphics) {
      this.graphics.clear();
    }
  }
  
  /**
   * 画根系
   */
  private drawRoots(x: number, y: number, depth: number, color: Color) {
    if (!this.graphics || depth < 5) return;
    
    const rootColor = new Color(color.r - 30, color.g - 20, color.b, 120);
    this.graphics.strokeColor = rootColor;
    this.graphics.lineWidth = 1.5;
    
    // 画3-5条根
    const rootCount = 3 + Math.floor(depth / 20);
    for (let i = 0; i < rootCount; i++) {
      const angle = -90 + (i - rootCount / 2) * 25;
      const rad = (angle * Math.PI) / 180;
      const len = depth * (0.6 + Math.random() * 0.4);
      
      this.graphics.moveTo(x, y);
      this.graphics.lineTo(
        x + Math.cos(rad) * len * 0.3,
        y + Math.sin(rad) * len
      );
      this.graphics.stroke();
    }
  }
  
  /**
   * 画茎
   */
  private drawStem(x1: number, y1: number, x2: number, y2: number, thickness: number, color: Color, tilt: number) {
    if (!this.graphics) return;
    
    this.graphics.strokeColor = color;
    this.graphics.lineWidth = thickness;
    this.graphics.lineCap = Graphics.LineCap.ROUND;
    
    // 贝塞尔曲线画茎，添加自然弯曲
    const midY = (y1 + y2) / 2;
    const bendX = (x1 + x2) / 2 + tilt * 0.2;
    
    this.graphics.moveTo(x1, y1);
    this.graphics.bezierCurveTo(
      x1, y1 + (y2 - y1) * 0.3,
      bendX, midY,
      x2, y2
    );
    this.graphics.stroke();
    
    // 茎的高光（浅色细线）
    this.graphics.lineWidth = thickness * 0.3;
    this.graphics.strokeColor = new Color(
      Math.min(255, color.r + 40),
      Math.min(255, color.g + 30),
      Math.min(255, color.b + 20),
      200
    );
    this.graphics.moveTo(x1 - thickness * 0.2, y1);
    this.graphics.bezierCurveTo(
      x1 - thickness * 0.2, y1 + (y2 - y1) * 0.3,
      bendX - thickness * 0.2, midY,
      x2 - thickness * 0.1, y2
    );
    this.graphics.stroke();
  }
  
  /**
   * 画叶子
   */
  private drawLeaves(baseX: number, baseY: number, topX: number, topY: number, count: number, size: number, color: Color, height: number) {
    if (!this.graphics || count <= 0) return;
    
    // 叶子沿着茎分布
    for (let i = 0; i < count; i++) {
      // 叶子位置：从底部 15% 到顶部 85%
      const t = 0.15 + (i / Math.max(1, count - 1)) * 0.7;
      const leafX = baseX + (topX - baseX) * t;
      const leafY = baseY + (topY - baseY) * t;
      
      // 交替左右
      const side = i % 2 === 0 ? 1 : -1;
      // 叶子角度
      const baseAngle = side * 45;
      const randomAngle = (Math.random() - 0.5) * 20;
      const angle = baseAngle + randomAngle;
      
      // 叶子大小：中间大，两端小
      const sizeFactor = 0.6 + 0.4 * Math.sin(t * Math.PI);
      
      this.drawLeaf(leafX, leafY, size * sizeFactor, angle, color);
    }
  }
  
  /**
   * 画单个叶子
   */
  private drawLeaf(x: number, y: number, size: number, angle: number, color: Color) {
    if (!this.graphics) return;
    
    const rad = (angle * Math.PI) / 180;
    const leafLength = size;
    const leafWidth = size * 0.4;
    
    // 叶子终点
    const endX = x + Math.cos(rad) * leafLength;
    const endY = y + Math.sin(rad) * leafLength;
    
    // 控制点
    const perpRad = rad + Math.PI / 2;
    
    this.graphics.fillColor = color;
    
    // 画叶子（椭圆形）
    this.graphics.moveTo(x, y);
    this.graphics.bezierCurveTo(
      x + Math.cos(rad) * leafLength * 0.3 + Math.cos(perpRad) * leafWidth,
      y + Math.sin(rad) * leafLength * 0.3 + Math.sin(perpRad) * leafWidth,
      endX + Math.cos(perpRad) * leafWidth * 0.2,
      endY + Math.sin(perpRad) * leafWidth * 0.2,
      endX, endY
    );
    this.graphics.bezierCurveTo(
      endX - Math.cos(perpRad) * leafWidth * 0.2,
      endY - Math.sin(perpRad) * leafWidth * 0.2,
      x + Math.cos(rad) * leafLength * 0.3 - Math.cos(perpRad) * leafWidth,
      y + Math.sin(rad) * leafLength * 0.3 - Math.sin(perpRad) * leafWidth,
      x, y
    );
    this.graphics.fill();
    
    // 叶脉
    this.graphics.strokeColor = new Color(
      Math.max(0, color.r - 30),
      Math.min(255, color.g + 20),
      Math.max(0, color.b - 20),
      180
    );
    this.graphics.lineWidth = 0.8;
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(endX, endY);
    this.graphics.stroke();
  }
  
  /**
   * 画花或果实
   */
  private drawFlowerOrFruit(x: number, y: number, plant: PlantData, stageIndex: number) {
    if (!this.graphics) return;
    
    const config = PLANT_CONFIGS[plant.type];
    const progress = plant.growthProgress;
    
    // 根据植物类型画不同的花/果
    switch (plant.type) {
      case 'clover':
        // 幸运草：小白花
        if (stageIndex >= 3) {
          this.drawCloverFlower(x, y);
        }
        break;
        
      case 'sunflower':
        // 向日葵：大黄花
        this.drawSunflower(x, y, stageIndex, progress);
        break;
        
      case 'strawberry':
        // 草莓：白花 → 红果
        if (stageIndex === 2) {
          this.drawStrawberryFlower(x, y);
        } else if (stageIndex >= 3) {
          this.drawStrawberryFruit(x, y, progress);
        }
        break;
        
      case 'sakura':
        // 樱花：粉色花瓣
        if (stageIndex >= 2) {
          this.drawSakuraFlowers(x, y, stageIndex, progress);
        }
        break;
    }
  }
  
  /**
   * 幸运草小花
   */
  private drawCloverFlower(x: number, y: number) {
    if (!this.graphics) return;
    
    // 三片心形叶子
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const leafX = x + Math.cos(angle) * 8;
      const leafY = y + Math.sin(angle) * 8;
      
      this.graphics.fillColor = new Color(80, 180, 80, 255);
      this.graphics.circle(leafX, leafY, 6);
      this.graphics.fill();
    }
    
    // 中心
    this.graphics.fillColor = new Color(100, 200, 100, 255);
    this.graphics.circle(x, y, 4);
    this.graphics.fill();
  }
  
  /**
   * 向日葵
   */
  private drawSunflower(x: number, y: number, stageIndex: number, progress: number) {
    if (!this.graphics) return;
    
    const size = this.MAX_FLOWER_SIZE * (0.5 + progress * 0.5);
    const petalCount = stageIndex >= 3 ? 12 : 8;
    
    // 花瓣
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalX = x + Math.cos(angle) * size * 0.5;
      const petalY = y + Math.sin(angle) * size * 0.5;
      
      this.graphics.fillColor = new Color(255, 220, 50, 255);
      this.graphics.ellipse(petalX, petalY, size * 0.4, size * 0.15);
      this.graphics.fill();
    }
    
    // 花盘
    this.graphics.fillColor = new Color(139, 90, 43, 255);
    this.graphics.circle(x, y, size * 0.35);
    this.graphics.fill();
    
    // 花盘纹理
    this.graphics.fillColor = new Color(100, 60, 30, 255);
    this.graphics.circle(x, y, size * 0.2);
    this.graphics.fill();
  }
  
  /**
   * 草莓花
   */
  private drawStrawberryFlower(x: number, y: number) {
    if (!this.graphics) return;
    
    // 5片白色花瓣
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const petalX = x + Math.cos(angle) * 10;
      const petalY = y + Math.sin(angle) * 10;
      
      this.graphics.fillColor = new Color(255, 255, 255, 255);
      this.graphics.ellipse(petalX, petalY, 8, 5);
      this.graphics.fill();
    }
    
    // 黄色花心
    this.graphics.fillColor = new Color(255, 220, 100, 255);
    this.graphics.circle(x, y, 5);
    this.graphics.fill();
  }
  
  /**
   * 草莓果实
   */
  private drawStrawberryFruit(x: number, y: number, progress: number) {
    if (!this.graphics) return;
    
    const size = 15 + progress * 10;
    const ripe = progress >= 1.0;
    
    // 果实（心形近似）
    this.graphics.fillColor = ripe 
      ? new Color(220, 40, 40, 255)   // 成熟红色
      : new Color(200, 180, 150, 255); // 未熟浅色
    
    // 用椭圆近似草莓形状
    this.graphics.ellipse(x, y - size * 0.3, size * 0.6, size * 0.8);
    this.graphics.fill();
    
    // 草莓籽
    if (ripe) {
      this.graphics.fillColor = new Color(255, 220, 100, 255);
      for (let i = 0; i < 6; i++) {
        const seedX = x + (Math.random() - 0.5) * size * 0.8;
        const seedY = y - size * 0.3 + (Math.random() - 0.5) * size;
        this.graphics.circle(seedX, seedY, 1.5);
        this.graphics.fill();
      }
    }
    
    // 叶子帽
    this.graphics.fillColor = new Color(80, 160, 60, 255);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const leafX = x + Math.cos(angle) * 6;
      const leafY = y + size * 0.4 + Math.sin(angle) * 3;
      this.graphics.ellipse(leafX, leafY, 5, 3);
      this.graphics.fill();
    }
  }
  
  /**
   * 樱花
   */
  private drawSakuraFlowers(x: number, y: number, stageIndex: number, progress: number) {
    if (!this.graphics) return;
    
    const flowerCount = stageIndex >= 3 ? 5 : 2;
    
    for (let f = 0; f < flowerCount; f++) {
      const fx = x + (Math.random() - 0.5) * 30;
      const fy = y + (Math.random() - 0.5) * 20 + f * 5;
      
      // 5片粉色花瓣
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const petalX = fx + Math.cos(angle) * 10;
        const petalY = fy + Math.sin(angle) * 10;
        
        this.graphics.fillColor = new Color(255, 180, 200, 230);
        this.graphics.ellipse(petalX, petalY, 9, 5);
        this.graphics.fill();
      }
      
      // 花心
      this.graphics.fillColor = new Color(255, 220, 180, 255);
      this.graphics.circle(fx, fy, 4);
      this.graphics.fill();
    }
  }
  
  /**
   * 根据健康度计算茎颜色
   */
  private getStemColor(health: number, leafColorFactor: number): Color {
    // 健康：绿色，不健康：偏棕黄
    const baseG = 100 + leafColorFactor * 40;
    const r = Math.round(60 + (1 - health) * 80);
    const g = Math.round(baseG - (1 - health) * 50);
    const b = Math.round(40 - (1 - health) * 20);
    return new Color(r, g, b, 255);
  }
  
  /**
   * 根据健康度计算叶子颜色
   */
  private getLeafColor(health: number, leafColorFactor: number): Color {
    // leafColorFactor: 0=嫩绿, 100=深绿
    const baseG = 140 + leafColorFactor * 0.6;
    const r = Math.round(40 + (1 - leafColorFactor / 100) * 30 + (1 - health) * 80);
    const g = Math.round(baseG - (1 - health) * 60);
    const b = Math.round(40 + (1 - leafColorFactor / 100) * 20 - (1 - health) * 30);
    return new Color(r, g, b, 255);
  }
}
