/**
 * 🏠 设施渲染器（Cocos 版）
 * 
 * 渲染遮雨棚和除湿器的动画效果
 */

import { _decorator, Node, Graphics, Color, UITransform, Vec3 } from 'cc';

export class FacilityRenderer {
  
  private node: Node;
  private graphics: Graphics;
  
  private animTime: number = 0;
  private fanAngle: number = 0;
  
  // 气流粒子
  private airParticles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    size: number;
  }> = [];
  
  constructor(parentNode: Node) {
    // 创建节点
    this.node = new Node('FacilityRenderer');
    this.node.layer = parentNode.layer;
    parentNode.addChild(this.node);
    
    // 添加 Graphics 组件
    const transform = this.node.addComponent(UITransform);
    transform.setContentSize(800, 600);
    
    this.graphics = this.node.addComponent(Graphics);
    this.graphics.lineWidth = 4;
  }
  
  /**
   * 更新动画
   */
  update(dt: number): void {
    this.animTime += dt;
    this.fanAngle += dt * 15;
    
    // 更新气流粒子
    this.updateAirParticles(dt);
  }
  
  /**
   * 渲染设施
   */
  render(hasShelter: boolean, hasDehumidifier: boolean, x: number, groundY: number, plantHeight: number = 150): void {
    this.graphics.clear();
    
    if (hasShelter) {
      this.renderShelter(x, groundY, plantHeight);
    }
    
    if (hasDehumidifier) {
      this.renderDehumidifier(x, groundY);
      this.renderAirParticles();
    }
  }
  
  /**
   * 渲染遮雨棚
   */
  private renderShelter(x: number, groundY: number, plantHeight: number): void {
    const g = this.graphics;
    
    // 轻微摇晃
    const sway = Math.sin(this.animTime * 1.5) * 2;
    
    const shelterWidth = 180;
    const shelterHeight = 25;
    
    // 棚顶高度 = 确保比植物高至少 40px
    const minShelterTop = groundY + plantHeight + 50;
    const shelterTopY = Math.max(minShelterTop, groundY + 120);
    
    // 支架从地面插入土里
    const poleBottomY = groundY - 15;
    const poleTopY = shelterTopY - shelterHeight;
    
    // 支架颜色
    g.strokeColor = new Color(139, 90, 43, 230);
    g.lineWidth = 5;
    
    // 左支架
    const leftPoleX = x - shelterWidth / 2 + 25;
    g.moveTo(leftPoleX, poleBottomY);
    g.lineTo(leftPoleX + sway * 0.3, poleTopY);
    g.stroke();
    
    // 右支架
    const rightPoleX = x + shelterWidth / 2 - 25;
    g.moveTo(rightPoleX, poleBottomY);
    g.lineTo(rightPoleX + sway * 0.3, poleTopY);
    g.stroke();
    
    // 棚顶（半透明塑料布效果）
    const topX = x + sway * 0.5;
    const topY = shelterTopY;
    
    // 主体
    g.fillColor = new Color(200, 220, 255, 100);
    g.moveTo(topX - shelterWidth / 2, topY - shelterHeight);
    g.quadraticCurveTo(topX, topY, topX + shelterWidth / 2, topY - shelterHeight);
    g.lineTo(topX + shelterWidth / 2 - 5, topY - shelterHeight - 5);
    g.quadraticCurveTo(topX, topY - 8, topX - shelterWidth / 2 + 5, topY - shelterHeight - 5);
    g.closePath();
    g.fill();
    
    // 高光
    g.strokeColor = new Color(255, 255, 255, 150);
    g.lineWidth = 2;
    g.moveTo(topX - shelterWidth / 2 + 15, topY - shelterHeight + 3);
    g.quadraticCurveTo(topX, topY - 5, topX + shelterWidth / 2 - 15, topY - shelterHeight + 3);
    g.stroke();
    
    // 边缘
    g.strokeColor = new Color(100, 130, 180, 180);
    g.lineWidth = 2;
    g.moveTo(topX - shelterWidth / 2, topY - shelterHeight);
    g.quadraticCurveTo(topX, topY, topX + shelterWidth / 2, topY - shelterHeight);
    g.stroke();
  }
  
  /**
   * 渲染除湿器
   */
  private renderDehumidifier(x: number, groundY: number): void {
    const g = this.graphics;
    
    const dehumX = x + 100;
    const size = 35;
    const dehumY = groundY + size * 0.4;
    
    // 机身
    g.fillColor = new Color(80, 90, 100, 230);
    g.roundRect(dehumX - size / 2, dehumY - size * 0.4, size, size * 1.2, 8);
    g.fill();
    
    // 出风口
    g.fillColor = new Color(60, 70, 80, 255);
    g.circle(dehumX, dehumY + size * 0.3, size * 0.35);
    g.fill();
    
    // 旋转风扇
    g.strokeColor = new Color(150, 160, 170, 230);
    g.lineWidth = 3;
    
    for (let i = 0; i < 4; i++) {
      const angle = this.fanAngle + i * Math.PI / 2;
      const bladeTipX = dehumX + Math.cos(angle) * size * 0.28;
      const bladeTipY = dehumY + size * 0.3 + Math.sin(angle) * size * 0.28;
      
      g.moveTo(dehumX, dehumY + size * 0.3);
      g.lineTo(bladeTipX, bladeTipY);
      g.stroke();
    }
    
    // 中心点
    g.fillColor = new Color(100, 110, 120, 255);
    g.circle(dehumX, dehumY + size * 0.3, 4);
    g.fill();
    
    // 指示灯
    const blinkAlpha = Math.floor(128 + Math.sin(this.animTime * 3) * 75);
    g.fillColor = new Color(100, 200, 150, blinkAlpha);
    g.circle(dehumX + size * 0.3, dehumY - size * 0.2, 4);
    g.fill();
    
    // 底座
    g.fillColor = new Color(60, 65, 70, 230);
    g.rect(dehumX - size / 2 - 5, dehumY - size * 0.4 - 8, size + 10, 8);
    g.fill();
    
    // 生成气流粒子
    if (Math.random() < 0.3) {
      this.airParticles.push({
        x: dehumX + (Math.random() - 0.5) * 30,
        y: dehumY + size * 0.3,
        vx: -2 - Math.random() * 2,
        vy: 0.5 - Math.random(),
        life: 1,
        size: 3 + Math.random() * 4,
      });
    }
  }
  
  /**
   * 更新气流粒子
   */
  private updateAirParticles(dt: number): void {
    for (let i = this.airParticles.length - 1; i >= 0; i--) {
      const p = this.airParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt * 1.5;
      
      if (p.life <= 0) {
        this.airParticles.splice(i, 1);
      }
    }
    
    // 限制粒子数量
    if (this.airParticles.length > 30) {
      this.airParticles.splice(0, 10);
    }
  }
  
  /**
   * 渲染气流粒子
   */
  private renderAirParticles(): void {
    const g = this.graphics;
    
    for (const p of this.airParticles) {
      const alpha = Math.floor(p.life * 100);
      g.fillColor = new Color(200, 230, 255, alpha);
      g.circle(p.x, p.y, p.size * p.life);
      g.fill();
    }
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    if (this.node) {
      this.node.destroy();
    }
  }
}
