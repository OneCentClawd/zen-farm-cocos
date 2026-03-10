/**
 * 🌤️ 天气渲染器 - 动态天空、天体、云和降水效果
 * 
 * 功能：
 * - 太阳/月亮根据时间移动
 * - 云层根据风速移动
 * - 雨滴粒子效果
 * - 天空渐变背景
 */

import { 
  _decorator, Component, Node, Graphics, Color, UITransform, 
  Sprite, SpriteFrame, Vec3, tween, view, resources, ImageAsset
} from 'cc';
import { WeatherData } from './Environment';

const { ccclass, property } = _decorator;

/** 云朵数据 */
interface CloudData {
  node: Node;
  x: number;           // 当前 X 位置
  y: number;           // Y 位置
  speed: number;       // 移动速度（像素/秒）
  scale: number;       // 缩放
  isRainCloud: boolean; // 是否雨云
}

/** 雨滴数据 */
interface RaindropData {
  x: number;
  y: number;
  speed: number;
  length: number;
}

@ccclass('WeatherRenderer')
export class WeatherRenderer extends Component {
  
  // 素材（需要在编辑器中拖入）
  @property(SpriteFrame)
  sunSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  moonSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  cloudWhiteSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  cloudRainSprite: SpriteFrame | null = null;
  
  // 天空背景素材
  private skyDaySprite: SpriteFrame | null = null;
  private skyNightSprite: SpriteFrame | null = null;
  private skySprite: Sprite | null = null;
  
  // 内部状态
  private skyNode: Node | null = null;
  private sunNode: Node | null = null;
  private moonNode: Node | null = null;
  private cloudsContainer: Node | null = null;
  private rainNode: Node | null = null;
  private rainGraphics: Graphics | null = null;
  
  private clouds: CloudData[] = [];
  private raindrops: RaindropData[] = [];
  
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private skyHeight: number = 0;  // 天空区域高度（上 2/3）
  
  private currentWeather: WeatherData | null = null;
  private currentHour: number = 12;  // 当前小时（支持小数，如 14.5 = 14:30）
  private lastWindSpeed: number = 0; // 上次风速（用于检测变化）
  
  /**
   * 初始化天气渲染器
   * @param parentNode 父节点（通常是 Canvas）
   * @param skyHeight 天空区域高度（像素）
   */
  init(parentNode: Node, skyHeight?: number) {
    const screenSize = view.getVisibleSize();
    this.screenWidth = screenSize.width;
    this.screenHeight = screenSize.height;
    this.skyHeight = skyHeight || this.screenHeight * 2 / 3;
    
    this.node.setParent(parentNode);
    this.node.layer = parentNode.layer;
    this.node.setPosition(0, 0, 0);
    
    // 添加 UITransform
    let transform = this.node.getComponent(UITransform);
    if (!transform) {
      transform = this.node.addComponent(UITransform);
    }
    transform.setContentSize(this.screenWidth, this.screenHeight);
    
    // 先加载素材，再创建节点
    this.loadSprites().then(() => {
      this.createSky();
      this.createCelestialBodies();
      this.createCloudsContainer();
      this.createRainLayer();
      console.log('🌤️ WeatherRenderer 初始化完成');
    });
  }
  
  /**
   * 动态加载天气素材
   */
  private loadSprites(): Promise<void> {
    return new Promise((resolve) => {
      let loaded = 0;
      const total = 6;  // 4 + 2 天空背景
      const checkDone = () => {
        loaded++;
        if (loaded >= total) resolve();
      };
      
      // 加载太阳
      resources.load('textures/weather/sun', ImageAsset, (err, imageAsset) => {
        if (err) {
          console.warn('加载 sun 失败:', err);
        } else if (imageAsset) {
          this.sunSprite = SpriteFrame.createWithImage(imageAsset);
        }
        checkDone();
      });
      
      // 加载月亮
      resources.load('textures/weather/moon_full', ImageAsset, (err, imageAsset) => {
        if (err) {
          console.warn('加载 moon 失败:', err);
        } else if (imageAsset) {
          this.moonSprite = SpriteFrame.createWithImage(imageAsset);
        }
        checkDone();
      });
      
      // 加载白云
      resources.load('textures/weather/cloud_white', ImageAsset, (err, imageAsset) => {
        if (err) {
          console.warn('加载 cloud_white 失败:', err);
        } else if (imageAsset) {
          this.cloudWhiteSprite = SpriteFrame.createWithImage(imageAsset);
        }
        checkDone();
      });
      
      // 加载雨云
      resources.load('textures/weather/cloud_rain', ImageAsset, (err, imageAsset) => {
        if (err) {
          console.warn('加载 cloud_rain 失败:', err);
        } else if (imageAsset) {
          this.cloudRainSprite = SpriteFrame.createWithImage(imageAsset);
        }
        checkDone();
      });
      
      // 加载白天天空
      resources.load('textures/weather/sky_day', ImageAsset, (err, imageAsset) => {
        if (err) {
          console.warn('加载 sky_day 失败:', err);
        } else if (imageAsset) {
          this.skyDaySprite = SpriteFrame.createWithImage(imageAsset);
        }
        checkDone();
      });
      
      // 加载夜晚天空
      resources.load('textures/weather/sky_night', ImageAsset, (err, imageAsset) => {
        if (err) {
          console.warn('加载 sky_night 失败:', err);
        } else if (imageAsset) {
          this.skyNightSprite = SpriteFrame.createWithImage(imageAsset);
        }
        checkDone();
      });
    });
  }
  
  /**
   * 创建天空背景
   */
  private createSky() {
    this.skyNode = new Node('Sky');
    this.skyNode.layer = this.node.layer;
    this.skyNode.setParent(this.node);
    
    // 天空占上 2/3，位置偏上
    const skyHeight = this.screenHeight * 2 / 3;
    this.skyNode.setPosition(0, this.screenHeight / 2 - skyHeight / 2, 0);
    
    const transform = this.skyNode.addComponent(UITransform);
    transform.setContentSize(this.screenWidth, skyHeight);
    
    // 优先用素材
    if (this.skyDaySprite || this.skyNightSprite) {
      this.skySprite = this.skyNode.addComponent(Sprite);
      this.skySprite.sizeMode = Sprite.SizeMode.CUSTOM;
      this.skySprite.spriteFrame = this.skyDaySprite;  // 默认白天
    }
    // 备用：在 updateSkyGradient 中用 Graphics 绘制
  }
  
  /**
   * 创建太阳和月亮
   */
  private createCelestialBodies() {
    // 太阳
    this.sunNode = new Node('Sun');
    this.sunNode.layer = this.node.layer;
    this.sunNode.setParent(this.node);
    
    const sunTransform = this.sunNode.addComponent(UITransform);
    sunTransform.setContentSize(250, 250);  // 太阳大一点
    
    if (this.sunSprite) {
      const sprite = this.sunNode.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;  // 先设置 sizeMode
      sprite.spriteFrame = this.sunSprite;       // 再设置 spriteFrame
    } else {
      // 没有素材时用 Graphics 画太阳
      const g = this.sunNode.addComponent(Graphics);
      this.drawSunGraphics(g, 30);
    }
    
    // 月亮
    this.moonNode = new Node('Moon');
    this.moonNode.layer = this.node.layer;
    this.moonNode.setParent(this.node);
    
    const moonTransform = this.moonNode.addComponent(UITransform);
    moonTransform.setContentSize(130, 130);  // 月亮再大一点
    
    if (this.moonSprite) {
      const sprite = this.moonNode.addComponent(Sprite);
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;  // 先设置 sizeMode
      sprite.spriteFrame = this.moonSprite;      // 再设置 spriteFrame
    } else {
      // 没有素材时用 Graphics 画月亮
      const g = this.moonNode.addComponent(Graphics);
      this.drawMoonGraphics(g, 15);  // 也调小
    }
    
    this.moonNode.active = false;  // 默认隐藏
  }
  
  /**
   * 用 Graphics 绘制太阳（备用方案）
   */
  private drawSunGraphics(g: Graphics, radius: number) {
    // 光晕
    g.fillColor = new Color(255, 200, 50, 100);
    g.circle(0, 0, radius * 1.5);
    g.fill();
    
    // 太阳本体
    g.fillColor = new Color(255, 220, 50, 255);
    g.circle(0, 0, radius);
    g.fill();
    
    // 光芒
    g.strokeColor = new Color(255, 200, 50, 200);
    g.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const innerR = radius + 5;
      const outerR = radius + 20;
      g.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      g.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    }
    g.stroke();
  }
  
  /**
   * 用 Graphics 绘制月亮（备用方案）
   */
  private drawMoonGraphics(g: Graphics, radius: number) {
    // 月亮本体（淡黄色）
    g.fillColor = new Color(255, 250, 220, 255);
    g.circle(0, 0, radius);
    g.fill();
    
    // 陨石坑（灰色斑点）
    g.fillColor = new Color(200, 200, 190, 100);
    g.circle(-radius * 0.3, radius * 0.2, radius * 0.15);
    g.fill();
    g.circle(radius * 0.25, -radius * 0.1, radius * 0.1);
    g.fill();
    g.circle(radius * 0.1, radius * 0.35, radius * 0.08);
    g.fill();
  }
  
  /**
   * 创建云层容器
   */
  private createCloudsContainer() {
    this.cloudsContainer = new Node('CloudsContainer');
    this.cloudsContainer.layer = this.node.layer;
    this.cloudsContainer.setParent(this.node);
    this.cloudsContainer.setPosition(0, 0, 0);
    
    const transform = this.cloudsContainer.addComponent(UITransform);
    transform.setContentSize(this.screenWidth, this.screenHeight);
  }
  
  /**
   * 创建雨层
   */
  private createRainLayer() {
    this.rainNode = new Node('Rain');
    this.rainNode.layer = this.node.layer;
    this.rainNode.setParent(this.node);
    this.rainNode.setPosition(0, 0, 0);
    
    const transform = this.rainNode.addComponent(UITransform);
    transform.setContentSize(this.screenWidth, this.screenHeight);
    
    this.rainGraphics = this.rainNode.addComponent(Graphics);
    this.rainNode.active = false;  // 默认隐藏
  }
  
  /**
   * 更新天气显示
   * @param weather 天气数据
   * @param hour 当前小时（支持小数，如 14.5 = 14:30），默认使用系统时间
   */
  updateWeather(weather: WeatherData, hour?: number) {
    this.currentWeather = weather;
    // 支持小数时间
    if (hour !== undefined) {
      this.currentHour = hour;
    } else {
      const now = new Date();
      this.currentHour = now.getHours() + now.getMinutes() / 60;
    }
    
    this.updateSkyGradient();
    this.updateCelestialPositions();
    this.updateClouds();
    this.updateRain();
  }
  
  /**
   * 更新天空背景
   */
  private updateSkyGradient() {
    if (!this.skyNode) return;
    
    const hour = this.currentHour;
    const isNight = hour < 6 || hour >= 19;
    
    // 优先用素材
    if (this.skySprite && (this.skyDaySprite || this.skyNightSprite)) {
      if (isNight && this.skyNightSprite) {
        this.skySprite.spriteFrame = this.skyNightSprite;
      } else if (!isNight && this.skyDaySprite) {
        this.skySprite.spriteFrame = this.skyDaySprite;
      }
      return;  // 用素材时不需要 Graphics 绘制
    }
    
    // 备用：用 Graphics 绘制渐变
    let g = this.skyNode.getComponent(Graphics);
    if (!g) {
      g = this.skyNode.addComponent(Graphics);
    }
    g.clear();
    
    const halfW = this.screenWidth / 2;
    const halfH = this.skyHeight / 2;
    
    // 根据时间计算天空颜色
    let topColor: Color;
    let bottomColor: Color;
    
    if (hour >= 6 && hour < 8) {
      // 日出：橙红渐变
      topColor = new Color(135, 180, 230, 255);
      bottomColor = new Color(255, 180, 120, 255);
    } else if (hour >= 8 && hour < 17) {
      // 白天：蓝天
      topColor = new Color(100, 150, 220, 255);
      bottomColor = new Color(160, 200, 240, 255);
    } else if (hour >= 17 && hour < 19) {
      // 日落：橙紫渐变
      topColor = new Color(100, 100, 180, 255);
      bottomColor = new Color(255, 150, 100, 255);
    } else if (hour >= 19 && hour < 21) {
      // 黄昏：深蓝紫
      topColor = new Color(40, 50, 100, 255);
      bottomColor = new Color(80, 80, 140, 255);
    } else {
      // 夜晚：深蓝黑
      topColor = new Color(15, 20, 40, 255);
      bottomColor = new Color(30, 40, 70, 255);
    }
    
    // 阴天/雨天时天空变灰
    if (this.currentWeather) {
      const sunlight = this.currentWeather.sunlight;
      if (sunlight < 0.5) {
        const grayFactor = 1 - sunlight;
        topColor = this.blendToGray(topColor, grayFactor * 0.5);
        bottomColor = this.blendToGray(bottomColor, grayFactor * 0.5);
      }
    }
    
    // 绘制渐变（分段绘制模拟渐变）
    const segments = 20;
    const segmentH = this.skyHeight / segments;
    
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const color = this.lerpColor(topColor, bottomColor, t);
      g.fillColor = color;
      g.rect(-halfW, halfH - (i + 1) * segmentH, this.screenWidth, segmentH);
      g.fill();
    }
  }
  
  /**
   * 颜色插值
   */
  private lerpColor(a: Color, b: Color, t: number): Color {
    return new Color(
      Math.round(a.r + (b.r - a.r) * t),
      Math.round(a.g + (b.g - a.g) * t),
      Math.round(a.b + (b.b - a.b) * t),
      Math.round(a.a + (b.a - a.a) * t)
    );
  }
  
  /**
   * 混合到灰色
   */
  private blendToGray(color: Color, factor: number): Color {
    const gray = Math.round((color.r + color.g + color.b) / 3);
    return new Color(
      Math.round(color.r + (gray - color.r) * factor),
      Math.round(color.g + (gray - color.g) * factor),
      Math.round(color.b + (gray - color.b) * factor),
      color.a
    );
  }
  
  /**
   * 更新太阳/月亮位置
   */
  private updateCelestialPositions() {
    if (!this.sunNode || !this.moonNode) return;
    
    const hour = this.currentHour;
    const halfW = this.screenWidth / 2;
    const topY = this.screenHeight / 2 - 40;  // 天空顶部，再高一点
    const bottomY = this.screenHeight / 6;     // 地平线在屏幕中部偏下
    
    // 太阳：6:00 升起，18:00 落下
    // 计算太阳在天空中的弧线位置
    if (hour >= 6 && hour < 18) {
      this.sunNode.active = true;
      const sunProgress = (hour - 6) / 12;  // 0~1
      
      // X: 从左到右
      const sunX = -halfW * 0.8 + sunProgress * halfW * 1.6;
      
      // Y: 抛物线轨迹
      const sunY = bottomY + Math.sin(sunProgress * Math.PI) * (topY - bottomY);
      
      this.sunNode.setPosition(sunX, sunY, 0);
    } else {
      this.sunNode.active = false;
    }
    
    // 月亮：18:00 升起，6:00 落下
    if (hour >= 18 || hour < 6) {
      this.moonNode.active = true;
      let moonProgress: number;
      if (hour >= 18) {
        moonProgress = (hour - 18) / 12;
      } else {
        moonProgress = (hour + 6) / 12;
      }
      
      const moonX = -halfW * 0.8 + moonProgress * halfW * 1.6;
      const moonY = bottomY + Math.sin(moonProgress * Math.PI) * (topY - bottomY);
      
      this.moonNode.setPosition(moonX, moonY, 0);
    } else {
      this.moonNode.active = false;
    }
  }
  
  /**
   * 更新云层
   */
  private updateClouds() {
    if (!this.cloudsContainer || !this.currentWeather) return;
    
    // 根据天气代码决定云量（数量翻倍）
    const code = this.currentWeather.weatherCode;
    let cloudCount = 0;
    let rainCloudRatio = 0;  // 雨云比例
    
    if (code === 0) {
      cloudCount = 2;  // 晴天也有几朵云
    } else if (code === 1) {
      cloudCount = 5;  // 少云
    } else if (code === 2) {
      cloudCount = 8;  // 多云
    } else if (code === 3) {
      cloudCount = 12;  // 阴天
    } else if (code >= 51 && code <= 99) {
      cloudCount = 10;  // 降水天气
      rainCloudRatio = 0.8;
    } else {
      cloudCount = 6;
    }
    
    // 清除多余的云
    while (this.clouds.length > cloudCount) {
      const cloud = this.clouds.pop()!;
      cloud.node.destroy();
    }
    
    // 添加新云
    while (this.clouds.length < cloudCount) {
      const isRain = this.seededRandom(this.clouds.length * 31 + 13) < rainCloudRatio;
      const cloud = this.createCloud(isRain, this.clouds.length);
      this.clouds.push(cloud);
    }
    
    // 仅当风速变化时更新云速度（避免随机重置）
    const windSpeed = this.currentWeather.windSpeed;
    if (Math.abs(windSpeed - this.lastWindSpeed) > 0.5) {
      const baseSpeed = 10 + windSpeed * 1.5;
      for (let i = 0; i < this.clouds.length; i++) {
        const cloud = this.clouds[i];
        // 使用确定性随机，基于云的索引
        cloud.speed = baseSpeed * (0.8 + this.seededRandom(i * 17 + 5) * 0.4);
      }
      this.lastWindSpeed = windSpeed;
    }
  }
  
  /**
   * 创建一朵云
   */
  private createCloud(isRainCloud: boolean, index: number): CloudData {
    const cloudNode = new Node('Cloud');
    cloudNode.layer = this.node.layer;
    cloudNode.setParent(this.cloudsContainer!);
    
    // 使用确定性随机，云调小
    const size = 150 + this.seededRandom(index * 23 + 7) * 100;  // 150-250
    const transform = cloudNode.addComponent(UITransform);
    transform.setContentSize(size, size * 0.6);
    
    // 随机选择云类型（两种云随机出现，更自然）
    const useRainCloudSprite = this.seededRandom(index * 31 + 13) > 0.5;
    const sprite = useRainCloudSprite ? this.cloudRainSprite : this.cloudWhiteSprite;
    if (sprite) {
      const sp = cloudNode.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      sp.spriteFrame = sprite;
    } else {
      // 备用：用 Graphics 画云
      const g = cloudNode.addComponent(Graphics);
      this.drawCloudGraphics(g, size * 0.4, useRainCloudSprite);
    }
    
    // 使用确定性随机位置
    const x = -this.screenWidth / 2 + this.seededRandom(index * 41 + 3) * this.screenWidth;
    const y = this.screenHeight / 2 - 80 - this.seededRandom(index * 53 + 11) * (this.skyHeight * 0.4);
    const scale = 0.8 + this.seededRandom(index * 67 + 19) * 0.5;  // 0.8-1.3
    
    cloudNode.setPosition(x, y, 0);
    cloudNode.setScale(scale, scale, 1);
    
    return {
      node: cloudNode,
      x,
      y,
      speed: 20,
      scale,
      isRainCloud
    };
  }
  
  /**
   * 用 Graphics 绘制云（备用方案）
   */
  private drawCloudGraphics(g: Graphics, radius: number, isRainCloud: boolean) {
    const color = isRainCloud 
      ? new Color(120, 120, 130, 220)
      : new Color(255, 255, 255, 220);
    
    g.fillColor = color;
    
    // 多个圆组成蓬松的云
    g.circle(-radius * 0.5, 0, radius * 0.7);
    g.fill();
    g.circle(radius * 0.3, 0, radius * 0.8);
    g.fill();
    g.circle(0, radius * 0.3, radius * 0.6);
    g.fill();
    g.circle(-radius * 0.2, -radius * 0.2, radius * 0.5);
    g.fill();
    
    // 雨云底部更暗
    if (isRainCloud) {
      g.fillColor = new Color(80, 80, 90, 180);
      g.ellipse(0, -radius * 0.4, radius * 1.2, radius * 0.3);
      g.fill();
    }
  }
  
  /**
   * 更新雨效果
   */
  private updateRain() {
    if (!this.rainNode || !this.rainGraphics || !this.currentWeather) return;
    
    const precipitation = this.currentWeather.precipitation;
    
    if (precipitation <= 0) {
      this.rainNode.active = false;
      this.raindrops = [];
      return;
    }
    
    this.rainNode.active = true;
    
    // 根据降水量决定雨滴数量
    const dropCount = Math.min(200, Math.round(precipitation * 20));
    
    // 初始化雨滴
    while (this.raindrops.length < dropCount) {
      this.raindrops.push(this.createRaindrop());
    }
    while (this.raindrops.length > dropCount) {
      this.raindrops.pop();
    }
  }
  
  /**
   * 创建一个雨滴
   */
  private createRaindrop(): RaindropData {
    return {
      x: -this.screenWidth / 2 + Math.random() * this.screenWidth,
      y: this.screenHeight / 2 + Math.random() * 100,
      speed: 400 + Math.random() * 300,
      length: 15 + Math.random() * 20
    };
  }
  
  /**
   * 每帧更新（移动云和雨滴）
   */
  update(dt: number) {
    this.updateCloudsMovement(dt);
    this.updateRainMovement(dt);
  }
  
  /**
   * 更新云层移动
   */
  private updateCloudsMovement(dt: number) {
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      cloud.x += cloud.speed * dt;
      
      // 超出右边界后从左边重新进入（边界要大于云的最大尺寸）
      const cloudBuffer = 200;  // 云最大约 180 * 1.3 ≈ 234，用 200 安全边距
      if (cloud.x > this.screenWidth / 2 + cloudBuffer) {
        cloud.x = -this.screenWidth / 2 - cloudBuffer;
        // 使用确定性随机（基于时间戳取模 + 索引）
        const timeSeed = Math.floor(Date.now() / 1000) % 10000;
        cloud.y = this.screenHeight / 2 - 80 - this.seededRandom(timeSeed + i * 37) * (this.skyHeight * 0.4);
      }
      
      cloud.node.setPosition(cloud.x, cloud.y, 0);
    }
  }
  
  /**
   * 更新雨滴移动
   */
  private updateRainMovement(dt: number) {
    if (!this.rainGraphics || !this.rainNode?.active) return;
    
    const g = this.rainGraphics;
    g.clear();
    
    g.strokeColor = new Color(180, 200, 220, 150);
    g.lineWidth = 1.5;
    
    const wind = this.currentWeather?.windSpeed || 0;
    const windOffset = wind * 0.3;  // 风影响雨滴倾斜
    
    for (const drop of this.raindrops) {
      // 更新位置
      drop.y -= drop.speed * dt;
      drop.x += windOffset * dt;
      
      // 超出底部后重置到顶部
      if (drop.y < -this.screenHeight / 2) {
        drop.y = this.screenHeight / 2 + Math.random() * 50;
        drop.x = -this.screenWidth / 2 + Math.random() * this.screenWidth;
      }
      
      // 绘制雨滴（斜线）
      g.moveTo(drop.x, drop.y);
      g.lineTo(drop.x + windOffset * 0.05, drop.y - drop.length);
    }
    
    g.stroke();
  }
  
  /**
   * 获取当前是否为夜晚
   */
  isNight(): boolean {
    return this.currentHour < 6 || this.currentHour >= 18;
  }
  
  /**
   * 获取当前是否在下雨
   */
  isRaining(): boolean {
    return (this.currentWeather?.precipitation || 0) > 0;
  }
  
  /**
   * 确定性伪随机数生成器（相同种子 = 相同结果）
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }
}
