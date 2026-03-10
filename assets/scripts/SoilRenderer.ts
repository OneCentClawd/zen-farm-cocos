/**
 * 🟫 土壤渲染器 - 根据湿度显示不同状态
 * 
 * 状态：
 * - 干燥（浅棕色，裂纹纹理）
 * - 湿润（深棕色）
 * - 积水（有水洼反光）
 */

import { 
  _decorator, Component, Node, Graphics, Color, UITransform, 
  Sprite, SpriteFrame, Vec3, view, resources, ImageAsset
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('SoilRenderer')
export class SoilRenderer extends Component {
  
  // 素材（动态加载）
  private soilDrySprite: SpriteFrame | null = null;
  private soilWetSprite: SpriteFrame | null = null;
  private soilWaterloggedSprite: SpriteFrame | null = null;
  
  // 内部状态
  private soilNode: Node | null = null;
  private soilGraphics: Graphics | null = null;
  private waterPuddleNode: Node | null = null;
  private waterGraphics: Graphics | null = null;
  
  private soilWidth: number = 0;
  private soilHeight: number = 0;
  private currentMoisture: number = 50;
  
  // 裂纹数据（用于干燥状态）
  private cracks: { x1: number; y1: number; x2: number; y2: number }[] = [];
  
  // 水波纹动画
  private rippleTime: number = 0;
  
  /**
   * 初始化土壤渲染器
   * @param parentNode 父节点
   * @param width 土壤宽度
   * @param height 土壤高度
   * @param yPosition Y 位置（通常是屏幕下部）
   */
  init(parentNode: Node, width: number, height: number, yPosition: number) {
    this.soilWidth = width;
    this.soilHeight = height;
    
    this.node.setParent(parentNode);
    this.node.layer = parentNode.layer;
    this.node.setPosition(0, yPosition, 0);
    
    let transform = this.node.getComponent(UITransform);
    if (!transform) {
      transform = this.node.addComponent(UITransform);
    }
    transform.setContentSize(width, height);
    
    // 先加载素材，再创建节点
    this.loadSprites().then(() => {
      this.createSoilLayer();
      this.createWaterPuddleLayer();
      this.generateCracks();
      this.renderSoil();
      console.log('🟫 SoilRenderer 初始化完成');
    });
  }
  
  /**
   * 动态加载土壤素材
   */
  private loadSprites(): Promise<void> {
    return new Promise((resolve) => {
      let loaded = 0;
      const total = 3;
      const checkDone = () => {
        loaded++;
        if (loaded >= total) resolve();
      };
      
      resources.load('textures/weather/soil_dry', ImageAsset, (err, imageAsset) => {
        if (!err && imageAsset) this.soilDrySprite = SpriteFrame.createWithImage(imageAsset);
        checkDone();
      });
      
      resources.load('textures/weather/soil_wet', ImageAsset, (err, imageAsset) => {
        if (!err && imageAsset) this.soilWetSprite = SpriteFrame.createWithImage(imageAsset);
        checkDone();
      });
      
      resources.load('textures/weather/soil_waterlogged', ImageAsset, (err, imageAsset) => {
        if (!err && imageAsset) this.soilWaterloggedSprite = SpriteFrame.createWithImage(imageAsset);
        checkDone();
      });
    });
  }
  
  /**
   * 创建土壤层
   */
  private createSoilLayer() {
    this.soilNode = new Node('SoilLayer');
    this.soilNode.layer = this.node.layer;
    this.soilNode.setParent(this.node);
    this.soilNode.setPosition(0, 0, 0);
    
    const transform = this.soilNode.addComponent(UITransform);
    transform.setContentSize(this.soilWidth, this.soilHeight);
    
    this.soilGraphics = this.soilNode.addComponent(Graphics);
  }
  
  /**
   * 创建水洼层（积水状态用）
   */
  private createWaterPuddleLayer() {
    this.waterPuddleNode = new Node('WaterPuddle');
    this.waterPuddleNode.layer = this.node.layer;
    this.waterPuddleNode.setParent(this.node);
    this.waterPuddleNode.setPosition(0, this.soilHeight * 0.3, 0);
    
    const transform = this.waterPuddleNode.addComponent(UITransform);
    transform.setContentSize(this.soilWidth, this.soilHeight * 0.4);
    
    this.waterGraphics = this.waterPuddleNode.addComponent(Graphics);
    this.waterPuddleNode.active = false;
  }
  
  /**
   * 生成随机裂纹（干燥时显示）
   */
  private generateCracks() {
    this.cracks = [];
    const numCracks = 8 + Math.floor(Math.random() * 5);
    const halfW = this.soilWidth / 2;
    const halfH = this.soilHeight / 2;
    
    for (let i = 0; i < numCracks; i++) {
      const x1 = -halfW * 0.8 + Math.random() * halfW * 1.6;
      const y1 = -halfH * 0.6 + Math.random() * halfH * 1.2;
      
      // 裂纹长度和方向
      const angle = Math.random() * Math.PI;
      const length = 20 + Math.random() * 40;
      
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;
      
      this.cracks.push({ x1, y1, x2, y2 });
      
      // 分支裂纹
      if (Math.random() > 0.5) {
        const branchAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5;
        const branchLen = length * 0.5;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        this.cracks.push({
          x1: midX,
          y1: midY,
          x2: midX + Math.cos(branchAngle) * branchLen,
          y2: midY + Math.sin(branchAngle) * branchLen
        });
      }
    }
  }
  
  /**
   * 更新土壤湿度显示
   * @param moisture 湿度值 0~100
   */
  updateMoisture(moisture: number) {
    this.currentMoisture = Math.max(0, Math.min(100, moisture));
    this.renderSoil();
  }
  
  /**
   * 渲染土壤
   */
  private renderSoil() {
    const moisture = this.currentMoisture;
    
    // 优先使用素材
    if (this.soilNode) {
      // 移除旧的 Sprite（如果有）
      const oldSprite = this.soilNode.getComponent(Sprite);
      if (oldSprite) {
        oldSprite.destroy();
      }
      
      // 根据湿度选择素材
      let targetSprite: SpriteFrame | null = null;
      if (moisture >= 90 && this.soilWaterloggedSprite) {
        targetSprite = this.soilWaterloggedSprite;
      } else if (moisture >= 40 && this.soilWetSprite) {
        targetSprite = this.soilWetSprite;
      } else if (this.soilDrySprite) {
        targetSprite = this.soilDrySprite;
      }
      
      if (targetSprite) {
        // 用素材渲染
        const sprite = this.soilNode.addComponent(Sprite);
        sprite.spriteFrame = targetSprite;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        // 隐藏 Graphics
        if (this.soilGraphics) {
          this.soilGraphics.clear();
        }
        
        // 积水效果
        if (moisture >= 90 && this.waterPuddleNode) {
          this.waterPuddleNode.active = true;
          this.drawWaterPuddle();
        } else if (this.waterPuddleNode) {
          this.waterPuddleNode.active = false;
        }
        return;
      }
    }
    
    // 备用：用 Graphics 绘制
    if (!this.soilGraphics) return;
    
    const g = this.soilGraphics;
    g.clear();
    
    const halfW = this.soilWidth / 2;
    const halfH = this.soilHeight / 2;
    
    // 根据湿度计算土壤颜色
    let baseColor: Color;
    
    if (moisture < 20) {
      // 干燥：浅棕色
      baseColor = new Color(180, 140, 100, 255);
    } else if (moisture < 40) {
      // 偏干：中棕色
      const t = (moisture - 20) / 20;
      baseColor = this.lerpColor(
        new Color(180, 140, 100, 255),
        new Color(140, 100, 70, 255),
        t
      );
    } else if (moisture < 70) {
      // 湿润：深棕色
      const t = (moisture - 40) / 30;
      baseColor = this.lerpColor(
        new Color(140, 100, 70, 255),
        new Color(100, 70, 50, 255),
        t
      );
    } else if (moisture < 90) {
      // 很湿：更深的棕色
      baseColor = new Color(80, 55, 40, 255);
    } else {
      // 积水：深棕带蓝
      baseColor = new Color(70, 50, 45, 255);
    }
    
    // 绘制土壤背景
    g.fillColor = baseColor;
    g.rect(-halfW, -halfH, this.soilWidth, this.soilHeight);
    g.fill();
    
    // 添加一些土壤纹理斑点
    this.drawSoilTexture(g, baseColor);
    
    // 干燥时显示裂纹
    if (moisture < 25) {
      this.drawCracks(g, moisture);
    }
    
    // 积水效果
    if (moisture >= 90 && this.waterPuddleNode) {
      this.waterPuddleNode.active = true;
      this.drawWaterPuddle();
    } else if (this.waterPuddleNode) {
      this.waterPuddleNode.active = false;
    }
  }
  
  /**
   * 绘制土壤纹理（小斑点）
   */
  private drawSoilTexture(g: Graphics, baseColor: Color) {
    const halfW = this.soilWidth / 2;
    const halfH = this.soilHeight / 2;
    
    // 随机种子保持一致
    const seed = 12345;
    
    // 深色斑点
    g.fillColor = this.darkenColor(baseColor, 20);
    for (let i = 0; i < 30; i++) {
      const x = this.seededRandom(seed + i * 3) * this.soilWidth - halfW;
      const y = this.seededRandom(seed + i * 3 + 1) * this.soilHeight - halfH;
      const r = 3 + this.seededRandom(seed + i * 3 + 2) * 6;
      g.circle(x, y, r);
      g.fill();
    }
    
    // 浅色斑点
    g.fillColor = this.lightenColor(baseColor, 15);
    for (let i = 0; i < 20; i++) {
      const x = this.seededRandom(seed + 100 + i * 3) * this.soilWidth - halfW;
      const y = this.seededRandom(seed + 100 + i * 3 + 1) * this.soilHeight - halfH;
      const r = 2 + this.seededRandom(seed + 100 + i * 3 + 2) * 4;
      g.circle(x, y, r);
      g.fill();
    }
  }
  
  /**
   * 绘制裂纹
   */
  private drawCracks(g: Graphics, moisture: number) {
    // 湿度越低裂纹越明显
    const alpha = Math.round((25 - moisture) / 25 * 180);
    g.strokeColor = new Color(60, 40, 30, alpha);
    g.lineWidth = 2;
    
    for (const crack of this.cracks) {
      g.moveTo(crack.x1, crack.y1);
      g.lineTo(crack.x2, crack.y2);
    }
    g.stroke();
  }
  
  /**
   * 绘制水洼
   */
  private drawWaterPuddle() {
    if (!this.waterGraphics) return;
    
    const g = this.waterGraphics;
    g.clear();
    
    const halfW = this.soilWidth * 0.35;
    const halfH = this.soilHeight * 0.15;
    
    // 水洼底色（半透明蓝）
    g.fillColor = new Color(100, 140, 180, 100);
    g.ellipse(0, 0, halfW, halfH);
    g.fill();
    
    // 水面反光
    g.fillColor = new Color(200, 220, 255, 80);
    g.ellipse(-halfW * 0.3, halfH * 0.2, halfW * 0.4, halfH * 0.3);
    g.fill();
    
    // 波纹效果（基于时间）
    const rippleAlpha = Math.round(50 + Math.sin(this.rippleTime * 3) * 30);
    g.strokeColor = new Color(180, 200, 230, rippleAlpha);
    g.lineWidth = 1;
    
    const rippleScale = 0.6 + Math.sin(this.rippleTime * 2) * 0.2;
    g.ellipse(0, 0, halfW * rippleScale, halfH * rippleScale);
    g.stroke();
  }
  
  /**
   * 每帧更新（水波纹动画）
   */
  update(dt: number) {
    if (this.waterPuddleNode?.active) {
      this.rippleTime += dt;
      this.drawWaterPuddle();
    }
  }
  
  // ========== 工具函数 ==========
  
  private lerpColor(a: Color, b: Color, t: number): Color {
    return new Color(
      Math.round(a.r + (b.r - a.r) * t),
      Math.round(a.g + (b.g - a.g) * t),
      Math.round(a.b + (b.b - a.b) * t),
      Math.round(a.a + (b.a - a.a) * t)
    );
  }
  
  private darkenColor(color: Color, amount: number): Color {
    return new Color(
      Math.max(0, color.r - amount),
      Math.max(0, color.g - amount),
      Math.max(0, color.b - amount),
      color.a
    );
  }
  
  private lightenColor(color: Color, amount: number): Color {
    return new Color(
      Math.min(255, color.r + amount),
      Math.min(255, color.g + amount),
      Math.min(255, color.b + amount),
      color.a
    );
  }
  
  /**
   * 伪随机数生成器（保证相同种子相同结果）
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
  
  /**
   * 获取当前湿度
   */
  getMoisture(): number {
    return this.currentMoisture;
  }
  
  /**
   * 获取土壤状态描述
   */
  getStateDescription(): string {
    const m = this.currentMoisture;
    if (m < 20) return '干燥';
    if (m < 40) return '偏干';
    if (m < 70) return '湿润';
    if (m < 90) return '很湿';
    return '积水';
  }
}
