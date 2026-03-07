/**
 * 植物程序化渲染器 - 方案一 Demo
 * 根据植物数据动态绘制茎、叶、花
 */

import { _decorator, Component, Graphics, Color, Vec2, Node, UITransform } from 'cc';
const { ccclass, property } = _decorator;

export interface PlantRenderData {
  height: number;       // 高度 0-1 (相对最大高度)
  thickness: number;    // 茎粗度 0-1
  leafCount: number;    // 叶子数量 0-20
  tiltAngle: number;    // 倾斜角度 -30 到 30 度
  leafSize: number;     // 叶子大小 0-1
  hasFlower: boolean;   // 是否开花
  flowerSize: number;   // 花朵大小 0-1
  healthColor: number;  // 健康度影响颜色 0-1 (1=健康绿色, 0=枯黄)
}

@ccclass('PlantRenderer')
export class PlantRenderer extends Component {
  private graphics: Graphics | null = null;
  
  // 最大尺寸
  private maxHeight = 300;
  private maxThickness = 15;
  private maxLeafSize = 40;
  private maxFlowerSize = 50;
  
  start() {
    this.graphics = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
    
    // Demo: 展示不同状态的植物
    this.drawDemoPlants();
  }
  
  /**
   * Demo: 画几棵不同状态的植物对比
   */
  drawDemoPlants() {
    if (!this.graphics) return;
    this.graphics.clear();
    
    // 植物1: 健康、高大、茂盛
    this.drawPlant(-200, -100, {
      height: 0.9,
      thickness: 0.8,
      leafCount: 12,
      tiltAngle: 0,
      leafSize: 0.9,
      hasFlower: true,
      flowerSize: 0.8,
      healthColor: 1.0,
    });
    
    // 植物2: 徒长（阳光不足）- 高但细弱
    this.drawPlant(-70, -100, {
      height: 0.95,
      thickness: 0.3,
      leafCount: 5,
      tiltAngle: 5,
      leafSize: 0.5,
      hasFlower: false,
      flowerSize: 0,
      healthColor: 0.7,
    });
    
    // 植物3: 矮壮（阳光充足）
    this.drawPlant(60, -100, {
      height: 0.5,
      thickness: 0.9,
      leafCount: 15,
      tiltAngle: 0,
      leafSize: 1.0,
      hasFlower: true,
      flowerSize: 1.0,
      healthColor: 1.0,
    });
    
    // 植物4: 风吹斜了
    this.drawPlant(190, -100, {
      height: 0.7,
      thickness: 0.6,
      leafCount: 8,
      tiltAngle: 25,
      leafSize: 0.7,
      hasFlower: false,
      flowerSize: 0,
      healthColor: 0.85,
    });
  }
  
  /**
   * 绘制一棵植物
   */
  drawPlant(x: number, y: number, data: PlantRenderData) {
    if (!this.graphics) return;
    
    const height = data.height * this.maxHeight;
    const thickness = Math.max(2, data.thickness * this.maxThickness);
    const tiltRad = (data.tiltAngle * Math.PI) / 180;
    
    // 计算茎的终点（考虑倾斜）
    const topX = x + Math.sin(tiltRad) * height;
    const topY = y + Math.cos(tiltRad) * height;
    
    // 根据健康度计算颜色
    const stemColor = this.getHealthColor(data.healthColor, 80, 140, 50);
    const leafColor = this.getHealthColor(data.healthColor, 60, 180, 60);
    
    // 画茎（用多段贝塞尔曲线模拟自然弯曲）
    this.drawStem(x, y, topX, topY, thickness, stemColor, data.tiltAngle);
    
    // 画叶子
    this.drawLeaves(x, y, topX, topY, data, leafColor);
    
    // 画花
    if (data.hasFlower && data.flowerSize > 0) {
      this.drawFlower(topX, topY, data.flowerSize * this.maxFlowerSize);
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
    
    // 用贝塞尔曲线画茎，添加自然弯曲
    const midY = (y1 + y2) / 2;
    const bendX = (x1 + x2) / 2 + tilt * 0.3;
    
    this.graphics.moveTo(x1, y1);
    this.graphics.bezierCurveTo(
      x1, y1 + (y2 - y1) * 0.3,
      bendX, midY,
      x2, y2
    );
    this.graphics.stroke();
    
    // 茎的渐变效果（下粗上细）- 画第二层
    this.graphics.lineWidth = thickness * 0.6;
    this.graphics.strokeColor = new Color(color.r + 20, color.g + 20, color.b + 10, 255);
    this.graphics.moveTo(x1, y1 + (y2 - y1) * 0.3);
    this.graphics.bezierCurveTo(
      bendX * 0.8 + x1 * 0.2, midY,
      bendX, midY + (y2 - midY) * 0.5,
      x2, y2
    );
    this.graphics.stroke();
  }
  
  /**
   * 画叶子
   */
  private drawLeaves(baseX: number, baseY: number, topX: number, topY: number, data: PlantRenderData, color: Color) {
    if (!this.graphics || data.leafCount <= 0) return;
    
    const height = topY - baseY;
    const leafSize = data.leafSize * this.maxLeafSize;
    
    // 叶子沿着茎分布
    for (let i = 0; i < data.leafCount; i++) {
      // 叶子位置：从底部 20% 到顶部 90%
      const t = 0.2 + (i / data.leafCount) * 0.7;
      const leafX = baseX + (topX - baseX) * t;
      const leafY = baseY + height * t;
      
      // 交替左右
      const side = i % 2 === 0 ? 1 : -1;
      // 叶子角度随高度变化
      const angle = side * (30 + Math.random() * 20);
      
      // 叶子大小随位置变化（中间大，两端小）
      const sizeFactor = 0.6 + 0.4 * Math.sin(t * Math.PI);
      
      this.drawLeaf(leafX, leafY, leafSize * sizeFactor, angle, color);
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
    
    // 控制点（形成叶子形状）
    const ctrlDist = leafLength * 0.5;
    const perpRad = rad + Math.PI / 2;
    
    this.graphics.fillColor = color;
    
    // 画叶子（两条贝塞尔曲线）
    this.graphics.moveTo(x, y);
    this.graphics.bezierCurveTo(
      x + Math.cos(rad) * ctrlDist + Math.cos(perpRad) * leafWidth,
      y + Math.sin(rad) * ctrlDist + Math.sin(perpRad) * leafWidth,
      endX + Math.cos(perpRad) * leafWidth * 0.3,
      endY + Math.sin(perpRad) * leafWidth * 0.3,
      endX, endY
    );
    this.graphics.bezierCurveTo(
      endX - Math.cos(perpRad) * leafWidth * 0.3,
      endY - Math.sin(perpRad) * leafWidth * 0.3,
      x + Math.cos(rad) * ctrlDist - Math.cos(perpRad) * leafWidth,
      y + Math.sin(rad) * ctrlDist - Math.sin(perpRad) * leafWidth,
      x, y
    );
    this.graphics.fill();
    
    // 叶脉
    this.graphics.strokeColor = new Color(color.r - 20, color.g + 30, color.b - 10, 200);
    this.graphics.lineWidth = 1;
    this.graphics.moveTo(x, y);
    this.graphics.lineTo(endX, endY);
    this.graphics.stroke();
  }
  
  /**
   * 画花
   */
  private drawFlower(x: number, y: number, size: number) {
    if (!this.graphics) return;
    
    const petalCount = 5;
    const petalSize = size * 0.6;
    
    // 花瓣
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
      const petalX = x + Math.cos(angle) * size * 0.3;
      const petalY = y + Math.sin(angle) * size * 0.3;
      
      this.graphics.fillColor = new Color(255, 200, 100, 255);
      this.graphics.ellipse(petalX, petalY, petalSize * 0.5, petalSize * 0.3);
      this.graphics.fill();
    }
    
    // 花心
    this.graphics.fillColor = new Color(255, 150, 50, 255);
    this.graphics.circle(x, y, size * 0.25);
    this.graphics.fill();
  }
  
  /**
   * 根据健康度计算颜色
   */
  private getHealthColor(health: number, baseR: number, baseG: number, baseB: number): Color {
    // 健康 = 绿色，不健康 = 偏黄/棕
    const r = Math.round(baseR + (1 - health) * 80);
    const g = Math.round(baseG - (1 - health) * 60);
    const b = Math.round(baseB - (1 - health) * 30);
    return new Color(r, g, b, 255);
  }
  
  /**
   * 根据植物实际数据更新渲染
   */
  updateFromPlantData(data: PlantRenderData) {
    if (!this.graphics) return;
    this.graphics.clear();
    this.drawPlant(0, -150, data);
  }
}
