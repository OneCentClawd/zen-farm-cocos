/**
 * 🎆 粒子效果管理器
 * 
 * 功能：
 * - 雨滴粒子
 * - 雪花粒子
 * - 浇水溅落粒子
 */

import { 
  _decorator, Component, Node, ParticleSystem2D, Color, Vec2, UITransform, view,
  resources, SpriteFrame, ImageAsset, Texture2D
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ParticleEffects')
export class ParticleEffects extends Component {
  
  private rainEmitter: ParticleSystem2D | null = null;
  private snowEmitter: ParticleSystem2D | null = null;
  private waterDropFrame: SpriteFrame | null = null;
  private snowflakeFrame: SpriteFrame | null = null;
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  private currentWindSpeed: number = 0;  // 当前风速 km/h
  
  /**
   * 初始化粒子系统
   */
  init(parent: Node) {
    const screenSize = view.getVisibleSize();
    this.screenWidth = screenSize.width;
    this.screenHeight = screenSize.height;
    
    this.node.setParent(parent);
    this.node.layer = parent.layer;
    
    // 加载水滴纹理
    this.loadTexture('textures/weather/water_drop', (frame) => {
      this.waterDropFrame = frame;
      console.log('💧 水滴纹理加载成功');
    });
    
    // 加载雪花纹理
    this.loadTexture('textures/weather/snowflake', (frame) => {
      this.snowflakeFrame = frame;
      console.log('❄️ 雪花纹理加载成功');
    });
    
    try {
      // 创建雨滴发射器
      this.createRainEmitter();
      
      // 创建雪花发射器
      this.createSnowEmitter();
      
      console.log(`🎆 粒子系统初始化完成: rain=${!!this.rainEmitter}, snow=${!!this.snowEmitter}`);
    } catch (e) {
      console.warn('⚠️ 粒子系统初始化失败，可能未启用 Particle System 2D 模块', e);
    }
  }
  
  /**
   * 加载纹理辅助方法
   */
  private loadTexture(path: string, callback: (frame: SpriteFrame) => void) {
    // 先尝试加载 SpriteFrame
    resources.load(path + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
      if (!err && spriteFrame) {
        callback(spriteFrame);
        return;
      }
      
      // 再尝试加载 Texture2D
      resources.load(path + '/texture', Texture2D, (err2, texture) => {
        if (!err2 && texture) {
          const frame = new SpriteFrame();
          frame.texture = texture;
          callback(frame);
          return;
        }
        
        // 最后尝试 ImageAsset
        resources.load(path, ImageAsset, (err3, imageAsset) => {
          if (!err3 && imageAsset) {
            const tex = new Texture2D();
            tex.image = imageAsset;
            const frame = new SpriteFrame();
            frame.texture = tex;
            callback(frame);
          } else {
            console.warn(`⚠️ 无法加载纹理: ${path}`, err3);
          }
        });
      });
    });
  }
  
  /**
   * 创建雨滴粒子发射器
   */
  private createRainEmitter() {
    const rainNode = new Node('RainParticles');
    rainNode.setParent(this.node);
    rainNode.layer = this.node.layer;
    rainNode.setPosition(0, this.screenHeight / 2 + 50, 0);
    
    const transform = rainNode.addComponent(UITransform);
    transform.setContentSize(this.screenWidth, 100);
    
    const emitter = rainNode.addComponent(ParticleSystem2D);
    if (!emitter) {
      console.warn('⚠️ ParticleSystem2D 组件不可用');
      return;
    }
    this.rainEmitter = emitter;
    
    // 雨滴配置（更清晰，更长寿命落到地面）
    this.rainEmitter.totalParticles = 200;
    this.rainEmitter.duration = -1;  // 持续发射
    this.rainEmitter.emissionRate = 100;
    this.rainEmitter.life = 2.0;  // 更长寿命，确保落到地面
    this.rainEmitter.lifeVar = 0.5;
    
    // 发射区域（屏幕顶部横向）
    this.rainEmitter.posVar = new Vec2(this.screenWidth / 2, 0);
    
    // 重力向下（更强）
    this.rainEmitter.gravity = new Vec2(0, -1000);
    
    // 初始速度
    this.rainEmitter.speed = 500;
    this.rainEmitter.speedVar = 150;
    
    // 发射角度（向下）
    this.rainEmitter.angle = 270;
    this.rainEmitter.angleVar = 3;
    
    // 颜色（更清晰的蓝色水滴）
    this.rainEmitter.startColor = new Color(150, 200, 255, 255);
    this.rainEmitter.endColor = new Color(100, 180, 255, 180);
    
    // 大小（稍大一点更清晰）
    this.rainEmitter.startSize = 12;
    this.rainEmitter.startSizeVar = 4;
    this.rainEmitter.endSize = 6;
    
    // 默认停止
    this.rainEmitter.resetSystem();
    rainNode.active = false;
  }
  
  /**
   * 创建雪花粒子发射器
   */
  private createSnowEmitter() {
    const snowNode = new Node('SnowParticles');
    snowNode.setParent(this.node);
    snowNode.layer = this.node.layer;
    snowNode.setPosition(0, this.screenHeight / 2 + 50, 0);
    
    const transform = snowNode.addComponent(UITransform);
    transform.setContentSize(this.screenWidth, 100);
    
    const emitter = snowNode.addComponent(ParticleSystem2D);
    if (!emitter) {
      console.warn('⚠️ ParticleSystem2D 组件不可用');
      return;
    }
    this.snowEmitter = emitter;
    
    // 雪花配置（更清晰，更长寿命）
    this.snowEmitter.totalParticles = 150;
    this.snowEmitter.duration = -1;
    this.snowEmitter.emissionRate = 40;
    this.snowEmitter.life = 6;  // 更长寿命，慢慢飘落
    this.snowEmitter.lifeVar = 2;
    
    // 发射区域
    this.snowEmitter.posVar = new Vec2(this.screenWidth / 2, 0);
    
    // 轻微重力
    this.snowEmitter.gravity = new Vec2(0, -80);
    
    // 慢速飘落
    this.snowEmitter.speed = 50;
    this.snowEmitter.speedVar = 30;
    
    // 发射角度（向下，但有摇摆）
    this.snowEmitter.angle = 270;
    this.snowEmitter.angleVar = 20;
    
    // 颜色（更清晰的白色雪花）
    this.snowEmitter.startColor = new Color(255, 255, 255, 255);
    this.snowEmitter.endColor = new Color(255, 255, 255, 100);
    
    // 大小（更大更清晰）
    this.snowEmitter.startSize = 16;
    this.snowEmitter.startSizeVar = 6;
    this.snowEmitter.endSize = 10;
    
    // 旋转
    this.snowEmitter.startSpin = 0;
    this.snowEmitter.startSpinVar = 180;
    this.snowEmitter.endSpin = 360;
    this.snowEmitter.endSpinVar = 180;
    
    // 默认停止
    this.snowEmitter.resetSystem();
    snowNode.active = false;
  }
  
  /**
   * 开始下雨
   */
  startRain(intensity: number = 1) {
    if (!this.rainEmitter) {
      console.warn('🌧️ rainEmitter 不存在');
      return;
    }
    
    // 设置水滴纹理
    if (this.waterDropFrame) {
      this.rainEmitter.spriteFrame = this.waterDropFrame;
    }
    
    console.log(`🌧️ 开始下雨，强度: ${intensity}`);
    this.rainEmitter.emissionRate = 40 + intensity * 60;  // 40-100
    this.rainEmitter.node.active = true;
    this.rainEmitter.resetSystem();
  }
  
  /**
   * 停止下雨
   */
  stopRain() {
    if (!this.rainEmitter) return;
    this.rainEmitter.stopSystem();
    this.rainEmitter.node.active = false;
  }
  
  /**
   * 开始下雪
   */
  startSnow(intensity: number = 1) {
    if (!this.snowEmitter) {
      console.warn('❄️ snowEmitter 不存在');
      return;
    }
    
    // 设置雪花纹理
    if (this.snowflakeFrame) {
      this.snowEmitter.spriteFrame = this.snowflakeFrame;
    }
    
    console.log(`❄️ 开始下雪，强度: ${intensity}`);
    this.snowEmitter.emissionRate = 15 + intensity * 25;  // 15-40
    this.snowEmitter.node.active = true;
    this.snowEmitter.resetSystem();
  }
  
  /**
   * 停止下雪
   */
  stopSnow() {
    if (!this.snowEmitter) return;
    this.snowEmitter.stopSystem();
    this.snowEmitter.node.active = false;
  }
  
  /**
   * 播放浇水溅落效果
   */
  playWaterSplash(x: number, y: number) {
    console.log(`💧 播放浇水特效 at (${x}, ${y})`);
    
    const splashNode = new Node('WaterSplash');
    splashNode.setParent(this.node);
    splashNode.layer = this.node.layer;
    splashNode.setPosition(x, y, 0);
    
    const transform = splashNode.addComponent(UITransform);
    transform.setContentSize(50, 50);
    
    const emitter = splashNode.addComponent(ParticleSystem2D);
    if (!emitter) {
      console.warn('⚠️ 浇水粒子创建失败');
      splashNode.destroy();
      return;
    }
    
    // 设置粒子纹理
    if (this.waterDropFrame) {
      emitter.spriteFrame = this.waterDropFrame;
    }
    
    // 溅落配置（一次性爆发）
    emitter.totalParticles = 80;
    emitter.duration = 0.2;
    emitter.emissionRate = 500;
    emitter.life = 0.8;
    emitter.lifeVar = 0.3;
    
    // 向四周扩散（更大范围）
    emitter.posVar = new Vec2(30, 15);
    emitter.gravity = new Vec2(0, -400);
    
    // 向上喷溅（更高更散）
    emitter.speed = 250;
    emitter.speedVar = 100;
    emitter.angle = 90;
    emitter.angleVar = 70;
    
    // 水滴颜色（更透明渐变）
    emitter.startColor = new Color(120, 200, 255, 180);
    emitter.endColor = new Color(180, 220, 255, 0);
    
    // 大小（更大更柔和）
    emitter.startSize = 36;
    emitter.startSizeVar = 12;
    emitter.endSize = 12;
    
    // 播放后销毁
    emitter.autoRemoveOnFinish = true;
    
    // 启动粒子系统
    emitter.resetSystem();
  }
  
  // 上次的天气代码，避免重复触发
  private lastWeatherCode: number = -1;
  
  /**
   * 更新风速（影响雨雪飘动方向）
   */
  updateWindSpeed(windSpeed: number) {
    this.currentWindSpeed = windSpeed;
    
    // 风速转换为水平重力分量（风速 km/h -> 像素偏移）
    const windForce = windSpeed * 8;  // 风越大，水平偏移越大
    
    if (this.rainEmitter) {
      // 雨滴受风影响较大
      this.rainEmitter.gravity = new Vec2(windForce, -1000);
    }
    
    if (this.snowEmitter) {
      // 雪花受风影响更大（更轻）
      this.snowEmitter.gravity = new Vec2(windForce * 1.5, -80);
    }
  }
  
  /**
   * 根据天气代码更新粒子效果
   */
  updateWeatherEffect(weatherCode: number) {
    // 天气没变就不重置
    if (weatherCode === this.lastWeatherCode) return;
    this.lastWeatherCode = weatherCode;
    
    // 停止所有效果
    this.stopRain();
    this.stopSnow();
    
    // 71-77: 雪
    if (weatherCode >= 71 && weatherCode <= 77) {
      const intensity = weatherCode >= 75 ? 1 : 0.5;
      this.startSnow(intensity);
      return;
    }
    
    // 51-67, 80-99: 雨
    if ((weatherCode >= 51 && weatherCode <= 67) || (weatherCode >= 80 && weatherCode <= 99)) {
      let intensity = 0.5;
      // 中雨: 63-64 或 82-84
      if ((weatherCode >= 63 && weatherCode <= 64) || (weatherCode >= 82 && weatherCode <= 84)) intensity = 0.8;
      // 大雨: 65-67 或 85-99
      if (weatherCode >= 65 || weatherCode >= 85) intensity = 1;
      this.startRain(intensity);
    }
  }
}
