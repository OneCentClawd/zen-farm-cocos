/**
 * 程序化植物渲染器（方案一：纯代码绘制）
 * 用 Graphics 组件绘制植物，不需要素材
 */

import { _decorator, Component, Node, Graphics, Color, UITransform, Vec2 } from 'cc';
import { PlantData, getCurrentStage } from './Plant';
const { ccclass, property } = _decorator;

@ccclass('ProceduralPlantRenderer')
export class ProceduralPlantRenderer extends Component {
  
  private graphics: Graphics | null = null;
  
  // 颜色配置
  private stemColor = new Color(76, 153, 76);      // 茎秆绿
  private leafColor = new Color(60, 179, 113);     // 叶子绿
  private leafDarkColor = new Color(34, 139, 34);  // 深绿（阴影）
  private flowerColor = new Color(255, 255, 255);  // 白色花
  private flowerCenterColor = new Color(255, 223, 186); // 花心
  
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
    
    const traits = plant.physicalTraits;
    const progress = plant.growthProgress;
    const stage = getCurrentStage(plant);
    const wiltLevel = plant.wiltLevel || 0;  // 萎蔫程度 0~1
    const isDead = plant.healthState === 3;  // HealthState.DEAD = 3
    
    // 根据生长阶段和健康状态调整颜色
    this.updateColors(traits, wiltLevel, isDead);
    
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
   * 根据植物特征更新颜色
   */
  private updateColors(traits: PlantData['physicalTraits'], wiltLevel: number = 0, isDead: boolean = false) {
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
  private drawFullPlant(traits: PlantData['physicalTraits'], progress: number, hasFlower: boolean, wiltLevel: number = 0) {
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
  private drawDeadPlant(traits: PlantData['physicalTraits'], progress: number) {
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
