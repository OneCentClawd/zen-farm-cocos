/**
 * 🌱 佛系种地 - 主游戏控制器
 * Cocos Creator 3.x 组件
 */

import { 
  _decorator, Component, Node, Label, Color, 
  UITransform, view, director, Canvas, Camera 
} from 'cc';
import { PlantType, HealthState, PLANT_CONFIGS } from './PlantTypes';
import { WeatherData, fetchWeather } from './Environment';
import { GameSaveData, PlotData, waterPlot, plantSeed, harvestPlot, updatePlot } from './GameData';
import { saveGame, loadOrCreateGame } from './Storage';
import { getGrowthStage, getPlantEmoji, getHealthEmoji } from './Plant';

const { ccclass, property } = _decorator;

@ccclass('ZenFarmGame')
export class ZenFarmGame extends Component {
  
  // UI 引用
  private weatherLabel: Label | null = null;
  private plotLabel: Label | null = null;
  private plantEmoji: Label | null = null;
  private statusLabel: Label | null = null;
  private soilLabel: Label | null = null;
  private actionLabel: Label | null = null;
  
  // 游戏数据
  private gameData: GameSaveData | null = null;
  private weather: WeatherData | null = null;
  private selectedPlot: number = 0;
  
  // 自动保存
  private saveTimer: number = 0;
  
  start() {
    console.log('🌱 佛系种地启动');
    this.ensureCanvas();
    this.createUI();
    this.initGame();
  }
  
  /**
   * 确保在 Canvas 下运行
   */
  ensureCanvas() {
    // 向上查找 Canvas
    let canvasNode: Node | null = null;
    let current: Node | null = this.node;
    
    while (current) {
      const canvas = current.getComponent(Canvas);
      if (canvas) {
        canvasNode = current;
        break;
      }
      current = current.parent;
    }
    
    if (!canvasNode) {
      // 场景中查找 Canvas
      console.log('⚠️ 未找到 Canvas，尝试查找...');
      const scene = director.getScene();
      if (scene) {
        // 递归查找 Canvas
        canvasNode = this.findCanvasInNode(scene);
        if (canvasNode) {
          // 把自己移到 Canvas 下
          this.node.setParent(canvasNode);
          console.log('✅ 已移动到 Canvas 下');
        } else {
          console.error('❌ 场景中没有 Canvas！');
          return;
        }
      }
    }
    
    // 从 Canvas 获取正确的 layer
    if (canvasNode) {
      this.node.layer = canvasNode.layer;
      // 确保节点在中心位置
      this.node.setPosition(0, 0, 0);
      console.log(`📺 使用 Canvas layer: ${canvasNode.layer}`);
    }
  }
  
  /**
   * 递归查找 Canvas 节点
   */
  private findCanvasInNode(node: Node): Node | null {
    if (node.getComponent(Canvas)) {
      return node;
    }
    for (const child of node.children) {
      const found = this.findCanvasInNode(child);
      if (found) return found;
    }
    return null;
  }
  
  /**
   * 创建 UI
   */
  createUI() {
    const screenSize = view.getVisibleSize();
    const halfH = screenSize.height / 2;
    const halfW = screenSize.width / 2;
    
    console.log(`📐 屏幕尺寸: ${screenSize.width} x ${screenSize.height}`);
    
    // 给父节点添加 UITransform（必须）
    let parentTransform = this.node.getComponent(UITransform);
    if (!parentTransform) {
      parentTransform = this.node.addComponent(UITransform);
    }
    parentTransform.setContentSize(screenSize.width, screenSize.height);
    parentTransform.anchorX = 0.5;
    parentTransform.anchorY = 0.5;
    
    // 天气信息（顶部）
    this.weatherLabel = this.createLabel('Weather', '🌤️ 加载中...', 48);
    this.weatherLabel.node.setPosition(0, halfH - 100, 0);
    
    // 植物 emoji（中心大图）
    this.plantEmoji = this.createLabel('PlantEmoji', '🌱', 200);
    this.plantEmoji.node.setPosition(0, 150, 0);
    
    // 植物状态
    this.statusLabel = this.createLabel('Status', '选择种子开始种植', 48);
    this.statusLabel.node.setPosition(0, -50, 0);
    
    // 土壤湿度
    this.soilLabel = this.createLabel('Soil', '💧 土壤: --%', 40);
    this.soilLabel.node.setPosition(0, -150, 0);
    
    // 地块选择
    this.plotLabel = this.createLabel('Plot', '🌾 地块 1', 36);
    this.plotLabel.node.setPosition(0, -250, 0);
    
    // 操作提示
    this.actionLabel = this.createLabel('Action', '👆 点击种植', 48);
    this.actionLabel.node.setPosition(0, -halfH + 150, 0);
    this.actionLabel.node.on(Node.EventType.TOUCH_END, this.onActionTap, this);
    
    // 增加点击区域
    const actionTransform = this.actionLabel.node.getComponent(UITransform);
    if (actionTransform) {
      actionTransform.setContentSize(screenSize.width, 100);
    }
    
    console.log('✅ UI 创建完成');
  }
  
  /**
   * 创建文本标签
   */
  private createLabel(name: string, text: string, fontSize: number): Label {
    const node = new Node(name);
    // 继承父节点的 layer
    node.layer = this.node.layer;
    node.setParent(this.node);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(600, fontSize + 40);
    transform.anchorX = 0.5;
    transform.anchorY = 0.5;
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 10;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = new Color(255, 255, 255, 255);
    label.overflow = Label.Overflow.NONE;
    
    return label;
  }
  
  /**
   * 初始化游戏
   */
  async initGame() {
    // 加载存档
    try {
      this.gameData = loadOrCreateGame(31.23, 121.47);
      
      // 防御性检查
      if (!this.gameData || !this.gameData.plots || this.gameData.plots.length === 0) {
        console.log('⚠️ 存档无效，创建新游戏');
        this.gameData = {
          version: 1,
          plots: [{
            id: 0,
            plant: null,
            soilMoisture: 50,
            lastUpdatedAt: Date.now(),
          }],
          unlockedPlots: 1,
          lastOnlineAt: Date.now(),
          location: { lat: 31.23, lon: 121.47 },
          totalHarvests: 0,
        };
      }
      
      console.log(`📂 地块数: ${this.gameData.plots.length}`);
    } catch (e) {
      console.error('加载存档失败:', e);
      // 创建默认游戏数据
      this.gameData = {
        version: 1,
        plots: [{
          id: 0,
          plant: null,
          soilMoisture: 50,
          lastUpdatedAt: Date.now(),
        }],
        unlockedPlots: 1,
        lastOnlineAt: Date.now(),
        location: { lat: 31.23, lon: 121.47 },
        totalHarvests: 0,
      };
    }
    
    // 获取天气
    await this.updateWeather();
    
    // 更新 UI
    this.updateUI();
  }
  
  /**
   * 获取天气
   */
  async updateWeather() {
    if (!this.gameData) return;
    
    const { lat, lon } = this.gameData.location;
    this.weather = await fetchWeather(lat, lon);
    
    if (this.weather && this.weatherLabel) {
      const temp = this.weather.temperature.toFixed(1);
      const humidity = this.weather.humidity;
      this.weatherLabel.string = `🌡️ ${temp}°C  💨 ${humidity}%`;
      console.log(`🌤️ 天气: ${temp}°C`);
    }
  }
  
  /**
   * 更新 UI 显示
   */
  updateUI() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (!plot) return;
    
    // 地块
    if (this.plotLabel) {
      this.plotLabel.string = `🌾 地块 ${this.selectedPlot + 1}/${this.gameData.plots.length}`;
    }
    
    // 土壤
    if (this.soilLabel) {
      const bar = this.getMoistureBar(plot.soilMoisture);
      this.soilLabel.string = `💧 土壤: ${bar} ${plot.soilMoisture.toFixed(0)}%`;
    }
    
    // 植物
    if (plot.plant) {
      const config = PLANT_CONFIGS[plot.plant.type];
      const emoji = getPlantEmoji(plot.plant);
      const healthEmoji = getHealthEmoji(plot.plant.healthState);
      const stage = getGrowthStage(plot.plant);
      
      if (this.plantEmoji) this.plantEmoji.string = emoji;
      if (this.statusLabel) {
        const progress = (plot.plant.growthProgress * 100).toFixed(0);
        this.statusLabel.string = `${config.name} ${healthEmoji} ${plot.plant.healthValue.toFixed(0)}%\n生长: ${progress}%`;
      }
      
      // 操作按钮
      if (this.actionLabel) {
        if (plot.plant.healthState === HealthState.DEAD) {
          this.actionLabel.string = '🗑️ 清除';
        } else if (plot.plant.growthProgress >= 1.0) {
          this.actionLabel.string = '💧 浇水    🌾 收获';
        } else {
          this.actionLabel.string = '💧 浇水';
        }
      }
    } else {
      // 空地
      if (this.plantEmoji) this.plantEmoji.string = '🕳️';
      if (this.statusLabel) this.statusLabel.string = '空地 - 点击种植';
      if (this.actionLabel) this.actionLabel.string = '🍀 幸运草  🌻 向日葵  🍓 草莓  🌸 樱花';
    }
  }
  
  /**
   * 湿度条
   */
  private getMoistureBar(moisture: number): string {
    const filled = Math.round(moisture / 20);
    return '💧'.repeat(Math.min(5, filled)) + '○'.repeat(Math.max(0, 5 - filled));
  }
  
  /**
   * 点击操作区域
   */
  onActionTap() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (!plot) return;
    
    if (plot.plant) {
      // 有植物 - 浇水
      this.doWater();
    } else {
      // 空地 - 种植幸运草（简化版）
      this.doPlant(PlantType.CLOVER);
    }
  }
  
  /**
   * 浇水
   */
  doWater() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    this.gameData.plots[this.selectedPlot] = waterPlot(plot);
    
    console.log('💧 浇水了！');
    this.updateUI();
    saveGame(this.gameData);
  }
  
  /**
   * 种植
   */
  doPlant(type: PlantType) {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (plot.plant) return;  // 已有植物
    
    this.gameData.plots[this.selectedPlot] = plantSeed(plot, type);
    
    const config = PLANT_CONFIGS[type];
    console.log(`🌱 种下了 ${config.name}！`);
    this.updateUI();
    saveGame(this.gameData);
  }
  
  /**
   * 收获
   */
  doHarvest() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    const result = harvestPlot(plot);
    
    if (result.harvested) {
      this.gameData.plots[this.selectedPlot] = result.plot;
      this.gameData.totalHarvests++;
      console.log('🌾 收获了！');
      this.updateUI();
      saveGame(this.gameData);
    }
  }
  
  /**
   * 切换地块
   */
  selectPlot(index: number) {
    if (!this.gameData) return;
    if (index < 0 || index >= this.gameData.plots.length) return;
    
    this.selectedPlot = index;
    this.updateUI();
  }
  
  /**
   * 每帧更新
   */
  update(dt: number) {
    // 自动保存（每 30 秒）
    this.saveTimer += dt;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      if (this.gameData) {
        this.gameData.lastOnlineAt = Date.now();
        saveGame(this.gameData);
      }
    }
    
    // 更新植物状态（每分钟）
    // 简化：暂时只在打开游戏时更新
  }
  
  onDestroy() {
    if (this.gameData) {
      this.gameData.lastOnlineAt = Date.now();
      saveGame(this.gameData);
    }
  }
}
