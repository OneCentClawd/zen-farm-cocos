/**
 * 程序化植物渲染器（方案一：纯代码绘制）
 * 用 Graphics 组件绘制植物，不需要素材
 * 
 * 支持植物类型：
 * - 🍀 幸运草 (clover)
 * - 🌻 向日葵 (sunflower)
 * - 🍓 草莓 (strawberry)
 * - 🌸 樱花 (sakura)
 */

import { _decorator, Component, Node, Graphics, Color, UITransform, Vec2 } from 'cc';
import { PlantData, getCurrentStage } from './Plant';
import { PlantType } from './PlantTypes';
const { ccclass, property } = _decorator;

@ccclass('ProceduralPlantRenderer')
export class ProceduralPlantRenderer extends Component {
  
  private graphics: Graphics | null = null;
  
  // 动画时间（用于落樱等动态效果）
  private animTime: number = 0;
  
  // 通用颜色配置
  private stemColor = new Color(76, 153, 76);      // 茎秆绿
  private leafColor = new Color(60, 179, 113);     // 叶子绿
  private leafDarkColor = new Color(34, 139, 34);  // 深绿（阴影）
  private flowerColor = new Color(255, 255, 255);  // 白色花
  private flowerCenterColor = new Color(255, 223, 186); // 花心
  private rootColor = new Color(139, 90, 43);      // 根系棕色
  private rootLightColor = new Color(160, 120, 80); // 浅根色
  
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
   * @param plant 植物数据
   * @param deltaTime 可选，帧间隔时间（秒），用于动画
   */
  render(plant: PlantData, deltaTime: number = 0) {
    if (!this.graphics) return;
    
    // 更新动画时间
    this.animTime += deltaTime;
    
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
   * 画种子（埋在土里）
   */
  private drawSeed() {
    const g = this.graphics!;
    
    // 种子埋在土里（y 为负值表示在地面以下）
    g.fillColor = new Color(139, 90, 43);  // 棕色种子
    g.ellipse(0, -15, 8, 5);
    g.fill();
    
    // 种子纹理
    g.strokeColor = new Color(100, 60, 30);
    g.lineWidth = 1;
    g.moveTo(-3, -15);
    g.lineTo(3, -15);
    g.stroke();
  }
  
  /**
   * 画根系
   * @param depth 根系深度
   * @param spread 根系宽度
   * @param complexity 复杂度（分支数）
   */
  private drawRoots(depth: number, spread: number, complexity: number = 3) {
    const g = this.graphics!;
    
    g.strokeColor = this.rootColor;
    g.lineWidth = 2;
    
    // 主根
    g.moveTo(0, 0);
    g.lineTo(0, -depth * 0.6);
    g.stroke();
    
    // 侧根
    g.lineWidth = 1.5;
    for (let i = 0; i < complexity; i++) {
      const y = -depth * 0.2 - (i * depth * 0.3 / complexity);
      const angle = (i % 2 === 0 ? 1 : -1) * (30 + i * 10) * Math.PI / 180;
      const length = spread * (0.5 + Math.random() * 0.3);
      
      g.moveTo(0, y);
      g.lineTo(Math.sin(angle) * length, y - Math.cos(angle) * length * 0.5);
      g.stroke();
      
      // 细根
      g.strokeColor = this.rootLightColor;
      g.lineWidth = 1;
      const endX = Math.sin(angle) * length;
      const endY = y - Math.cos(angle) * length * 0.5;
      g.moveTo(endX, endY);
      g.lineTo(endX + Math.sin(angle) * length * 0.3, endY - length * 0.2);
      g.stroke();
      
      g.strokeColor = this.rootColor;
      g.lineWidth = 1.5;
    }
    
    // 主根尖端
    g.lineWidth = 1;
    g.moveTo(0, -depth * 0.6);
    g.lineTo(0, -depth);
    g.stroke();
  }
  
  /**
   * 画发芽（带根系）
   */
  private drawSprout(progress: number, wiltLevel: number = 0) {
    const g = this.graphics!;
    
    // 先画根系（在茎下方）
    const rootDepth = 20 + (progress - 0.05) * 200;  // 根随生长加深
    const rootSpread = 15 + (progress - 0.05) * 100;
    this.drawRoots(rootDepth, rootSpread, 2);
    
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
    
    // 先画根系
    const rootDepth = 40 + traits.height * 0.5;
    const rootSpread = 30 + traits.leafCount * 5;
    this.drawRoots(rootDepth, rootSpread, Math.min(5, traits.leafCount));
    
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
   * 向日葵种子（埋在土里）
   */
  private drawSunflowerSeed() {
    const g = this.graphics!;
    
    // 葵花籽（埋在土里）
    g.fillColor = new Color(40, 30, 20);
    g.ellipse(0, -15, 10, 6);
    g.fill();
    
    // 条纹
    g.strokeColor = new Color(200, 200, 200);
    g.lineWidth = 1;
    g.moveTo(-4, -15);
    g.lineTo(4, -15);
    g.stroke();
  }
  
  /**
   * 向日葵发芽（带根系）
   */
  private drawSunflowerSprout(progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 先画根系
    const rootDepth = 25 + (progress - 0.03) * 300;
    const rootSpread = 20 + (progress - 0.03) * 150;
    this.drawRoots(rootDepth, rootSpread, 3);
    
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
   * 向日葵抽茎期（带根系）
   */
  private drawSunflowerStem(traits: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 先画根系
    const rootDepth = 50 + traits.height * 0.8;
    const rootSpread = 40 + traits.leafCount * 8;
    this.drawRoots(rootDepth, rootSpread, 4);
    
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
    
    // 花瓣（金黄色舌状花，沿径向排列）
    if (!hasSeed || wiltLevel < 0.5) {
      const petalCount = isFullBloom ? 20 : 12;
      const petalLength = size * 0.8;
      const petalWidth = size * 0.15;
      
      g.fillColor = this.sunflowerPetalColor;
      
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
        
        // 花瓣基部（在花盘边缘）
        const baseX = x + Math.cos(angle) * size * 0.45;
        const baseY = y + Math.sin(angle) * size * 0.45;
        
        // 花瓣尖端
        const tipX = x + Math.cos(angle) * (size * 0.5 + petalLength);
        const tipY = y + Math.sin(angle) * (size * 0.5 + petalLength);
        
        // 花瓣两侧（垂直于径向）
        const perpX = Math.cos(angle + Math.PI / 2) * petalWidth;
        const perpY = Math.sin(angle + Math.PI / 2) * petalWidth;
        
        // 用贝塞尔曲线画花瓣（菱形/叶形）
        g.moveTo(baseX, baseY);
        g.quadraticCurveTo(
          (baseX + tipX) / 2 + perpX,
          (baseY + tipY) / 2 + perpY,
          tipX, tipY
        );
        g.quadraticCurveTo(
          (baseX + tipX) / 2 - perpX,
          (baseY + tipY) / 2 - perpY,
          baseX, baseY
        );
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
  
  // ==================== 草莓 ====================
  
  // 草莓专用颜色
  private strawberryLeafColor = new Color(50, 140, 50);      // 锯齿叶绿
  private strawberryFlowerColor = new Color(255, 255, 255);  // 白色花
  private strawberryGreenColor = new Color(150, 200, 100);   // 青果绿
  private strawberryRedColor = new Color(220, 40, 40);       // 成熟红
  private strawberrySeedColor = new Color(255, 220, 100);    // 种子黄
  
  /**
   * 渲染草莓
   */
  private renderStrawberry(plant: PlantData, wiltLevel: number, isDead: boolean) {
    const progress = plant.growthProgress;
    
    this.updateStrawberryColors(wiltLevel, isDead);
    
    if (isDead) {
      this.drawDeadStrawberry(plant, progress);
    } else if (progress < 0.03) {
      // 种子期
      this.drawStrawberrySeed();
    } else if (progress < 0.10) {
      // 发芽期
      this.drawStrawberrySprout(progress, wiltLevel);
    } else if (progress < 0.25) {
      // 展叶期
      this.drawStrawberryLeavesCore(plant, progress, wiltLevel);
    } else if (progress < 0.45) {
      // 匍匐茎期
      this.drawStrawberryRunner(plant, progress, wiltLevel);
    } else if (progress < 0.65) {
      // 开花期
      this.drawStrawberryBloom(plant, progress, wiltLevel);
    } else {
      // 结果期（青果/红果）
      const isRipe = progress >= 1.0;
      this.drawStrawberryFruit(plant, progress, wiltLevel, isRipe);
    }
  }
  
  /**
   * 草莓颜色更新
   */
  private updateStrawberryColors(wiltLevel: number, isDead: boolean) {
    if (isDead) {
      this.stemColor = new Color(100, 80, 50);
      this.strawberryLeafColor = new Color(120, 100, 60);
      this.strawberryRedColor = new Color(100, 60, 40);
    } else if (wiltLevel > 0.5) {
      const wf = (wiltLevel - 0.5) * 2;
      this.stemColor = new Color(76 + Math.round(30 * wf), 130 - Math.round(40 * wf), 60);
      this.strawberryLeafColor = new Color(70 + Math.round(50 * wf), 140 - Math.round(40 * wf), 50);
    } else {
      this.stemColor = new Color(76, 130, 60);
      this.strawberryLeafColor = new Color(50, 140, 50);
      this.strawberryRedColor = new Color(220, 40, 40);
    }
  }
  
  /**
   * 草莓种子（埋在土里）
   */
  private drawStrawberrySeed() {
    const g = this.graphics!;
    
    // 草莓种子非常小（埋在土里）
    g.fillColor = new Color(80, 60, 40);
    g.circle(0, -12, 3);
    g.fill();
  }
  
  /**
   * 草莓发芽（带根系）
   */
  private drawStrawberrySprout(progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 先画根系
    const rootDepth = 15 + (progress - 0.03) * 100;
    const rootSpread = 12 + (progress - 0.03) * 80;
    this.drawRoots(rootDepth, rootSpread, 2);
    
    const height = 8 + (progress - 0.03) * 150;
    const droop = wiltLevel * height * 0.15;
    
    // 细茎
    g.strokeColor = this.stemColor;
    g.lineWidth = 2;
    g.moveTo(0, 0);
    g.lineTo(droop, height);
    g.stroke();
    
    // 子叶（圆形小叶）
    if (progress > 0.05) {
      const leafSize = 6 + (progress - 0.05) * 100;
      g.fillColor = this.strawberryLeafColor;
      g.circle(-leafSize * 0.8, height, leafSize * 0.5);
      g.fill();
      g.circle(leafSize * 0.8, height, leafSize * 0.5);
      g.fill();
    }
  }
  
  /**
   * 草莓展叶（锯齿状三叶）
   */
  private drawStrawberryLeavesCore(plant: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const leafProgress = (progress - 0.10) / 0.15;  // 0~1 in this stage
    const centerHeight = 15 + leafProgress * 20;
    
    // 中央短茎
    g.strokeColor = this.stemColor;
    g.lineWidth = 3;
    g.moveTo(0, 0);
    g.lineTo(0, centerHeight * 0.3);
    g.stroke();
    
    // 三出复叶（草莓特征）
    const leafCount = Math.floor(1 + leafProgress * 3);
    for (let i = 0; i < leafCount; i++) {
      const angle = (i - (leafCount - 1) / 2) * 40 * Math.PI / 180;
      const leafSize = 15 + leafProgress * 15;
      const droop = wiltLevel * 10;
      
      this.drawStrawberryTrifoliate(0, centerHeight * 0.3, leafSize, angle, wiltLevel);
    }
  }
  
  /**
   * 画草莓三出复叶
   */
  private drawStrawberryTrifoliate(x: number, y: number, size: number, baseAngle: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const droop = wiltLevel * 15;
    
    // 叶柄
    const stalkLength = size * 0.8;
    const stalkEndX = x + Math.sin(baseAngle) * stalkLength;
    const stalkEndY = y + Math.cos(baseAngle) * stalkLength - droop * 0.5;
    
    g.strokeColor = this.stemColor;
    g.lineWidth = 2;
    g.moveTo(x, y);
    g.lineTo(stalkEndX, stalkEndY);
    g.stroke();
    
    // 三片小叶（锯齿用椭圆简化）
    g.fillColor = this.strawberryLeafColor;
    
    // 中间叶
    g.ellipse(stalkEndX, stalkEndY + size * 0.4 - droop, size * 0.35, size * 0.5);
    g.fill();
    
    // 左叶
    g.ellipse(stalkEndX - size * 0.35, stalkEndY + size * 0.25 - droop, size * 0.28, size * 0.4);
    g.fill();
    
    // 右叶
    g.ellipse(stalkEndX + size * 0.35, stalkEndY + size * 0.25 - droop, size * 0.28, size * 0.4);
    g.fill();
    
    // 叶脉（简化）
    g.strokeColor = new Color(30, 100, 30);
    g.lineWidth = 1;
    g.moveTo(stalkEndX, stalkEndY);
    g.lineTo(stalkEndX, stalkEndY + size * 0.35 - droop);
    g.stroke();
  }
  
  /**
   * 草莓匍匐茎期
   */
  private drawStrawberryRunner(plant: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 画主体叶子（独立调用，不嵌套）
    this.drawStrawberryLeavesCore(plant, 0.25, wiltLevel);
    
    // 画匍匐茎部分
    this.drawStrawberryRunnerCore(progress, wiltLevel);
  }
  
  /**
   * 匍匐茎核心绘制（不含叶子）
   */
  private drawStrawberryRunnerCore(progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const runnerProgress = Math.max(0, (progress - 0.25) / 0.20);  // 0~1
    if (runnerProgress <= 0) return;
    
    // 匍匐茎（向两侧延伸）
    g.strokeColor = this.stemColor;
    g.lineWidth = 2;
    
    const runnerLength = 30 + runnerProgress * 50;
    
    // 左侧匍匐茎
    g.moveTo(-5, 5);
    g.quadraticCurveTo(-runnerLength * 0.5, 3, -runnerLength, 5);
    g.stroke();
    
    // 匍匐茎末端的小苗
    if (runnerProgress > 0.5) {
      g.fillColor = this.strawberryLeafColor;
      g.circle(-runnerLength, 10, 5);
      g.fill();
      g.circle(-runnerLength + 4, 12, 4);
      g.fill();
    }
    
    // 右侧匍匐茎
    if (runnerProgress > 0.3) {
      const rightLength = runnerLength * 0.7;
      g.moveTo(5, 5);
      g.quadraticCurveTo(rightLength * 0.5, 2, rightLength, 4);
      g.stroke();
      
      if (runnerProgress > 0.7) {
        g.fillColor = this.strawberryLeafColor;
        g.circle(rightLength, 9, 4);
        g.fill();
      }
    }
  }
  
  /**
   * 草莓开花期
   */
  private drawStrawberryBloom(plant: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 独立绘制各部分，不嵌套
    this.drawStrawberryLeavesCore(plant, 0.25, wiltLevel);
    this.drawStrawberryRunnerCore(0.45, wiltLevel);
    this.drawStrawberryFlowersCore(progress, wiltLevel);
  }
  
  /**
   * 花朵核心绘制
   */
  private drawStrawberryFlowersCore(progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const bloomProgress = Math.max(0, (progress - 0.45) / 0.20);  // 0~1
    if (bloomProgress <= 0) return;
    
    // 花茎从叶丛中伸出
    const flowerCount = Math.floor(1 + bloomProgress * 3);
    
    for (let i = 0; i < flowerCount; i++) {
      const angle = (i - (flowerCount - 1) / 2) * 25;
      const stemLength = 25 + this.seededRandom(i * 17) * 15;
      const droop = wiltLevel * 10;
      
      const fx = Math.sin(angle * Math.PI / 180) * stemLength * 0.3;
      const fy = 20 + stemLength - droop;
      
      // 花茎
      g.strokeColor = this.stemColor;
      g.lineWidth = 1.5;
      g.moveTo(0, 15);
      g.lineTo(fx, fy);
      g.stroke();
      
      // 白色小花（5瓣）
      this.drawStrawberryFlower(fx, fy + 8, 8 * (1 - wiltLevel * 0.3));
    }
  }
  
  /**
   * 画草莓小白花
   */
  private drawStrawberryFlower(x: number, y: number, size: number) {
    const g = this.graphics!;
    
    // 5片白色花瓣
    g.fillColor = this.strawberryFlowerColor;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * size * 0.5;
      const py = y + Math.sin(angle) * size * 0.5;
      g.circle(px, py, size * 0.35);
      g.fill();
    }
    
    // 黄色花心
    g.fillColor = new Color(255, 220, 100);
    g.circle(x, y, size * 0.25);
    g.fill();
  }
  
  /**
   * 草莓结果期
   */
  private drawStrawberryFruit(plant: PlantData, progress: number, wiltLevel: number, isRipe: boolean) {
    const g = this.graphics!;
    
    // 独立绘制各部分，不嵌套调用
    this.drawStrawberryLeavesCore(plant, 0.25, wiltLevel);
    this.drawStrawberryRunnerCore(0.45, wiltLevel);
    // 结果期不画花，花已经变成果实了
    this.drawStrawberryFruitsCore(progress, wiltLevel, isRipe);
  }
  
  /**
   * 果实核心绘制
   */
  private drawStrawberryFruitsCore(progress: number, wiltLevel: number, isRipe: boolean) {
    const g = this.graphics!;
    
    const fruitProgress = Math.max(0, (progress - 0.65) / 0.35);  // 0~1
    if (fruitProgress <= 0) return;
    
    // 果实
    const fruitCount = Math.floor(1 + fruitProgress * 3);
    
    for (let i = 0; i < fruitCount; i++) {
      const angle = (i - (fruitCount - 1) / 2) * 30;
      const stemLength = 30 + this.seededRandom(i * 23) * 10;
      
      const fx = Math.sin(angle * Math.PI / 180) * stemLength * 0.35;
      const fy = 25 + stemLength;
      
      // 果实颜色（青→红）
      const ripeness = isRipe ? 1 : fruitProgress;
      const fruitColor = new Color(
        Math.round(150 + ripeness * 70),   // 绿→红
        Math.round(200 - ripeness * 160),  // 减绿
        Math.round(100 - ripeness * 60),   // 减蓝
        255
      );
      
      // 果实大小
      const fruitSize = 10 + fruitProgress * 8;
      
      this.drawStrawberryBerry(fx, fy, fruitSize, fruitColor, ripeness);
    }
  }
  
  /**
   * 画草莓果实（倒心形）
   */
  private drawStrawberryBerry(x: number, y: number, size: number, color: Color, ripeness: number) {
    const g = this.graphics!;
    
    // 果实（倒水滴形/心形）
    g.fillColor = color;
    
    // 用椭圆 + 三角形近似
    g.ellipse(x, y - size * 0.2, size * 0.6, size * 0.7);
    g.fill();
    
    // 顶部凹陷（用小椭圆叠加）
    g.ellipse(x, y + size * 0.3, size * 0.4, size * 0.3);
    g.fill();
    
    // 种子点（黄色小点）
    if (ripeness > 0.3) {
      g.fillColor = this.strawberrySeedColor;
      const seedCount = Math.floor(5 + ripeness * 5);
      for (let i = 0; i < seedCount; i++) {
        const sa = this.seededRandom(i * 13) * Math.PI * 2;
        const sr = this.seededRandom(i * 29) * size * 0.4;
        const sx = x + Math.cos(sa) * sr * 0.8;
        const sy = y - size * 0.1 + Math.sin(sa) * sr;
        g.circle(sx, sy, 1.5);
        g.fill();
      }
    }
    
    // 萼片（绿色小叶）
    g.fillColor = new Color(60, 140, 50);
    for (let i = 0; i < 5; i++) {
      const la = (i / 5) * Math.PI - Math.PI / 2;
      const lx = x + Math.cos(la) * size * 0.3;
      const ly = y + size * 0.5;
      g.ellipse(lx, ly + 3, 3, 5);
      g.fill();
    }
  }
  
  /**
   * 死亡的草莓
   */
  private drawDeadStrawberry(plant: PlantData, progress: number) {
    const g = this.graphics!;
    
    // 枯萎倒伏的叶子
    g.fillColor = new Color(100, 80, 50);
    
    // 几片枯叶趴在地上
    g.ellipse(-15, 3, 12, 6);
    g.fill();
    g.ellipse(10, 5, 10, 5);
    g.fill();
    g.ellipse(0, 8, 8, 4);
    g.fill();
    
    // 枯萎的匍匐茎
    g.strokeColor = new Color(80, 60, 40);
    g.lineWidth = 1.5;
    g.moveTo(-5, 3);
    g.lineTo(-35, 2);
    g.stroke();
    
    // 腐烂的果实（如果有）
    if (progress > 0.65) {
      g.fillColor = new Color(80, 40, 30);
      g.ellipse(5, 12, 6, 7);
      g.fill();
    }
  }
  
  // ==================== 樱花 ====================
  
  // 樱花专用颜色
  private sakuraBarkColor = new Color(90, 60, 50);         // 树皮棕
  private sakuraBranchColor = new Color(70, 50, 40);       // 枝条深棕
  private sakuraPetalColor = new Color(255, 183, 197);     // 花瓣粉
  private sakuraPetalLightColor = new Color(255, 220, 230);// 花瓣浅粉
  private sakuraBudColor = new Color(200, 100, 120);       // 花苞红
  private sakuraLeafColor = new Color(80, 150, 80);        // 叶子绿
  
  /**
   * 渲染樱花
   */
  private renderSakura(plant: PlantData, wiltLevel: number, isDead: boolean) {
    const progress = plant.growthProgress;
    
    this.updateSakuraColors(wiltLevel, isDead);
    
    if (isDead) {
      this.drawDeadSakura(plant, progress);
    } else if (progress < 0.02) {
      // 种子期（樱桃核）
      this.drawSakuraSeed();
    } else if (progress < 0.05) {
      // 发芽期
      this.drawSakuraSprout(progress, wiltLevel);
    } else if (progress < 0.15) {
      // 幼苗期
      this.drawSakuraSeedling(plant, progress, wiltLevel);
    } else if (progress < 0.35) {
      // 木质化期
      this.drawSakuraWoody(plant, progress, wiltLevel);
    } else if (progress < 0.60) {
      // 枝繁期
      this.drawSakuraBranching(plant, progress, wiltLevel);
    } else if (progress < 0.80) {
      // 花苞期（需要春化）
      const canBloom = plant.canBloom !== false;  // 默认允许
      this.drawSakuraBuds(plant, progress, wiltLevel, canBloom);
    } else {
      // 盛开/落樱期
      const isFalling = progress >= 1.0;
      this.drawSakuraBloom(plant, progress, wiltLevel, isFalling);
    }
  }
  
  /**
   * 樱花颜色更新
   */
  private updateSakuraColors(wiltLevel: number, isDead: boolean) {
    if (isDead) {
      this.sakuraBarkColor = new Color(60, 40, 30);
      this.sakuraBranchColor = new Color(50, 35, 25);
      this.sakuraPetalColor = new Color(150, 120, 110);
      this.sakuraLeafColor = new Color(100, 80, 50);
    } else if (wiltLevel > 0.5) {
      const wf = (wiltLevel - 0.5) * 2;
      this.sakuraLeafColor = new Color(
        80 + Math.round(40 * wf),
        150 - Math.round(60 * wf),
        80 - Math.round(30 * wf)
      );
      this.sakuraPetalColor = new Color(
        255 - Math.round(50 * wf),
        183 - Math.round(50 * wf),
        197 - Math.round(60 * wf)
      );
    } else {
      this.sakuraBarkColor = new Color(90, 60, 50);
      this.sakuraBranchColor = new Color(70, 50, 40);
      this.sakuraPetalColor = new Color(255, 183, 197);
      this.sakuraLeafColor = new Color(80, 150, 80);
    }
  }
  
  /**
   * 樱花种子（樱桃核）
   */
  private drawSakuraSeed() {
    const g = this.graphics!;
    
    // 樱桃核（埋在土里）
    g.fillColor = new Color(120, 80, 60);
    g.ellipse(0, -15, 8, 6);
    g.fill();
    
    // 纹理线
    g.strokeColor = new Color(80, 50, 35);
    g.lineWidth = 1;
    g.moveTo(-3, -17);
    g.lineTo(3, -13);
    g.stroke();
  }
  
  /**
   * 樱花发芽（带根系）
   */
  private drawSakuraSprout(progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 先画根系
    const rootDepth = 20 + (progress - 0.02) * 200;
    const rootSpread = 15 + (progress - 0.02) * 120;
    this.drawRoots(rootDepth, rootSpread, 2);
    
    const height = 5 + (progress - 0.02) * 300;
    const droop = wiltLevel * height * 0.1;
    
    // 细嫩茎
    g.strokeColor = new Color(100, 160, 100);
    g.lineWidth = 2;
    g.moveTo(0, 0);
    g.lineTo(droop, height);
    g.stroke();
    
    // 子叶
    if (progress > 0.03) {
      const leafSize = 5 + (progress - 0.03) * 200;
      g.fillColor = new Color(120, 180, 120);
      g.ellipse(-leafSize * 0.7, height, leafSize * 0.5, leafSize * 0.3);
      g.fill();
      g.ellipse(leafSize * 0.7, height, leafSize * 0.5, leafSize * 0.3);
      g.fill();
    }
  }
  
  /**
   * 樱花幼苗（带根系）
   */
  private drawSakuraSeedling(plant: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    // 先画根系
    const rootDepth = 30 + (progress - 0.05) * 300;
    const rootSpread = 25 + (progress - 0.05) * 200;
    this.drawRoots(rootDepth, rootSpread, 3);
    
    const seedlingProgress = (progress - 0.05) / 0.10;
    const height = 15 + seedlingProgress * 40;
    const droop = wiltLevel * 8;
    
    // 开始木质化的茎
    g.strokeColor = new Color(100 - seedlingProgress * 20, 140 - seedlingProgress * 60, 90 - seedlingProgress * 30);
    g.lineWidth = 3 + seedlingProgress * 2;
    g.moveTo(0, 0);
    g.lineTo(droop * 0.3, height);
    g.stroke();
    
    // 几片叶子
    const leafCount = Math.floor(2 + seedlingProgress * 4);
    for (let i = 0; i < leafCount; i++) {
      const t = (i + 1) / (leafCount + 1);
      const ly = height * t;
      const lx = droop * 0.3 * t;
      const side = i % 2 === 0 ? -1 : 1;
      const leafSize = 8 + seedlingProgress * 10;
      const leafDroop = wiltLevel * 5;
      
      g.fillColor = this.sakuraLeafColor;
      g.ellipse(lx + side * leafSize * 0.8, ly - leafDroop, leafSize * 0.5, leafSize * 0.3);
      g.fill();
    }
  }
  
  /**
   * 樱花木质化期
   */
  private drawSakuraWoody(plant: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const woodyProgress = (progress - 0.15) / 0.20;
    const trunkHeight = 60 + woodyProgress * 60;
    const trunkWidth = 6 + woodyProgress * 4;
    
    // 树干
    g.strokeColor = this.sakuraBarkColor;
    g.lineWidth = trunkWidth;
    g.lineCap = Graphics.LineCap.ROUND;
    g.moveTo(0, 0);
    g.lineTo(0, trunkHeight);
    g.stroke();
    
    // 小分枝开始出现
    const branchCount = Math.floor(woodyProgress * 4);
    for (let i = 0; i < branchCount; i++) {
      const t = 0.5 + (i / branchCount) * 0.4;
      const by = trunkHeight * t;
      const side = i % 2 === 0 ? -1 : 1;
      const branchLen = 15 + this.seededRandom(i * 17) * 20;
      const angle = side * (30 + this.seededRandom(i * 23) * 20) * Math.PI / 180;
      
      g.strokeColor = this.sakuraBranchColor;
      g.lineWidth = 3;
      g.moveTo(0, by);
      g.lineTo(Math.sin(angle) * branchLen, by + Math.cos(angle) * branchLen * 0.5);
      g.stroke();
      
      // 枝上的叶子
      const leafX = Math.sin(angle) * branchLen * 0.8;
      const leafY = by + Math.cos(angle) * branchLen * 0.4;
      g.fillColor = this.sakuraLeafColor;
      g.ellipse(leafX, leafY, 8, 5);
      g.fill();
    }
    
    // 顶部叶簇
    g.fillColor = this.sakuraLeafColor;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI / 2;
      const lx = Math.cos(angle) * 12;
      const ly = trunkHeight + 5 + Math.sin(angle) * 8;
      g.ellipse(lx, ly, 10, 6);
      g.fill();
    }
  }
  
  /**
   * 樱花枝繁期（树形成型）
   */
  private drawSakuraBranching(plant: PlantData, progress: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const branchProgress = (progress - 0.35) / 0.25;
    const trunkHeight = 120 + branchProgress * 40;
    const trunkWidth = 10 + branchProgress * 4;
    
    // 树干
    g.strokeColor = this.sakuraBarkColor;
    g.lineWidth = trunkWidth;
    g.lineCap = Graphics.LineCap.ROUND;
    g.moveTo(0, 0);
    g.quadraticCurveTo(2, trunkHeight * 0.5, 0, trunkHeight);
    g.stroke();
    
    // 主分枝
    this.drawSakuraBranches(0, trunkHeight, branchProgress, wiltLevel, false, false);
  }
  
  /**
   * 画樱花成熟树干（花苞期/盛开期/落樱期共用）
   */
  private drawSakuraMatureTrunk(): number {
    const g = this.graphics!;
    const trunkHeight = 160;
    const trunkWidth = 14;
    
    g.strokeColor = this.sakuraBarkColor;
    g.lineWidth = trunkWidth;
    g.lineCap = Graphics.LineCap.ROUND;
    g.moveTo(0, 0);
    g.quadraticCurveTo(3, trunkHeight * 0.5, 0, trunkHeight);
    g.stroke();
    
    return trunkHeight;
  }
  
  /**
   * 樱花花苞期
   */
  private drawSakuraBuds(plant: PlantData, progress: number, wiltLevel: number, canBloom: boolean) {
    const budProgress = (progress - 0.60) / 0.20;
    
    // 画树干
    const trunkHeight = this.drawSakuraMatureTrunk();
    
    // 分枝 + 花苞
    this.drawSakuraBranches(0, trunkHeight, 1, wiltLevel, canBloom, false);
    
    // 如果可以开花，画花苞
    if (canBloom) {
      this.drawSakuraFlowerBuds(0, trunkHeight, budProgress);
    }
  }
  
  /**
   * 樱花盛开/落樱期
   */
  private drawSakuraBloom(plant: PlantData, progress: number, wiltLevel: number, isFalling: boolean) {
    // 画树干
    const trunkHeight = this.drawSakuraMatureTrunk();
    
    // 分枝
    this.drawSakuraBranches(0, trunkHeight, 1, wiltLevel, true, true);
    
    // 满树樱花
    this.drawSakuraFlowers(0, trunkHeight, isFalling ? 0.5 : 1, wiltLevel);
    
    // 落樱效果
    if (isFalling) {
      this.drawFallingPetals();
    }
  }
  
  /**
   * 画樱花分枝
   */
  private drawSakuraBranches(x: number, y: number, progress: number, wiltLevel: number, hasBuds: boolean, hasFlowers: boolean) {
    const g = this.graphics!;
    
    const branchCount = Math.floor(4 + progress * 4);
    
    for (let i = 0; i < branchCount; i++) {
      const t = 0.4 + (i / branchCount) * 0.5;
      const by = y * t;
      const side = i % 2 === 0 ? -1 : 1;
      const branchLen = 30 + this.seededRandom(i * 19) * 40 * progress;
      const angle = side * (35 + this.seededRandom(i * 31) * 25) * Math.PI / 180;
      
      const endX = x + Math.sin(angle) * branchLen;
      const endY = by + Math.cos(angle) * branchLen * 0.3;
      
      // 枝条
      g.strokeColor = this.sakuraBranchColor;
      g.lineWidth = 4 - i * 0.3;
      g.moveTo(x, by);
      g.quadraticCurveTo(
        x + Math.sin(angle) * branchLen * 0.5,
        by + Math.cos(angle) * branchLen * 0.15,
        endX, endY
      );
      g.stroke();
      
      // 小分枝
      if (progress > 0.5) {
        const subLen = branchLen * 0.4;
        const subAngle = angle + side * 0.3;
        g.lineWidth = 2;
        g.moveTo(endX * 0.7, by + (endY - by) * 0.7);
        g.lineTo(
          endX * 0.7 + Math.sin(subAngle) * subLen,
          by + (endY - by) * 0.7 + Math.cos(subAngle) * subLen * 0.2
        );
        g.stroke();
      }
    }
    
    // 树冠（叶簇）
    if (!hasFlowers) {
      g.fillColor = this.sakuraLeafColor;
      const crownSize = 40 + progress * 30;
      g.ellipse(x, y + crownSize * 0.3, crownSize, crownSize * 0.7);
      g.fill();
    }
  }
  
  /**
   * 画花苞
   */
  private drawSakuraFlowerBuds(x: number, y: number, progress: number) {
    const g = this.graphics!;
    
    const budCount = Math.floor(10 + progress * 20);
    
    g.fillColor = this.sakuraBudColor;
    
    for (let i = 0; i < budCount; i++) {
      const angle = this.seededRandom(i * 13) * Math.PI * 2;
      const r = 20 + this.seededRandom(i * 29) * 50;
      const bx = x + Math.cos(angle) * r * 0.8;
      const by = y + 20 + Math.sin(angle) * r * 0.4;
      const budSize = 3 + progress * 3;
      
      g.ellipse(bx, by, budSize, budSize * 1.3);
      g.fill();
    }
  }
  
  /**
   * 画满树樱花
   */
  private drawSakuraFlowers(x: number, y: number, density: number, wiltLevel: number) {
    const g = this.graphics!;
    
    const flowerCount = Math.floor(30 * density);
    
    for (let i = 0; i < flowerCount; i++) {
      const angle = this.seededRandom(i * 17) * Math.PI * 2;
      const r = 15 + this.seededRandom(i * 31) * 60;
      const fx = x + Math.cos(angle) * r * 0.9;
      const fy = y + 25 + Math.sin(angle) * r * 0.5;
      const size = 6 + this.seededRandom(i * 41) * 4;
      
      this.drawSakuraFlower(fx, fy, size * (1 - wiltLevel * 0.3));
    }
  }
  
  /**
   * 画单朵樱花（5瓣）
   */
  private drawSakuraFlower(x: number, y: number, size: number) {
    const g = this.graphics!;
    
    // 5片花瓣（粉色，有缺口）
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * size * 0.5;
      const py = y + Math.sin(angle) * size * 0.5;
      
      // 花瓣用椭圆
      g.fillColor = i % 2 === 0 ? this.sakuraPetalColor : this.sakuraPetalLightColor;
      g.ellipse(px, py, size * 0.4, size * 0.55);
      g.fill();
    }
    
    // 花心（黄色）
    g.fillColor = new Color(255, 230, 150);
    g.circle(x, y, size * 0.15);
    g.fill();
  }
  
  /**
   * 画飘落的花瓣（动态效果）
   */
  private drawFallingPetals() {
    const g = this.graphics!;
    
    const petalCount = 15;
    const fallSpeed = 30;  // 下落速度
    const swaySpeed = 2;   // 摇摆速度
    const swayAmount = 20; // 摇摆幅度
    
    for (let i = 0; i < petalCount; i++) {
      // 每片花瓣有不同的初始位置和相位
      const initX = -80 + this.seededRandom(i * 23) * 160;
      const initY = 180 + this.seededRandom(i * 37) * 60;  // 从树冠开始
      const phase = this.seededRandom(i * 43) * Math.PI * 2;
      const fallOffset = this.seededRandom(i * 51) * 100;  // 下落偏移，错开时间
      
      // 根据时间计算位置（循环下落）
      const cycleTime = (this.animTime + fallOffset / fallSpeed) % 6;  // 6秒一个周期
      const py = initY - cycleTime * fallSpeed;
      
      // 左右摇摆
      const sway = Math.sin(this.animTime * swaySpeed + phase) * swayAmount;
      const px = initX + sway;
      
      // 旋转效果
      const rotation = this.animTime * 1.5 + phase;
      
      // 只画在可见范围内的花瓣
      if (py > -20 && py < 200) {
        // 用旋转的椭圆（通过调整宽高比模拟旋转）
        const rotFactor = Math.abs(Math.cos(rotation));
        const petalW = 3 + rotFactor * 3;
        const petalH = 6 - rotFactor * 2;
        
        g.fillColor = i % 2 === 0 ? this.sakuraPetalColor : this.sakuraPetalLightColor;
        g.ellipse(px, py, petalW, petalH);
        g.fill();
      }
    }
  }
  
  /**
   * 死亡的樱花
   */
  private drawDeadSakura(plant: PlantData, progress: number) {
    const g = this.graphics!;
    
    // 枯死的树
    const trunkHeight = Math.min(progress * 500, 140);
    
    // 枯树干
    g.strokeColor = new Color(60, 40, 30);
    g.lineWidth = 10;
    g.lineCap = Graphics.LineCap.ROUND;
    g.moveTo(0, 0);
    g.quadraticCurveTo(5, trunkHeight * 0.5, 3, trunkHeight);
    g.stroke();
    
    // 枯枝
    g.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const t = 0.5 + i * 0.12;
      const by = trunkHeight * t;
      const side = i % 2 === 0 ? -1 : 1;
      const branchLen = 20 + this.seededRandom(i * 19) * 25;
      const angle = side * (40 + i * 5) * Math.PI / 180;
      
      g.moveTo(3 * t, by);
      g.lineTo(
        3 * t + Math.sin(angle) * branchLen,
        by + Math.cos(angle) * branchLen * 0.2 - 5  // 下垂
      );
      g.stroke();
    }
    
    // 地上的落叶/花瓣
    g.fillColor = new Color(120, 90, 70);
    for (let i = 0; i < 6; i++) {
      const lx = -30 + this.seededRandom(i * 11) * 60;
      const ly = -5 + this.seededRandom(i * 17) * 10;
      g.ellipse(lx, ly, 5, 3);
      g.fill();
    }
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
