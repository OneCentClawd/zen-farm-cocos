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
    
    // 根据生长阶段调整颜色
    this.updateColors(traits);
    
    if (progress < 0.05) {
      // 种子期
      this.drawSeed();
    } else if (progress < 0.15) {
      // 发芽期
      this.drawSprout(progress);
    } else {
      // 生长期及以后
      this.drawFullPlant(traits, progress, stage.index >= 3);
    }
  }
  
  /**
   * 根据植物特征更新颜色
   */
  private updateColors(traits: PlantData['physicalTraits']) {
    // 根据 leafColor 值（健康度）调整颜色鲜艳度
    const health = Math.min(100, Math.max(0, traits.leafColor)) / 100;
    
    // 健康的植物更绿，不健康的偏黄
    const greenBoost = Math.round(health * 50);
    this.leafColor = new Color(60, 129 + greenBoost, 80 + greenBoost * 0.5);
    this.stemColor = new Color(76, 120 + greenBoost * 0.5, 76);
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
  private drawSprout(progress: number) {
    const g = this.graphics!;
    
    // 发芽高度随 progress 增长
    const sproutHeight = 10 + (progress - 0.05) * 300;
    
    // 小茎
    g.strokeColor = this.stemColor;
    g.lineWidth = 3;
    g.moveTo(0, 0);
    g.lineTo(0, sproutHeight);
    g.stroke();
    
    // 子叶（两片小圆叶）
    if (progress > 0.08) {
      const leafSize = 8 + (progress - 0.08) * 100;
      g.fillColor = this.leafColor;
      
      // 左子叶
      g.ellipse(-leafSize * 0.8, sproutHeight, leafSize, leafSize * 0.6);
      g.fill();
      
      // 右子叶
      g.ellipse(leafSize * 0.8, sproutHeight, leafSize, leafSize * 0.6);
      g.fill();
    }
  }
  
  /**
   * 画完整植物
   */
  private drawFullPlant(traits: PlantData['physicalTraits'], progress: number, hasFlower: boolean) {
    const g = this.graphics!;
    
    // 计算实际尺寸
    const stemHeight = traits.height * 3;  // 放大显示
    const stemWidth = Math.max(2, traits.stemWidth * 0.8);
    const leafCount = traits.leafCount;
    const tiltAngle = traits.tiltAngle * Math.PI / 180;
    
    // 画茎秆
    this.drawStem(stemHeight, stemWidth, tiltAngle);
    
    // 画叶子
    this.drawLeaves(stemHeight, leafCount, tiltAngle, progress);
    
    // 画花
    if (hasFlower) {
      this.drawFlower(stemHeight, tiltAngle);
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
      
      // 叶子方向（交替左右）
      const side = i % 2 === 0 ? -1 : 1;
      const leafAngle = side * (30 + Math.random() * 15);
      
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
  private drawFlower(stemHeight: number, tilt: number) {
    const g = this.graphics!;
    
    const flowerX = Math.sin(tilt) * stemHeight * 0.3;
    const flowerY = stemHeight + 25;
    
    // 白色三叶草花（球状）
    g.fillColor = this.flowerColor;
    
    // 用多个小圆模拟球状花序
    for (let i = 0; i < 12; i++) {
      const angle = i * 30 * Math.PI / 180;
      const r = 8;
      const px = flowerX + Math.cos(angle) * 6;
      const py = flowerY + Math.sin(angle) * 4;
      
      g.circle(px, py, 4);
      g.fill();
    }
    
    // 花心
    g.fillColor = this.flowerCenterColor;
    g.circle(flowerX, flowerY, 5);
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
}
