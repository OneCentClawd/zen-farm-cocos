/**
 * 🎆 粒子效果管理器
 * 
 * 功能：
 * - 雨滴粒子
 * - 雪花粒子
 * - 浇水溅落粒子
 */

import { 
  _decorator, Component, Node, ParticleSystem2D, Color, Vec2, UITransform, view
} from 'cc';

const { ccclass, property } = _decorator;

@ccclass('ParticleEffects')
export class ParticleEffects extends Component {
  
  private rainEmitter: ParticleSystem2D | null = null;
  private snowEmitter: ParticleSystem2D | null = null;
  private screenWidth: number = 0;
  private screenHeight: number = 0;
  
  /**
   * 初始化粒子系统
   */
  init(parent: Node) {
    const screenSize = view.getVisibleSize();
    this.screenWidth = screenSize.width;
    this.screenHeight = screenSize.height;
    
    this.node.setParent(parent);
    this.node.layer = parent.layer;
    
    try {
      // 创建雨滴发射器
      this.createRainEmitter();
      
      // 创建雪花发射器
      this.createSnowEmitter();
    } catch (e) {
      console.warn('⚠️ 粒子系统初始化失败，可能未启用 Particle System 2D 模块', e);
    }
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
    
    // 雨滴配置
    this.rainEmitter.totalParticles = 150;
    this.rainEmitter.duration = -1;  // 持续发射
    this.rainEmitter.emissionRate = 80;
    this.rainEmitter.life = 1.2;
    this.rainEmitter.lifeVar = 0.3;
    
    // 发射区域（屏幕顶部横向）
    this.rainEmitter.posVar = new Vec2(this.screenWidth / 2, 0);
    
    // 重力向下
    this.rainEmitter.gravity = new Vec2(0, -800);
    
    // 初始速度
    this.rainEmitter.speed = 400;
    this.rainEmitter.speedVar = 100;
    
    // 发射角度（向下）
    this.rainEmitter.angle = 270;
    this.rainEmitter.angleVar = 5;
    
    // 颜色（浅蓝色水滴）
    this.rainEmitter.startColor = new Color(180, 210, 255, 200);
    this.rainEmitter.endColor = new Color(150, 190, 255, 100);
    
    // 大小
    this.rainEmitter.startSize = 8;
    this.rainEmitter.startSizeVar = 3;
    this.rainEmitter.endSize = 4;
    
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
    
    // 雪花配置
    this.snowEmitter.totalParticles = 100;
    this.snowEmitter.duration = -1;
    this.snowEmitter.emissionRate = 30;
    this.snowEmitter.life = 4;
    this.snowEmitter.lifeVar = 1;
    
    // 发射区域
    this.snowEmitter.posVar = new Vec2(this.screenWidth / 2, 0);
    
    // 轻微重力
    this.snowEmitter.gravity = new Vec2(0, -50);
    
    // 慢速飘落
    this.snowEmitter.speed = 30;
    this.snowEmitter.speedVar = 20;
    
    // 发射角度（向下，但有摇摆）
    this.snowEmitter.angle = 270;
    this.snowEmitter.angleVar = 30;
    
    // 颜色（白色雪花）
    this.snowEmitter.startColor = new Color(255, 255, 255, 230);
    this.snowEmitter.endColor = new Color(255, 255, 255, 50);
    
    // 大小
    this.snowEmitter.startSize = 10;
    this.snowEmitter.startSizeVar = 5;
    this.snowEmitter.endSize = 6;
    
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
    if (!this.rainEmitter) return;
    
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
    if (!this.snowEmitter) return;
    
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
    
    // 溅落配置（一次性爆发）
    emitter.totalParticles = 30;
    emitter.duration = 0.1;  // 短暂爆发
    emitter.emissionRate = 300;
    emitter.life = 0.5;
    emitter.lifeVar = 0.2;
    
    // 向四周扩散
    emitter.posVar = new Vec2(10, 5);
    emitter.gravity = new Vec2(0, -500);
    
    // 向上喷溅
    emitter.speed = 150;
    emitter.speedVar = 50;
    emitter.angle = 90;
    emitter.angleVar = 45;
    
    // 水滴颜色
    emitter.startColor = new Color(100, 180, 255, 220);
    emitter.endColor = new Color(150, 200, 255, 0);
    
    // 大小
    emitter.startSize = 8;
    emitter.startSizeVar = 3;
    emitter.endSize = 2;
    
    // 播放后销毁
    emitter.autoRemoveOnFinish = true;
  }
  
  // 上次的天气代码，避免重复触发
  private lastWeatherCode: number = -1;
  
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
