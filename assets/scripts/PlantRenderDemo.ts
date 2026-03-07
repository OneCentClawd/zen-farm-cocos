/**
 * 植物渲染效果预览场景
 * 把这个脚本挂到 Canvas 下的空节点上即可预览
 */

import { _decorator, Component, Graphics, Color, Node, UITransform, Label, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('PlantRenderDemo')
export class PlantRenderDemo extends Component {
  
  start() {
    this.setupDemo();
  }
  
  setupDemo() {
    const screenSize = view.getVisibleSize();
    const halfW = screenSize.width / 2;
    const halfH = screenSize.height / 2;
    
    // 创建背景
    this.createBackground(screenSize.width, screenSize.height);
    
    // 创建标题
    this.createLabel('方案一：程序化生成植物', 0, halfH - 50, 36);
    this.createLabel('根据数据动态绘制 - 每棵都独一无二', 0, halfH - 100, 24);
    
    // 创建植物展示区
    const plantNode = new Node('Plants');
    plantNode.layer = this.node.layer;
    plantNode.setParent(this.node);
    plantNode.setPosition(0, -50, 0);
    
    const transform = plantNode.addComponent(UITransform);
    transform.setContentSize(screenSize.width, screenSize.height);
    
    const graphics = plantNode.addComponent(Graphics);
    
    // 画4棵不同状态的植物
    this.drawPlantDemo(graphics, -180, -100, '健康茂盛', {
      height: 0.85, thickness: 0.8, leafCount: 12, tiltAngle: 0,
      leafSize: 0.9, hasFlower: true, flowerSize: 0.8, healthColor: 1.0
    });
    
    this.drawPlantDemo(graphics, -60, -100, '徒长瘦弱', {
      height: 0.95, thickness: 0.25, leafCount: 4, tiltAngle: 8,
      leafSize: 0.4, hasFlower: false, flowerSize: 0, healthColor: 0.6
    });
    
    this.drawPlantDemo(graphics, 60, -100, '矮壮健康', {
      height: 0.45, thickness: 0.95, leafCount: 16, tiltAngle: 0,
      leafSize: 1.0, hasFlower: true, flowerSize: 1.0, healthColor: 1.0
    });
    
    this.drawPlantDemo(graphics, 180, -100, '风吹倾斜', {
      height: 0.7, thickness: 0.5, leafCount: 7, tiltAngle: 28,
      leafSize: 0.6, hasFlower: false, flowerSize: 0, healthColor: 0.8
    });
    
    // 画说明
    this.createLabel('阳光不足→徒长 | 阳光充足→矮壮 | 大风→倾斜', 0, -halfH + 120, 22);
    this.createLabel('高度/粗度/叶数/斜度/健康度 全部可调', 0, -halfH + 80, 22);
  }
  
  createBackground(width: number, height: number) {
    const bgNode = new Node('Background');
    bgNode.layer = this.node.layer;
    bgNode.setParent(this.node);
    bgNode.setSiblingIndex(0);
    
    const transform = bgNode.addComponent(UITransform);
    transform.setContentSize(width, height);
    
    const graphics = bgNode.addComponent(Graphics);
    const halfW = width / 2;
    const halfH = height / 2;
    
    // 天空
    graphics.fillColor = new Color(135, 180, 220, 255);
    graphics.rect(-halfW, 0, width, halfH);
    graphics.fill();
    
    // 土地
    graphics.fillColor = new Color(120, 85, 50, 255);
    graphics.rect(-halfW, -halfH, width, halfH);
    graphics.fill();
  }
  
  createLabel(text: string, x: number, y: number, size: number) {
    const node = new Node('Label');
    node.layer = this.node.layer;
    node.setParent(this.node);
    node.setPosition(x, y, 0);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(600, size + 10);
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    
    return label;
  }
  
  /**
   * 画一棵带标签的植物
   */
  drawPlantDemo(graphics: Graphics, x: number, y: number, label: string, data: any) {
    // 画泥土底座
    graphics.fillColor = new Color(100, 70, 40, 255);
    graphics.ellipse(x, y - 10, 50, 20);
    graphics.fill();
    
    // 画植物
    this.drawPlant(graphics, x, y, data);
    
    // 画标签
    this.createLabel(label, x, y - 60, 20);
  }
  
  /**
   * 画一棵植物
   */
  drawPlant(graphics: Graphics, x: number, y: number, data: any) {
    const maxHeight = 250;
    const maxThickness = 12;
    const maxLeafSize = 35;
    const maxFlowerSize = 40;
    
    const height = data.height * maxHeight;
    const thickness = Math.max(2, data.thickness * maxThickness);
    const tiltRad = (data.tiltAngle * Math.PI) / 180;
    
    const topX = x + Math.sin(tiltRad) * height;
    const topY = y + Math.cos(tiltRad) * height;
    
    // 茎颜色（根据健康度）
    const stemR = Math.round(60 + (1 - data.healthColor) * 80);
    const stemG = Math.round(130 - (1 - data.healthColor) * 50);
    const stemB = Math.round(40 - (1 - data.healthColor) * 20);
    const stemColor = new Color(stemR, stemG, stemB, 255);
    
    // 画茎
    graphics.strokeColor = stemColor;
    graphics.lineWidth = thickness;
    graphics.lineCap = Graphics.LineCap.ROUND;
    
    const midY = (y + topY) / 2;
    const bendX = (x + topX) / 2;
    
    graphics.moveTo(x, y);
    graphics.bezierCurveTo(x, y + height * 0.3, bendX, midY, topX, topY);
    graphics.stroke();
    
    // 叶子颜色
    const leafR = Math.round(50 + (1 - data.healthColor) * 100);
    const leafG = Math.round(160 - (1 - data.healthColor) * 80);
    const leafB = Math.round(50 - (1 - data.healthColor) * 30);
    const leafColor = new Color(leafR, leafG, leafB, 255);
    
    // 画叶子
    const leafSize = data.leafSize * maxLeafSize;
    for (let i = 0; i < data.leafCount; i++) {
      const t = 0.15 + (i / data.leafCount) * 0.75;
      const leafX = x + (topX - x) * t;
      const leafY = y + height * t;
      const side = i % 2 === 0 ? 1 : -1;
      const angle = side * (35 + (Math.random() - 0.5) * 20);
      const sizeFactor = 0.5 + 0.5 * Math.sin(t * Math.PI);
      
      this.drawLeaf(graphics, leafX, leafY, leafSize * sizeFactor, angle, leafColor);
    }
    
    // 画花
    if (data.hasFlower) {
      const flowerSize = data.flowerSize * maxFlowerSize;
      this.drawFlower(graphics, topX, topY, flowerSize);
    }
  }
  
  drawLeaf(graphics: Graphics, x: number, y: number, size: number, angle: number, color: Color) {
    const rad = (angle * Math.PI) / 180;
    const endX = x + Math.cos(rad) * size;
    const endY = y + Math.sin(rad) * size;
    const leafWidth = size * 0.35;
    const perpRad = rad + Math.PI / 2;
    
    graphics.fillColor = color;
    graphics.moveTo(x, y);
    graphics.bezierCurveTo(
      x + Math.cos(rad) * size * 0.4 + Math.cos(perpRad) * leafWidth,
      y + Math.sin(rad) * size * 0.4 + Math.sin(perpRad) * leafWidth,
      endX, endY, endX, endY
    );
    graphics.bezierCurveTo(
      endX, endY,
      x + Math.cos(rad) * size * 0.4 - Math.cos(perpRad) * leafWidth,
      y + Math.sin(rad) * size * 0.4 - Math.sin(perpRad) * leafWidth,
      x, y
    );
    graphics.fill();
  }
  
  drawFlower(graphics: Graphics, x: number, y: number, size: number) {
    // 花瓣
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const petalX = x + Math.cos(angle) * size * 0.35;
      const petalY = y + Math.sin(angle) * size * 0.35;
      
      graphics.fillColor = new Color(255, 220, 100, 255);
      graphics.ellipse(petalX, petalY, size * 0.35, size * 0.2);
      graphics.fill();
    }
    
    // 花心
    graphics.fillColor = new Color(255, 160, 50, 255);
    graphics.circle(x, y, size * 0.2);
    graphics.fill();
  }
}
