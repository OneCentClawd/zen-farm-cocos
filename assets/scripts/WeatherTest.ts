/**
 * 🌤️ 天气系统测试场景
 * 
 * 功能：
 * - 时间滑块（0-23小时）
 * - 天气切换（晴/多云/雨）
 * - 土壤湿度滑块
 * - 风速滑块
 */

import { 
  _decorator, Component, Node, Label, Graphics, Color, 
  UITransform, view, Button, Slider
} from 'cc';
import { WeatherRenderer } from './WeatherRenderer';
import { SoilRenderer } from './SoilRenderer';
import { WeatherData } from './Environment';

const { ccclass, property } = _decorator;

// 预设天气
const WEATHER_PRESETS: Record<string, Partial<WeatherData>> = {
  '☀️ 晴天': {
    weatherCode: 0,
    sunlight: 1.0,
    precipitation: 0,
    temperature: 25,
    humidity: 40,
    windSpeed: 5,
  },
  '⛅ 多云': {
    weatherCode: 2,
    sunlight: 0.6,
    precipitation: 0,
    temperature: 22,
    humidity: 55,
    windSpeed: 12,
  },
  '☁️ 阴天': {
    weatherCode: 3,
    sunlight: 0.3,
    precipitation: 0,
    temperature: 18,
    humidity: 70,
    windSpeed: 8,
  },
  '🌧️ 小雨': {
    weatherCode: 61,
    sunlight: 0.2,
    precipitation: 2,
    temperature: 16,
    humidity: 85,
    windSpeed: 15,
  },
  '⛈️ 大雨': {
    weatherCode: 65,
    sunlight: 0.1,
    precipitation: 8,
    temperature: 14,
    humidity: 95,
    windSpeed: 25,
  },
};

@ccclass('WeatherTest')
export class WeatherTest extends Component {
  
  private weatherRenderer: WeatherRenderer | null = null;
  private soilRenderer: SoilRenderer | null = null;
  
  private currentHour: number = 12;
  private currentWeather: WeatherData = {
    weatherCode: 0,
    sunlight: 1.0,
    precipitation: 0,
    temperature: 25,
    humidity: 40,
    windSpeed: 5,
    windDirection: 0,
    updatedAt: Date.now(),
  };
  private currentMoisture: number = 50;
  
  // UI 元素
  private hourLabel: Label | null = null;
  private weatherLabel: Label | null = null;
  private moistureLabel: Label | null = null;
  private windLabel: Label | null = null;
  
  start() {
    console.log('🌤️ 天气测试场景启动');
    this.setupRenderers();
    this.createControlPanel();
    this.updateAll();
  }
  
  /**
   * 设置渲染器
   */
  private setupRenderers() {
    const screenSize = view.getVisibleSize();
    
    // 天气渲染器
    const weatherNode = new Node('WeatherRenderer');
    this.weatherRenderer = weatherNode.addComponent(WeatherRenderer);
    this.weatherRenderer.init(this.node, screenSize.height * 2 / 3);
    
    // 土壤渲染器
    const soilNode = new Node('SoilRenderer');
    this.soilRenderer = soilNode.addComponent(SoilRenderer);
    this.soilRenderer.init(
      this.node,
      screenSize.width * 0.8,
      screenSize.height / 4,
      -screenSize.height / 4
    );
  }
  
  /**
   * 创建控制面板
   */
  private createControlPanel() {
    const screenSize = view.getVisibleSize();
    const panelX = screenSize.width / 2 - 120;
    const startY = screenSize.height / 2 - 40;
    
    // 控制面板背景
    const panel = this.createPanel(200, 350);
    panel.setPosition(panelX - 100, startY - 150, 0);
    
    let y = startY;
    
    // 时间控制
    this.hourLabel = this.createLabel(`⏰ ${this.currentHour}:00`, panelX, y);
    y -= 35;
    this.createButton('◀', panelX - 40, y, () => this.changeHour(-1));
    this.createButton('▶', panelX + 40, y, () => this.changeHour(1));
    y -= 50;
    
    // 天气预设
    this.weatherLabel = this.createLabel('☀️ 晴天', panelX, y);
    y -= 35;
    
    const presetNames = Object.keys(WEATHER_PRESETS);
    for (let i = 0; i < presetNames.length; i++) {
      const name = presetNames[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      this.createButton(
        name.split(' ')[0],  // 只显示 emoji
        panelX - 40 + col * 80,
        y - row * 40,
        () => this.setWeatherPreset(name)
      );
    }
    y -= Math.ceil(presetNames.length / 2) * 40 + 20;
    
    // 湿度控制
    this.moistureLabel = this.createLabel(`💧 湿度: ${this.currentMoisture}%`, panelX, y);
    y -= 35;
    this.createButton('−', panelX - 40, y, () => this.changeMoisture(-10));
    this.createButton('+', panelX + 40, y, () => this.changeMoisture(10));
    y -= 50;
    
    // 风速显示
    this.windLabel = this.createLabel(`💨 风速: ${this.currentWeather.windSpeed} km/h`, panelX, y);
    y -= 35;
    this.createButton('−', panelX - 40, y, () => this.changeWind(-5));
    this.createButton('+', panelX + 40, y, () => this.changeWind(5));
  }
  
  /**
   * 创建半透明面板背景
   */
  private createPanel(width: number, height: number): Node {
    const panel = new Node('Panel');
    panel.layer = this.node.layer;
    panel.setParent(this.node);
    
    const transform = panel.addComponent(UITransform);
    transform.setContentSize(width, height);
    
    const g = panel.addComponent(Graphics);
    g.fillColor = new Color(0, 0, 0, 150);
    g.roundRect(-width / 2, -height / 2, width, height, 10);
    g.fill();
    
    return panel;
  }
  
  /**
   * 创建标签
   */
  private createLabel(text: string, x: number, y: number): Label {
    const node = new Node('Label');
    node.layer = this.node.layer;
    node.setParent(this.node);
    node.setPosition(x, y, 0);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(180, 30);
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = 20;
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    
    return label;
  }
  
  /**
   * 创建按钮
   */
  private createButton(text: string, x: number, y: number, callback: () => void): Node {
    const btn = new Node('Button');
    btn.layer = this.node.layer;
    btn.setParent(this.node);
    btn.setPosition(x, y, 0);
    
    const transform = btn.addComponent(UITransform);
    transform.setContentSize(60, 35);
    
    // 背景
    const g = btn.addComponent(Graphics);
    g.fillColor = new Color(80, 120, 180, 255);
    g.roundRect(-30, -17.5, 60, 35, 5);
    g.fill();
    
    // 文字
    const labelNode = new Node('Label');
    labelNode.layer = this.node.layer;
    labelNode.setParent(btn);
    labelNode.setPosition(0, 0, 0);
    
    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(60, 35);
    
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 18;
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    
    // 点击事件
    const button = btn.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    btn.on(Node.EventType.TOUCH_END, callback);
    
    return btn;
  }
  
  /**
   * 改变时间
   */
  private changeHour(delta: number) {
    this.currentHour = (this.currentHour + delta + 24) % 24;
    this.updateAll();
  }
  
  /**
   * 设置天气预设
   */
  private setWeatherPreset(name: string) {
    const preset = WEATHER_PRESETS[name];
    if (preset) {
      this.currentWeather = {
        ...this.currentWeather,
        ...preset,
        updatedAt: Date.now(),
      };
      if (this.weatherLabel) {
        this.weatherLabel.string = name;
      }
      this.updateAll();
    }
  }
  
  /**
   * 改变湿度
   */
  private changeMoisture(delta: number) {
    this.currentMoisture = Math.max(0, Math.min(100, this.currentMoisture + delta));
    this.updateAll();
  }
  
  /**
   * 改变风速
   */
  private changeWind(delta: number) {
    this.currentWeather.windSpeed = Math.max(0, Math.min(50, this.currentWeather.windSpeed + delta));
    this.updateAll();
  }
  
  /**
   * 更新所有显示
   */
  private updateAll() {
    // 更新标签
    if (this.hourLabel) {
      const hourStr = this.currentHour.toString().padStart(2, '0');
      this.hourLabel.string = `⏰ ${hourStr}:00`;
    }
    if (this.moistureLabel) {
      this.moistureLabel.string = `💧 湿度: ${this.currentMoisture}%`;
    }
    if (this.windLabel) {
      this.windLabel.string = `💨 风速: ${this.currentWeather.windSpeed} km/h`;
    }
    
    // 更新渲染器
    if (this.weatherRenderer) {
      this.weatherRenderer.updateWeather(this.currentWeather, this.currentHour);
    }
    if (this.soilRenderer) {
      this.soilRenderer.updateMoisture(this.currentMoisture);
    }
  }
}
