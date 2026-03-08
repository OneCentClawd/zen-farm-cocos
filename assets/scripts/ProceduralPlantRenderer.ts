/**
 * 程序化植物渲染器（方案一：纯代码绘制）
 * 用 Graphics 组件绘制植物，不需要素材
 * 
 * 支持植物类型：
 * - 🍀 幸运草 (clover)
 * - 🌻 向日葵 (sunflower)
 * - 🍓 草莓 (strawberry) [待实现]
 * - 🌸 樱花 (sakura) [待实现]
 */

import { _decorator, Component, Node, Graphics, Color, UITransform, Vec2 } from 'cc';
import { PlantData, getCurrentStage } from './Plant';
import { PlantType } from './PlantTypes';
const { ccclass, property } = _decorator;

@ccclass('ProceduralPlantRenderer')
export class ProceduralPlantRenderer extends Component {
  
  private graphics: Graphics | null = null;
  
  // 通用颜色配置
  private stemColor = new Color(76, 153, 76);      // 茎秆绿
  private leafColor = new Color(60, 179, 113);     // 叶子绿
  private leafDarkColor = new Color(34, 139, 34);  // 深绿（阴影）
  private flowerColor = new Color(255, 255, 255);  // 白色花
  private flowerCenterColor = new Color(255, 223, 186); // 花心
  
  // 向日葵专用颜色
  private sunflowerPetalColor = new Color(255, 200, 50);    // 花瓣金黄
  private sunflowerCenterColor = new Color(90, 60, 30);     // 花盘棕色
  private sunflowerSeedColor = new Color(60, 40, 20);       // 种子深棕
  
  onLoad() {
    // 创建 Graphics 组件
    this.graphics = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
    
    // 确保有 UITransform
    if (!this.node.getComponent(UITransform)) {
      const transform = this.node.addComponent(UITransform);
      transform.setContentSize(400, 500);
    }
  }
  
  /**
   * 根据植物数据渲染
   */
  render(plant: PlantData) {
    if (!this.graphics) return;
    
    this.graphics.clear();
    
    const wiltLevel = plant.wiltLevel || 0;
    const isDead = plant.healthState === 3;  // HealthState.DEAD = 3
    
    // 根据植物类型选择绘制方法
    switch (plant.type) {
      case PlantType.SUNFLOWER:
        this.renderSunflower(plant, wiltLevel, isDead);
        break;
      case PlantType.STRAWBERRY:
        this.renderStrawberry(plant, wiltLevel, isDead);
        break;
      case PlantType.SAKURA:
        this.renderSakura(plant, wiltLevel, isDead);
        break;
      case PlantType.CLOVER:
      default:
        this.renderClover(plant, wiltLevel, isDead);
        break;
    }
  }
  
  // ==================== 幸运草 ====================
  
  /**
   * 渲染幸运草
   */
  private renderClover(plant: PlantData, wiltLevel: number, isDead: boolean) {
    const traits = plant;
    const progress = plant.growthProgress;
    const stage = getCurrentStage(plant);
    
    // 更新颜色
    this.updateCloverColors(traits, wiltLevel, isDead);
    
    if (isDead) {
      // 死亡状态：枯萎的植物
      this.drawDeadPlant(traits, progress);
    } else if (progress < 0.05) {
      // 种子期
      this.drawSeed();
    } else if (progress < 0.15) {
      // 发芽期
      this.drawSprout(progress, wiltLevel);
    } else {
      // 生长期及以后
      this.drawFullPlant(traits, progress, stage.index >= 3, wiltLevel);
    }
  }
  
  /**
   * 幸运草颜色更新
   */
  private updateCloverColors(traits: PlantData, wiltLevel: number = 0, isDead: boolean = false) {
    // 根据 leafColor 值（健康度）调整颜色鲜艳度
    const health = Math.min(100, Math.max(0, traits.leafColor)) / 100;
    
    if (isDead) {
      // 死亡：棕色/灰色
      this.leafColor = new Color(120, 90, 60, 255);
      this.leafDarkColor = new Color(80, 60, 40, 255);
      this.stemColor = new Color(100, 80, 50, 255);
      this.flowerColor = new Color(180, 160, 140, 255);
    } else if (wiltLevel > 0.5) {
      // 严重枯萎：黄棕色
      const wiltFactor = (wiltLevel - 0.5) * 2;  // 0~1
      this.leafColor = new Color(
        Math.round(60 + 100 * wiltFactor),   // 偏黄
        Math.round(150 - 60 * wiltFactor),   // 减绿
        Math.round(80 - 40 * wiltFactor),    // 减蓝
        255
      );
      this.stemColor = new Color(
        Math.round(76 + 50 * wiltFactor),
        Math.round(120 - 40 * wiltFactor),
        76,
        255
      );
    } else {
      // 健康/轻微枯萎
      const greenBoost = Math.round(health * 50 * (1 - wiltLevel));
      this.leafColor = new Color(60 + Math.round(wiltLevel * 40), 129 + greenBoost, 80 + greenBoost * 0.5);
      this.stemColor = new Color(76, 120 + greenBoost * 0.5, 76);
    }
  }
  
  /**
   * 画种子
   */
  private drawSeed() {
    const g = this.graphics!;
    
    g.fillColor = new Color(139, 90, 43);  // 棕色种子
    g.ellipse(0, 5, 8, 5);
    g.fill();
    
    // 种子纹理
    g.strokeColor = new Color(100, 60, 30);
    g.lineWidth = 1;
    g.moveTo(-3, 5);
    g.lineTo(3, 5);
    g.stroke();
  }
  
  /**
   * 画发芽
   */
  private drawSprout(progress: number, wiltLevel: number = 0) {
    const g = this.graphics!;
    
    // 发芽高度随 progress 增长
    const sproutHeight = 10 + (progress - 0.05) * 300;
    
    // 枯萎时茎弯曲
    const droop = wiltLevel * 0.3;  // 下垂程度
    
    // 小茎（枯萎时弯曲）
    g.strokeColor = this.stemColor;
    g.lineWidth = 3;
    g.moveTo(0, 0);
    if (wiltLevel > 0.3) {
      // 弯曲的茎
      g.quadraticCurveTo(sproutHeight * droop, sproutHeight * 0.5, sproutHeight * droop * 0.5, sproutHeight * (1 - droop * 0.3));
    } else {
      g.lineTo(0, sproutHeight);
    }
    g.stroke();
    
    // 子叶（两片小圆叶）
    if (progress > 0.08) {
      const leafSize = 8 + (progress - 0.08) * 100;
      // 枯萎时叶子下垂变小
      const wiltedSize = leafSize * (1 - wiltLevel * 0.3);
      const leafDroop = wiltLevel * leafSize * 0.3;
      
      g.fillColor = this.leafColor;
      
      // 左子叶（枯萎时下垂）
      g.ellipse(-wiltedSize * 0.8, sproutHeight - leafDroop, wiltedSize, wiltedSize * 0.6);
      g.fill();
      
      // 右子叶（枯萎时下垂）
      g.ellipse(wiltedSize * 0.8, sproutHeight - leafDroop, wiltedSize, wiltedSize * 0.6);
      g.fill();
    }
  }
  
  /**
   * 画完整植物
   */
  private drawFullPlant(traits: PlantData, progress: number, hasFlower: boolean, wiltLevel: number = 0) {
    const g = this.graphics!;
    
    // 计算实际尺寸
    const stemHeight = traits.height * 3;  // 放大显示
    const stemWidth = Math.max(2, traits.stemWidth * 0.8);
    const leafCount = traits.leafCount;
    // 枯萎时倾斜加大
    const wiltTilt = wiltLevel * 30;  // 最多额外倾斜 30 度
    const tiltAngle = (traits.tiltAngle + wiltTilt) * Math.PI / 180;
    
    // 画茎秆
    this.drawStem(stemHeight, stemWidth, tiltAngle);
    
    // 画叶子
    this.drawLeaves(stemHeight, leafCount, tiltAngle, progress);
    
    // 画花（枯萎时花朵变小/消失）
    if (hasFlower && wiltLevel < 0.8) {
      this.drawFlower(stemHeight, tiltAngle, wiltLevel);
    }
  }
  
  /**
   * 画死亡/枯萎的植物
   */
  private drawDeadPlant(traits: PlantData, progress: number) {
    const g = this.graphics!;
    
    // 死亡植物倒伏
    const stemHeight = traits.height * 3 * 0.6;  // 高度缩减
    const stemWidth = Math.max(2, traits.stemWidth * 0.6);
    const tiltAngle = 50 * Math.PI / 180;  // 大幅倾斜
    
    // 画弯曲倒下的茎
    g.strokeColor = this.stemColor;
    g.lineWidth = stemWidth;
    g.lineCap = Graphics.LineCap.ROUND;
    
    // 更弯曲的曲线（倒伏）
    const endX = Math.sin(tiltAngle) * stemHeight * 0.8;
    const endY = stemHeight * 0.5;
    const ctrlX = Math.sin(tiltAngle * 0.5) * stemHeight * 0.4;
    const ctrlY = stemHeight * 0.7;
    
    g.moveTo(0, 0);
    g.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    g.stroke();
    
    // 枯萎的叶子（下垂、卷曲）
    const leafCount = Math.max(1, Math.floor(traits.leafCount * 0.5));
    for (let i = 0; i < leafCount; i++) {
      const t = (i + 1) / (leafCount + 1);
      const leafX = ctrlX * t + (endX - ctrlX) * t * t;
      const leafY = ctrlY * t + (endY - ctrlY) * t * t;
      const leafSize = 10 + t * 15;
      
      g.fillColor = this.leafColor;
      // 下垂的叶子（向下的椭圆）
      g.ellipse(leafX + leafSize * 0.3, leafY - leafSize * 0.5, leafSize * 0.4, leafSize * 0.6);
      g.fill();
    }
  }
  
  /**
   * 画茎秆（带弯曲）
   */
  private drawStem(height: number, width: number, tilt: number) {
    const g = this.graphics!;
    
    g.strokeColor = this.stemColor;
    g.lineWidth = width;
    g.lineCap = Graphics.LineCap.ROUND;
    
    // 用贝塞尔曲线画弯曲的茎
    const endX = Math.sin(tilt) * height * 0.3;
    const endY = height;
    const ctrlX = Math.sin(tilt) * height * 0.15;
    const ctrlY = height * 0.5;
    
    g.moveTo(0, 0);
    g.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    g.stroke();
  }
  
  /**
   * 画叶子
   */
  private drawLeaves(stemHeight: number, leafCount: number, tilt: number, progress: number) {
    if (leafCount <= 0) return;
    
    const g = this.graphics!;
    
    for (let i = 0; i < leafCount; i++) {
      // 叶子位置（沿茎秆分布）
      const t = (i + 1) / (leafCount + 1);
      const leafY = stemHeight * t;
      const leafX = Math.sin(tilt) * leafY * 0.3;
      
      // 叶子大小（越高越大）
      const leafSize = 15 + t * 25 * Math.min(1, progress * 1.5);
      
      // 叶子方向（交替左右，用确定性伪随机）
      const side = i % 2 === 0 ? -1 : 1;
      const leafAngle = side * (30 + this.seededRandom(i * 17 + 7) * 15);
      
      this.drawCloverLeaf(leafX, leafY, leafSize, leafAngle * Math.PI / 180);
    }
    
    // 顶部主叶
    const topY = stemHeight;
    const topX = Math.sin(tilt) * topY * 0.3;
    const topSize = 30 + progress * 20;
    this.drawFourLeafClover(topX, topY, topSize);
  }
  
  /**
   * 画单片三叶草叶子
   */
  private drawCloverLeaf(x: number, y: number, size: number, angle: number) {
    const g = this.graphics!;
    
    g.fillColor = this.leafColor;
    
    // 保存变换
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // 画三片叶瓣（简化版心形）
    for (let i = 0; i < 3; i++) {
      const petalAngle = angle + (i - 1) * 0.4;  // -0.4, 0, 0.4 弧度
      const petalX = x + Math.cos(petalAngle) * size * 0.5;
      const petalY = y + Math.sin(petalAngle) * size * 0.3 + size * 0.3;
      
      // 心形叶瓣
      this.drawHeartPetal(petalX, petalY, size * 0.5, petalAngle);
    }
  }
  
  /**
   * 画四叶草（顶部）
   */
  private drawFourLeafClover(x: number, y: number, size: number) {
    const g = this.graphics!;
    
    // 四片心形叶瓣
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90 - 45) * Math.PI / 180;
      const petalX = x + Math.cos(angle) * size * 0.4;
      const petalY = y + Math.sin(angle) * size * 0.4 + size * 0.5;
      
      this.drawHeartPetal(petalX, petalY, size * 0.45, angle);
    }
    
    // 中心点
    g.fillColor = this.leafDarkColor;
    g.circle(x, y + size * 0.5, size * 0.08);
    g.fill();
  }
  
  /**
   * 画心形叶瓣
   */
  private drawHeartPetal(x: number, y: number, size: number, angle: number) {
    const g = this.graphics!;
    
    g.fillColor = this.leafColor;
    
    // 简化心形：用两个圆弧 + 三角形
    const r = size * 0.35;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // 心形上半部分（两个圆）
    const leftCx = x + (-r * 0.5) * cos - (r * 0.5) * sin;
    const leftCy = y + (-r * 0.5) * sin + (r * 0.5) * cos;
    const rightCx = x + (r * 0.5) * cos - (r * 0.5) * sin;
    const rightCy = y + (r * 0.5) * sin + (r * 0.5) * cos;
    
    g.circle(leftCx, leftCy, r * 0.6);
    g.fill();
    g.circle(rightCx, rightCy, r * 0.6);
    g.fill();
    
    // 心形下半部分（三角形）
    const tipX = x + 0 * cos - (-size * 0.6) * sin;
    const tipY = y + 0 * sin + (-size * 0.6) * cos;
    
    g.moveTo(leftCx - r * 0.3 * cos, leftCy - r * 0.3 * sin);
    g.lineTo(tipX, tipY);
    g.lineTo(rightCx + r * 0.3 * cos, rightCy + r * 0.3 * sin);
    g.close();
    g.fill();
  }
  
  /**
   * 画花朵
   */
  private drawFlower(stemHeight: number, tilt: number, wiltLevel: number = 0) {
    const g = this.graphics!;
    
    const flowerX = Math.sin(tilt) * stemHeight * 0.3;
    // 枯萎时花朵下垂
    const droop = wiltLevel * 20;
    const flowerY = stemHeight + 25 - droop;
    
    // 枯萎时花变小变暗
    const sizeScale = 1 - wiltLevel * 0.4;
    
    // 白色三叶草花（球状）
    g.fillColor = this.flowerColor;
    
    // 用多个小圆模拟球状花序
    const petalCount = Math.max(6, Math.round(12 * (1 - wiltLevel * 0.5)));
    for (let i = 0; i < petalCount; i++) {
      const angle = i * (360 / petalCount) * Math.PI / 180;
      const r = 8 * sizeScale;
      const px = flowerX + Math.cos(angle) * 6 * sizeScale;
      const py = flowerY + Math.sin(angle) * 4 * sizeScale;
      
      g.circle(px, py, 4 * sizeScale);
      g.fill();
    }
    
    // 花心
    g.fillColor = this.flowerCenterColor;
    g.circle(flowerX, flowerY, 5 * sizeScale);
    g.fill();
  }
  
  // ==================== 向日葵 ====================
  
  /**
   * 渲染向日葵
   */
  private renderSunflower(plant: PlantData, wiltLevel: number, isDead: boolean) {
    const traits = plant;
    const progress = plant.growthProgress;
    const stage = getCurrentStage(plant);
    
    // 更新颜色
    this.updateSunflowerColors(wiltLevel, isDead);
    
    if (isDead) {
      this.drawDeadSunflower(traits, progress);
    } else if (progress < 0.03) {
      // 种子期
      this.drawSunflowerSeed();
    } else if (progress < 0.08) {
      // 破土/幼苗
      this.drawSunflowerSprout(progress, wiltLevel);
    } else if (progress < 0.50) {
      // 抽茎期（茎秆长高，叶子增多）
      this.drawSunflowerStem(traits, progress, wiltLevel);
    } else {
      // 花苞/盛开/结籽
      const hasFlower = progress >= 0.50;
      const isFullBloom = progress >= 0.70;
      const hasSeed = progress >= 1.0;
      this.drawFullSunflower(traits, progress, wiltLevel, hasFlower, isFullBloom, hasSeed);
    }
  }
  
  /**
   * 向日葵颜色更新
   */
  private updateSunflowerColors(wiltLevel: number, isDead: boolean) {
    if (isDead) {
      this.stemColor = new Color(100, 80, 50);
      this.leafColor = new Color(120, 100, 60);
      this.sunflowerPetalColor = new Color(150, 120, 60);
      this.sunflowerCenterColor = new Color(60, 40, 20);
    } else if (wiltLevel > 0.5) {
      const wf = (wiltLevel - 0.5) * 2;
      this.stemColor = new Color(76 + Math.round(40 * wf), 130 - Math.round(40 * wf), 60);
      this.leafColor = new Color(80 + Math.round(60 * wf), 150 - Math.round(50 * wf), 60);
      this.sunflowerPetalColor = new Color(255, 200 - Math.round(80 * wf), 50);
    } else {
      this.stemColor = new Color(76, 140, 60);
      this.leafColor = new Color(70, 160, 70);
      this.sunflowerPetalColor = new Color(255, 200, 50);
      this.sunflowerCenterColor = new Color(90, 60, 30);
    }
  }
  
  /**
   * 向日葵种子
   */
  private drawSunflowerSeed() {
    const g = this.graphics!;
    
    // 葵花籽（黑白条纹的椭圆）
    g.fillColor = new Color(40, 30, 20);
    g.ellipse(0, 5, 10, 6);
    g.fill();
    
    // 条纹
    g.strokeColor = new Color(200, 200, 200);
    g.lineWidth = 1;
    g.moveTo(-4, 5);
    g.lineTo(4, 5);
    g.stroke();
  }
  
  /**
   * 向日葵发芽
   */
  private drawSunflowerSprout(progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const height = 15 + (progress - 0.03) * 400;
    const droop = wiltLevel * 0.2;
    
    // 茎
    g.strokeColor = this.stemColor;
    g.lineWidth = 4;
    g.moveTo(0, 0);
    g.lineTo(height * droop, height);
    g.stroke();
    
    // 子叶（椭圆形，比幸运草大）
    if (progress > 0.05) {
      const leafSize = 15 + (progress - 0.05) * 200;
      const leafDroop = wiltLevel * leafSize * 0.3;
      
      g.fillColor = this.leafColor;
      
      // 左子叶
      g.ellipse(-leafSize, height - leafDroop, leafSize * 0.7, leafSize * 0.4);
      g.fill();
      
      // 右子叶  
      g.ellipse(leafSize, height - leafDroop, leafSize * 0.7, leafSize * 0.4);
      g.fill();
    }
  }
  
  /**
   * 向日葵抽茎期
   */
  private drawSunflowerStem(traits: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 茎秆高度随进度增长
    const maxHeight = traits.height * 2;
    const stemProgress = (progress - 0.08) / 0.42;  // 0~1 在这个阶段
    const stemHeight = 30 + stemProgress * maxHeight;
    const stemWidth = 4 + stemProgress * 4;
    
    const tilt = (traits.tiltAngle + wiltLevel * 20) * Math.PI / 180;
    
    // 画茎秆
    g.strokeColor = this.stemColor;
    g.lineWidth = stemWidth;
    g.lineCap = Graphics.LineCap.ROUND;
    
    const endX = Math.sin(tilt) * stemHeight * 0.2;
    g.moveTo(0, 0);
    g.quadraticCurveTo(endX * 0.5, stemHeight * 0.5, endX, stemHeight);
    g.stroke();
    
    // 叶子（心形大叶，交替排列）
    const leafCount = Math.floor(2 + stemProgress * traits.leafCount);
    for (let i = 0; i < leafCount; i++) {
      const t = (i + 1) / (leafCount + 1);
      const leafY = stemHeight * t;
      const leafX = Math.sin(tilt) * leafY * 0.2;
      
      const side = i % 2 === 0 ? -1 : 1;
      const leafSize = 20 + t * 30 * stemProgress;
      const leafAngle = side * (40 + this.seededRandom(i * 17) * 20) * Math.PI / 180;
      const leafDroop = wiltLevel * 20;
      
      this.drawSunflowerLeaf(leafX, leafY - leafDroop, leafSize, leafAngle, side);
    }
  }
  
  /**
   * 画向日葵叶子（心形）
   */
  private drawSunflowerLeaf(x: number, y: number, size: number, angle: number, side: number) {
    const g = this.graphics!;
    
    g.fillColor = this.leafColor;
    
    // 心形叶子（向日葵特有的大叶）
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    // 叶柄
    g.strokeColor = this.stemColor;
    g.lineWidth = 2;
    g.moveTo(x, y);
    g.lineTo(x + cos * size * 0.3, y + sin * size * 0.3);
    g.stroke();
    
    // 叶片（用椭圆简化）
    const leafCenterX = x + cos * size * 0.6;
    const leafCenterY = y + sin * size * 0.6;
    
    g.fillColor = this.leafColor;
    g.ellipse(leafCenterX, leafCenterY, size * 0.5, size * 0.35);
    g.fill();
    
    // 叶脉
    g.strokeColor = new Color(50, 120, 50);
    g.lineWidth = 1;
    g.moveTo(x + cos * size * 0.3, y + sin * size * 0.3);
    g.lineTo(leafCenterX + cos * size * 0.3, leafCenterY + sin * size * 0.3);
    g.stroke();
  }
  
  /**
   * 完整向日葵（花苞/盛开/结籽）
   */
  private drawFullSunflower(
    traits: PlantData,
    progress: number,
    wiltLevel: number,
    hasFlower: boolean,
    isFullBloom: boolean,
    hasSeed: boolean
  ) {
    const g = this.graphics!;
    
    const stemHeight = traits.height * 2;
    const stemWidth = 8;
    const tilt = (traits.tiltAngle + wiltLevel * 25) * Math.PI / 180;
    
    // 画茎秆
    g.strokeColor = this.stemColor;
    g.lineWidth = stemWidth;
    g.lineCap = Graphics.LineCap.ROUND;
    
    const endX = Math.sin(tilt) * stemHeight * 0.25;
    const endY = stemHeight;
    g.moveTo(0, 0);
    g.quadraticCurveTo(endX * 0.4, stemHeight * 0.5, endX, endY);
    g.stroke();
    
    // 叶子
    const leafCount = traits.leafCount;
    for (let i = 0; i < leafCount; i++) {
      const t = (i + 1) / (leafCount + 1);
      const leafY = stemHeight * t;
      const leafX = Math.sin(tilt) * leafY * 0.25;
      
      const side = i % 2 === 0 ? -1 : 1;
      const leafSize = 25 + t * 35;
      const leafAngle = side * (45 + this.seededRandom(i * 23) * 15) * Math.PI / 180;
      const leafDroop = wiltLevel * 25;
      
      this.drawSunflowerLeaf(leafX, leafY - leafDroop, leafSize * (1 - wiltLevel * 0.3), leafAngle, side);
    }
    
    // 花朵
    if (hasFlower) {
      const flowerX = endX;
      const flowerY = endY + 10;
      const flowerDroop = wiltLevel * 40;
      
      this.drawSunflowerHead(flowerX, flowerY - flowerDroop, isFullBloom, hasSeed, wiltLevel);
    }
  }
  
  /**
   * 画向日葵花盘
   */
  private drawSunflowerHead(x: number, y: number, isFullBloom: boolean, hasSeed: boolean, wiltLevel: number) {
    const g = this.graphics!;
    
    const baseSize = isFullBloom ? 50 : 30;
    const size = baseSize * (1 - wiltLevel * 0.3);
    
    // 花瓣（金黄色舌状花）
    if (!hasSeed || wiltLevel < 0.5) {
      const petalCount = isFullBloom ? 20 : 12;
      const petalLength = size * 0.8;
      const petalWidth = size * 0.15;
      
      g.fillColor = this.sunflowerPetalColor;
      
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
        const px = x + Math.cos(angle) * size * 0.5;
        const py = y + Math.sin(angle) * size * 0.5;
        
        // 花瓣（椭圆）
        const petalAngle = angle;
        const tipX = x + Math.cos(angle) * (size * 0.5 + petalLength);
        const tipY = y + Math.sin(angle) * (size * 0.5 + petalLength);
        
        // 简化花瓣为椭圆
        const centerX = (px + tipX) / 2;
        const centerY = (py + tipY) / 2;
        
        g.ellipse(centerX, centerY, petalLength / 2, petalWidth);
        g.fill();
      }
    }
    
    // 花盘（棕色圆形）
    g.fillColor = this.sunflowerCenterColor;
    g.circle(x, y, size * 0.5);
    g.fill();
    
    // 花盘纹理/种子
    if (isFullBloom || hasSeed) {
      g.fillColor = this.sunflowerSeedColor;
      const seedCount = hasSeed ? 30 : 15;
      
      for (let i = 0; i < seedCount; i++) {
        const r = this.seededRandom(i * 13) * size * 0.4;
        const a = this.seededRandom(i * 29) * Math.PI * 2;
        const sx = x + Math.cos(a) * r;
        const sy = y + Math.sin(a) * r;
        const seedSize = hasSeed ? 3 : 2;
        
        g.circle(sx, sy, seedSize);
        g.fill();
      }
    }
  }
  
  /**
   * 死亡的向日葵
   */
  private drawDeadSunflower(traits: PlantData, progress: number) {
    const g = this.graphics!;
    
    const stemHeight = traits.height * 1.5;
    
    // 倒伏的茎（大幅弯曲）
    g.strokeColor = this.stemColor;
    g.lineWidth = 6;
    g.lineCap = Graphics.LineCap.ROUND;
    
    g.moveTo(0, 0);
    g.quadraticCurveTo(stemHeight * 0.3, stemHeight * 0.6, stemHeight * 0.5, stemHeight * 0.4);
    g.stroke();
    
    // 下垂的花盘
    if (progress >= 0.5) {
      g.fillColor = new Color(80, 60, 40);
      g.circle(stemHeight * 0.5, stemHeight * 0.3, 25);
      g.fill();
      
      // 枯萎的花瓣
      g.fillColor = new Color(120, 90, 50);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const px = stemHeight * 0.5 + Math.cos(angle) * 30;
        const py = stemHeight * 0.3 + Math.sin(angle) * 30 - 10;  // 下垂
        g.ellipse(px, py, 12, 5);
        g.fill();
      }
    }
    
    // 枯叶
    g.fillColor = new Color(100, 80, 50);
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      const lx = stemHeight * 0.15 * t;
      const ly = stemHeight * 0.5 * t;
      g.ellipse(lx + 20, ly - 15, 15, 8);
      g.fill();
    }
  }
  
  // ==================== 草莓 (待实现) ====================
  
  private renderStrawberry(plant: PlantData, wiltLevel: number, isDead: boolean) {
    // TODO: 实现草莓渲染
    // 临时用幸运草占位
    this.renderClover(plant, wiltLevel, isDead);
  }
  
  // ==================== 樱花 (待实现) ====================
  
  private renderSakura(plant: PlantData, wiltLevel: number, isDead: boolean) {
    // TODO: 实现樱花渲染
    // 临时用幸运草占位
    this.renderClover(plant, wiltLevel, isDead);
  }
  
  // ==================== 通用工具 ====================
  
  /**
   * 清除画面
   */
  clear() {
    if (this.graphics) {
      this.graphics.clear();
    }
  }
  
  /**
   * 确定性伪随机数生成器（相同种子 = 相同结果）
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
}
