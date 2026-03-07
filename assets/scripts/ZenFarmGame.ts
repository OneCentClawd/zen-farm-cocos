/**
 * 🌱 佛系种地 - 主游戏控制器
 * Cocos Creator 3.x 组件
 */

import { 
  _decorator, Component, Node, Label, Color, 
  UITransform, view, director, Canvas, Graphics
} from 'cc';
import { PlantType, HealthState, PLANT_CONFIGS } from './PlantTypes';
import { WeatherData, fetchWeather } from './Environment';
import { GameSaveData, PlotData, waterPlot, plantSeed, harvestPlot, updatePlot, installShelter, removeShelter, installDehumidifier, removeDehumidifier } from './GameData';
import { saveGame, loadOrCreateGame } from './Storage';
import { getCurrentStage, getPlantEmoji, getHealthEmoji } from './Plant';
import { PopupManager } from './PopupManager';

const { ccclass, property } = _decorator;

@ccclass('ZenFarmGame')
export class ZenFarmGame extends Component {
  
  // UI 引用
  private backgroundNode: Node | null = null;   // 背景节点
  private weatherLabel: Label | null = null;
  private plotLabel: Label | null = null;
  private plantEmoji: Label | null = null;
  private statusLabel: Label | null = null;
  private soilLabel: Label | null = null;
  private actionLabel: Label | null = null;
  private facilityLabel: Label | null = null;   // 设施状态
  private stageLabel: Label | null = null;      // 阶段信息
  
  // 种植选择
  private pendingPlantType: PlantType | null = null;
  private pendingHardMode: boolean = false;
  
  // 弹窗管理器
  private popupManager: PopupManager | null = null;
  
  // 游戏数据
  private gameData: GameSaveData | null = null;
  private weather: WeatherData | null = null;
  private selectedPlot: number = 0;
  private touchStartX: number = 0;  // 滑动起点
  
  // 自动保存
  private saveTimer: number = 0;
  
  start() {
    console.log('🌱 佛系种地启动');
    this.ensureCanvas();
    this.popupManager = new PopupManager(this.node);
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
    
    // ========== 背景（体现天气） ==========
    this.backgroundNode = this.createBackground(screenSize.width, screenSize.height);
    
    // ========== 顶部区域 ==========
    // 顶部半透明背景条
    const topBar = new Node('TopBar');
    topBar.layer = this.node.layer;
    topBar.setParent(this.node);
    topBar.setPosition(0, halfH - 90, 0);
    const topBarTransform = topBar.addComponent(UITransform);
    topBarTransform.setContentSize(screenSize.width, 160);
    const topBarGraphics = topBar.addComponent(Graphics);
    topBarGraphics.fillColor = new Color(0, 0, 0, 80);
    topBarGraphics.rect(-screenSize.width / 2, -80, screenSize.width, 160);
    topBarGraphics.fill();
    
    // 地块信息（顶部居中，可点击切换）
    this.plotLabel = this.createLabel('Plot', '◀ 地块 1/4 ▶', 44);
    this.plotLabel.node.setPosition(0, halfH - 55, 0);
    this.plotLabel.node.on(Node.EventType.TOUCH_END, this.cyclePlot, this);
    const plotTransform = this.plotLabel.node.getComponent(UITransform);
    if (plotTransform) {
      plotTransform.setContentSize(500, 80);
    }
    
    // 天气信息（地块下方）- 包含温度、风速、阳光、降雨
    this.weatherLabel = this.createLabel('Weather', '🌤️ 加载中...', 32);
    this.weatherLabel.node.setPosition(0, halfH - 110, 0);
    
    // 土壤湿度（天气下方）
    this.soilLabel = this.createLabel('Soil', '💧 土壤: --%', 32);
    this.soilLabel.node.setPosition(0, halfH - 150, 0);
    
    // ========== 中央植物区 ==========
    // 土地区域是下1/3，泥土放在土地正中间
    const groundHeight = screenSize.height / 3;
    const groundCenterY = -halfH + groundHeight / 2;  // 土地正中间
    
    const soilNode = new Node('SoilArea');
    soilNode.layer = this.node.layer;
    soilNode.setParent(this.node);
    soilNode.setPosition(0, groundCenterY, 0);  // 泥土在土地正中间
    const soilTransform = soilNode.addComponent(UITransform);
    soilTransform.setContentSize(280, 120);
    const soilGraphics = soilNode.addComponent(Graphics);
    // 画椭圆形泥土
    soilGraphics.fillColor = new Color(160, 120, 60, 255);  // 棕色泥土
    soilGraphics.ellipse(0, 0, 130, 45);
    soilGraphics.fill();
    // 泥土高光
    soilGraphics.fillColor = new Color(185, 150, 90, 255);  // 高光浅棕色
    soilGraphics.ellipse(0, 12, 90, 25);
    soilGraphics.fill();
    
    // 植物 emoji（从泥土中间长出来）
    this.plantEmoji = this.createLabel('PlantEmoji', '🌱', 320);
    this.plantEmoji.node.setPosition(0, groundCenterY + 100, 0);  // 植物根部在泥土中心
    
    // 阶段信息（植物上方，天空区域）
    this.stageLabel = this.createLabel('Stage', '播种中...', 44);
    this.stageLabel.node.setPosition(0, groundCenterY + 280, 0);
    
    // 植物状态（阶段信息下方）
    this.statusLabel = this.createLabel('Status', '🟢 健康', 40);
    this.statusLabel.node.setPosition(0, groundCenterY + 230, 0);
    
    // ========== 右上角操作区 ==========
    // 操作按钮
    this.actionLabel = this.createLabel('Action', '👆 种植', 36);
    this.actionLabel.node.setPosition(halfW - 80, halfH - 60, 0);
    this.actionLabel.node.on(Node.EventType.TOUCH_END, this.onActionTap, this);
    const actionTransform = this.actionLabel.node.getComponent(UITransform);
    if (actionTransform) {
      actionTransform.setContentSize(150, 60);
    }
    
    // 设施按钮
    this.facilityLabel = this.createLabel('Facility', '🏠 设施', 36);
    this.facilityLabel.node.setPosition(halfW - 80, halfH - 110, 0);
    this.facilityLabel.node.on(Node.EventType.TOUCH_END, this.showFacilityMenu, this);
    const facilityTransform = this.facilityLabel.node.getComponent(UITransform);
    if (facilityTransform) {
      facilityTransform.setContentSize(150, 60);
    }
    
    // ========== 滑动切换地块 ==========
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    
    console.log('✅ UI 创建完成');
  }
  
  /**
   * 触摸开始
   */
  private onTouchStart(event: any) {
    this.touchStartX = event.getLocationX();
  }
  
  /**
   * 触摸结束 - 检测滑动
   */
  private onTouchEnd(event: any) {
    const endX = event.getLocationX();
    const deltaX = endX - this.touchStartX;
    const threshold = 80;  // 滑动阈值
    
    if (Math.abs(deltaX) > threshold && this.gameData) {
      if (deltaX > 0) {
        // 右滑 → 上一个地块
        this.selectedPlot = Math.max(0, this.selectedPlot - 1);
      } else {
        // 左滑 → 下一个地块
        this.selectedPlot = Math.min(this.gameData.plots.length - 1, this.selectedPlot + 1);
      }
      this.updateUI();
      console.log(`📱 滑动切换到地块 ${this.selectedPlot + 1}`);
    }
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
    
    // 描边增强可读性（使用 Label 自带属性）
    label.enableOutline = true;
    label.outlineColor = new Color(0, 0, 0, 200);
    label.outlineWidth = 4;
    
    return label;
  }
  
  /**
   * 创建背景（体现天气）
   */
  private createBackground(width: number, height: number): Node {
    const bgNode = new Node('Background');
    bgNode.layer = this.node.layer;
    bgNode.setParent(this.node);
    
    // 把背景放到最底层
    bgNode.setSiblingIndex(0);
    
    const transform = bgNode.addComponent(UITransform);
    transform.setContentSize(width, height);
    transform.anchorX = 0.5;
    transform.anchorY = 0.5;
    
    // 用 Graphics 画渐变背景（天空+泥土）
    const graphics = bgNode.addComponent(Graphics);
    this.drawBackgroundGradient(graphics, width, height, 145, 215, 250);  // 默认晴天蓝
    
    return bgNode;
  }
  
  /**
   * 画渐变背景（天空+泥土）
   */
  private drawBackgroundGradient(graphics: Graphics, width: number, height: number, skyR: number, skyG: number, skyB: number) {
    graphics.clear();
    
    const halfW = width / 2;
    const halfH = height / 2;
    const groundHeight = height / 3;  // 下 1/3 是泥土
    
    // 天空（上 2/3）- 用多条横线模拟渐变
    const skyHeight = height - groundHeight;
    const skySteps = 20;
    for (let i = 0; i < skySteps; i++) {
      const t = i / skySteps;
      const y = halfH - (i * skyHeight / skySteps);
      const h = skyHeight / skySteps + 1;
      // 从天空色渐变到稍亮
      const r = Math.round(skyR + (255 - skyR) * t * 0.3);
      const g = Math.round(skyG + (255 - skyG) * t * 0.2);
      const b = Math.round(skyB + (255 - skyB) * t * 0.1);
      graphics.fillColor = new Color(r, g, b, 255);
      graphics.rect(-halfW, y - h, width, h);
      graphics.fill();
    }
    
    // 土地（下 1/3）- 棕色泥土渐变
    const soilSteps = 10;
    for (let i = 0; i < soilSteps; i++) {
      const t = i / soilSteps;
      const y = -halfH + (i * groundHeight / soilSteps);
      const h = groundHeight / soilSteps + 1;
      // 从深棕色渐变到浅棕色
      const r = Math.round(100 + (140 - 100) * t);
      const g = Math.round(70 + (100 - 70) * t);
      const b = Math.round(40 + (60 - 40) * t);
      graphics.fillColor = new Color(r, g, b, 255);
      graphics.rect(-halfW, y, width, h);
      graphics.fill();
    }
  }
  
  /**
   * 根据天气更新背景颜色
   */
  private updateBackgroundColor() {
    if (!this.backgroundNode || !this.weather) return;
    
    const graphics = this.backgroundNode.getComponent(Graphics);
    if (!graphics) return;
    
    const screenSize = view.getVisibleSize();
    const width = screenSize.width;
    const height = screenSize.height;
    
    const sunlight = this.weather.sunlight;
    const precip = this.weather.precipitation;
    
    let r = 145, g = 215, b = 250;  // 默认晴天蓝
    
    if (precip > 5) {
      // 大雨 - 灰蓝
      r = 140; g = 160; b = 180;
    } else if (precip > 0) {
      // 小雨 - 浅灰蓝
      r = 170; g = 195; b = 220;
    } else if (sunlight > 0.8) {
      // 大晴天 - 明亮天蓝
      r = 135; g = 210; b = 255;
    } else if (sunlight > 0.5) {
      // 多云 - 淡天蓝
      r = 170; g = 205; b = 235;
    } else {
      // 阴天 - 淡灰蓝
      r = 185; g = 200; b = 215;
    }
    
    // 重绘渐变背景
    this.drawBackgroundGradient(graphics, width, height, r, g, b);
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
      const wind = this.weather.windSpeed.toFixed(0);
      
      // 根据天气选择 emoji
      let weatherEmoji = '☀️';  // 默认晴天
      if (this.weather.precipitation > 5) {
        weatherEmoji = '🌧️';  // 大雨
      } else if (this.weather.precipitation > 0) {
        weatherEmoji = '🌦️';  // 小雨
      } else if (this.weather.sunlight > 0.8) {
        weatherEmoji = '☀️';  // 大晴天
      } else if (this.weather.sunlight > 0.5) {
        weatherEmoji = '⛅';  // 多云
      } else {
        weatherEmoji = '☁️';  // 阴天
      }
      
      const sunPercent = Math.round(this.weather.sunlight * 100);
      const rain = this.weather.precipitation.toFixed(1);
      this.weatherLabel.string = `${weatherEmoji} ${temp}°C  ☀️${sunPercent}%  🌧️${rain}mm  🌬️${wind}km/h`;
      console.log(`${weatherEmoji} 天气: ${temp}°C, 阳光: ${sunPercent}%, 降雨: ${rain}mm, 风速: ${wind}km/h`);
      
      // 更新背景颜色
      this.updateBackgroundColor();
    }
  }
  
  /**
   * 更新 UI 显示
   */
  updateUI() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (!plot) return;
    
    // 地块 - 只有多个地块时显示切换箭头
    if (this.plotLabel) {
      if (this.gameData.plots.length > 1) {
        this.plotLabel.string = `◀ 地块 ${this.selectedPlot + 1}/${this.gameData.plots.length} ▶`;
      } else {
        this.plotLabel.string = `🌱 我的小菜园`;
      }
    }
    
    // 植物
    if (plot.plant) {
      const config = PLANT_CONFIGS[plot.plant.type];
      const emoji = getPlantEmoji(plot.plant);
      const stage = getCurrentStage(plot.plant);
      const isHardMode = plot.plant.hardMode;
      
      if (this.plantEmoji) this.plantEmoji.string = emoji;
      
      // 阶段信息
      if (this.stageLabel) {
        if (isHardMode) {
          this.stageLabel.string = `${config.name}`;
        } else {
          this.stageLabel.string = `${config.name} · ${stage.name}`;
        }
      }
      
      // 状态显示 - 硬核模式隐藏详细信息
      if (this.statusLabel) {
        if (isHardMode) {
          // 硬核模式：只显示模式图标
          this.statusLabel.string = '🔥 硬核模式';
        } else {
          // 佛系模式：显示完整信息
          const healthEmoji = getHealthEmoji(plot.plant.healthState);
          const progress = (plot.plant.growthProgress * 100).toFixed(0);
          this.statusLabel.string = `${healthEmoji} ${plot.plant.healthValue.toFixed(0)}%  📈 ${progress}%`;
        }
      }
      
      // 土壤 - 硬核模式隐藏
      if (this.soilLabel) {
        if (isHardMode) {
          this.soilLabel.string = '💧 土壤: ???';
        } else {
          const bar = this.getMoistureBar(plot.soilMoisture);
          this.soilLabel.string = `💧 土壤: ${bar} ${plot.soilMoisture.toFixed(0)}%`;
        }
      }
      
      // 天气 - 硬核模式隐藏适宜范围
      // （天气本身还是显示的，只是不告诉你是否适宜）
      
      // 操作按钮提示
      if (this.actionLabel) {
        if (plot.plant.healthState === HealthState.DEAD) {
          this.actionLabel.string = '🗑️ 点击清除';
        } else if (plot.plant.growthProgress >= 1.0) {
          this.actionLabel.string = '👆 点击操作（浇水/收获/挖除）';
        } else {
          this.actionLabel.string = '👆 点击操作（浇水/挖除）';
        }
      }
    } else {
      // 空地
      if (this.plantEmoji) this.plantEmoji.string = '🕳️';
      if (this.stageLabel) this.stageLabel.string = '空地';
      if (this.statusLabel) this.statusLabel.string = '等待播种';
      if (this.actionLabel) this.actionLabel.string = '👆 种点什么~';
      
      // 土壤（空地时显示）
      if (this.soilLabel) {
        const bar = this.getMoistureBar(plot.soilMoisture);
        this.soilLabel.string = `💧 土壤: ${bar} ${plot.soilMoisture.toFixed(0)}%`;
      }
    }
    
    // 设施状态
    if (this.facilityLabel) {
      const facilities = [];
      if (plot.hasShelter) facilities.push('🏠遮雨');
      if (plot.hasDehumidifier) facilities.push('💨除湿');
      this.facilityLabel.string = facilities.length > 0 
        ? `设施: ${facilities.join(' ')}` 
        : '🏠 设施管理';
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
   * 切换地块
   */
  cyclePlot() {
    if (!this.gameData) return;
    this.selectedPlot = (this.selectedPlot + 1) % this.gameData.plots.length;
    this.updateUI();
    console.log(`🌾 切换到地块 ${this.selectedPlot + 1}`);
  }
  
  /**
   * 点击操作区域
   */
  onActionTap() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (!plot) return;
    
    if (plot.plant) {
      if (plot.plant.healthState === HealthState.DEAD) {
        // 清除死亡植物
        this.gameData.plots[this.selectedPlot] = {
          ...plot,
          plant: null,
          lastUpdatedAt: Date.now(),
        };
        saveGame(this.gameData);
        this.updateUI();
      } else if (plot.plant.growthProgress >= 1.0) {
        // 成熟了 - 显示浇水/收获/挖除选择
        this.showPlantMenu(true);
      } else {
        // 生长中 - 显示浇水/挖除选择
        this.showPlantMenu(false);
      }
    } else {
      // 空地 - 显示种植选择
      this.showPlantSelect();
    }
  }
  
  /**
   * 显示植物操作菜单
   */
  showPlantMenu(canHarvest: boolean) {
    if (!this.popupManager) return;
    
    // 创建弹窗
    const popup = this.popupManager.show('PlantMenu', {
      title: '🌱 植物操作',
      height: 0.5,
    });
    
    let yPos = 50;
    
    // 浇水按钮
    const waterBtn = PopupManager.createButton(popup, 'Water', '💧 浇水', 42, () => {
      this.doWater();
      this.popupManager?.close();
    });
    waterBtn.node.setPosition(0, yPos, 0);
    yPos -= 80;
    
    // 收获按钮（仅成熟时显示）
    if (canHarvest) {
      const harvestBtn = PopupManager.createButton(popup, 'Harvest', '🌾 收获', 42, () => {
        this.doHarvest();
        this.popupManager?.close();
      });
      harvestBtn.node.setPosition(0, yPos, 0);
      yPos -= 80;
    }
    
    // 挖除按钮
    const removeBtn = PopupManager.createButton(popup, 'Remove', '🗑️ 挖除', 42, () => {
      this.showRemoveConfirm();
    });
    removeBtn.node.setPosition(0, yPos, 0);
    yPos -= 80;
    
    // 取消按钮
    const cancelBtn = PopupManager.createButton(popup, 'Cancel', '❌ 取消', 36, () => {
      this.popupManager?.close();
    });
    cancelBtn.node.setPosition(0, yPos, 0);
  }
  
  /**
   * 显示挖除确认
   */
  showRemoveConfirm() {
    if (!this.popupManager) return;
    
    const popup = this.popupManager.show('RemoveConfirm', {
      title: '⚠️ 确认挖除',
      height: 0.4,
    });
    
    const hintLabel = PopupManager.createLabel(popup, 'Hint', '挖除后无法恢复！', 28);
    hintLabel.node.setPosition(0, 20, 0);
    
    // 确认按钮
    const confirmBtn = PopupManager.createButton(popup, 'Confirm', '✅ 确认挖除', 40, () => {
      this.doRemovePlant();
      this.popupManager?.close();
    });
    confirmBtn.node.setPosition(0, -60, 0);
    
    // 取消按钮
    const cancelBtn = PopupManager.createButton(popup, 'Cancel', '❌ 取消', 36, () => {
      this.popupManager?.close();
    });
    cancelBtn.node.setPosition(0, -140, 0);
  }
  
  /**
   * 挖除植物
   */
  doRemovePlant() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (!plot.plant) return;
    
    console.log('🗑️ 挖除了植物');
    this.gameData.plots[this.selectedPlot] = {
      ...plot,
      plant: null,
      lastUpdatedAt: Date.now(),
    };
    this.updateUI();
    saveGame(this.gameData);
  }
  
  /**
   * 显示设施管理菜单
   */
  showFacilityMenu() {
    if (!this.gameData || !this.popupManager) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    
    const popup = this.popupManager.show('FacilityMenu', {
      title: '🏠 设施管理',
      height: 0.55,
    });
    
    // 遮雨棚
    const shelterText = plot.hasShelter ? '🏠 遮雨棚 ✅ (点击移除)' : '🏠 遮雨棚 (点击安装)';
    const shelterBtn = PopupManager.createButton(popup, 'Shelter', shelterText, 36, () => {
      this.toggleShelter();
      this.popupManager?.close();
    });
    shelterBtn.node.setPosition(0, 60, 0);
    const shelterTransform = shelterBtn.node.getComponent(UITransform);
    if (shelterTransform) shelterTransform.setContentSize(500, 70);
    
    // 遮雨棚说明
    const shelterHint = PopupManager.createLabel(popup, 'ShelterHint', '阻挡风雨阳光，减少蒸发但影响生长', 20);
    shelterHint.node.setPosition(0, 10, 0);
    
    // 除湿器
    const dehumText = plot.hasDehumidifier ? '💨 除湿器 ✅ (点击移除)' : '💨 除湿器 (点击安装)';
    const dehumBtn = PopupManager.createButton(popup, 'Dehum', dehumText, 36, () => {
      this.toggleDehumidifier();
      this.popupManager?.close();
    });
    dehumBtn.node.setPosition(0, -60, 0);
    const dehumTransform = dehumBtn.node.getComponent(UITransform);
    if (dehumTransform) dehumTransform.setContentSize(500, 70);
    
    // 除湿器说明
    const dehumHint = PopupManager.createLabel(popup, 'DehumHint', '每小时降低 2% 土壤湿度', 22);
    dehumHint.node.setPosition(0, -110, 0);
    
    // 关闭按钮
    const cancelBtn = PopupManager.createButton(popup, 'Cancel', '❌ 关闭', 36, () => {
      this.popupManager?.close();
    });
    cancelBtn.node.setPosition(0, -190, 0);
  }
  
  /**
   * 切换遮雨棚
   */
  toggleShelter() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (plot.hasShelter) {
      this.gameData.plots[this.selectedPlot] = removeShelter(plot);
      console.log('🏠 移除遮雨棚');
    } else {
      this.gameData.plots[this.selectedPlot] = installShelter(plot);
      console.log('🏠 安装遮雨棚');
    }
    this.updateUI();
    saveGame(this.gameData);
  }
  
  /**
   * 切换除湿器
   */
  toggleDehumidifier() {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (plot.hasDehumidifier) {
      this.gameData.plots[this.selectedPlot] = removeDehumidifier(plot);
      console.log('💨 移除除湿器');
    } else {
      this.gameData.plots[this.selectedPlot] = installDehumidifier(plot);
      console.log('💨 安装除湿器');
    }
    this.updateUI();
    saveGame(this.gameData);
  }
  
  /**
   * 显示种植选择界面
   */
  showPlantSelect() {
    if (!this.popupManager) return;
    
    const panel = this.popupManager.show('PlantSelect', {
      title: '🌱 选择要种植的植物',
      height: 0.6,
    });
    
    // 植物选项
    const plants = [
      { type: PlantType.CLOVER, emoji: '🍀', name: '幸运草', y: 80 },
      { type: PlantType.SUNFLOWER, emoji: '🌻', name: '向日葵', y: 0 },
      { type: PlantType.STRAWBERRY, emoji: '🍓', name: '草莓', y: -80 },
      { type: PlantType.SAKURA, emoji: '🌸', name: '樱花', y: -160 },
    ];
    
    for (const p of plants) {
      const config = PLANT_CONFIGS[p.type];
      const btn = PopupManager.createButton(panel, p.name, 
        `${p.emoji} ${p.name}  ⭐${config.difficulty}  📅${config.growthDays}天`, 32, () => {
        this.showPlantConfirm(p.type);
      });
      btn.node.setPosition(0, p.y, 0);
      
      const btnTransform = btn.node.getComponent(UITransform);
      if (btnTransform) btnTransform.setContentSize(500, 60);
    }
  }
  
  /**
   * 显示种植确认界面
   */
  showPlantConfirm(type: PlantType) {
    const config = PLANT_CONFIGS[type];
    this.pendingPlantType = type;
    
    // 显示确认面板（展示植物详情 + 选择难度）
    this.showPlantConfirmPanel(config);
  }
  
  /**
   * 显示种植确认面板（展示植物详情 + 选择难度）
   */
  showPlantConfirmPanel(config: any) {
    if (!this.popupManager) return;
    
    const panel = this.popupManager.show('PlantConfirm', {
      title: `${config.emoji} ${config.name}`,
      height: 0.75,
    });
    
    let yPos = 110;
    
    // 难度星级
    const diffLabel = PopupManager.createLabel(panel, 'Diff', `难度: ${'⭐'.repeat(config.difficulty)}`, 28);
    diffLabel.node.setPosition(0, yPos, 0);
    yPos -= 42;
    
    // 生长周期
    const growthLabel = PopupManager.createLabel(panel, 'Growth', `📅 成熟周期: ${config.growthDays} 天`, 28);
    growthLabel.node.setPosition(0, yPos, 0);
    yPos -= 42;
    
    // 温度要求
    const tempLabel = PopupManager.createLabel(panel, 'Temp', 
      `🌡️ 适宜温度: ${config.tempMin}°C ~ ${config.tempMax}°C`, 26);
    tempLabel.node.setPosition(0, yPos, 0);
    yPos -= 38;
    
    // 水分要求
    const waterLabel = PopupManager.createLabel(panel, 'Water',
      `💧 适宜湿度: ${config.moistureMin}% ~ ${config.moistureMax}%`, 26);
    waterLabel.node.setPosition(0, yPos, 0);
    yPos -= 38;
    
    // 特性
    let traits: string[] = [];
    if (config.droughtTolerance >= 0.7) traits.push('耐旱');
    if (config.coldTolerance >= 0.7) traits.push('耐寒');
    if (config.heatTolerance >= 0.7) traits.push('耐热');
    if (config.needsVernalization) traits.push('需要春化');
    if (config.isAnnual) traits.push('一年生');
    
    const traitText = traits.length > 0 ? `🏷️ 特性: ${traits.join('、')}` : '🏷️ 无特殊特性';
    const traitLabel = PopupManager.createLabel(panel, 'Traits', traitText, 26);
    traitLabel.node.setPosition(0, yPos, 0);
    yPos -= 50;
    
    // 分隔提示
    const hintLabel = PopupManager.createLabel(panel, 'Hint', '— 选择游戏难度 —', 22);
    hintLabel.node.setPosition(0, yPos, 0);
    yPos -= 50;
    
    // 佛系种植按钮
    const zenBtn = PopupManager.createButton(panel, 'Zen', '🧘 佛系种植', 36, () => {
      this.pendingHardMode = false;
      this.doPlant();
      this.popupManager?.close();
    });
    zenBtn.node.setPosition(0, yPos, 0);
    
    const zenHint = PopupManager.createLabel(panel, 'ZenHint', '显示数值提示', 20);
    zenHint.node.setPosition(0, yPos - 35, 0);
    yPos -= 80;
    
    // 硬核种植按钮
    const hardBtn = PopupManager.createButton(panel, 'Hard', '🔥 硬核种植', 36, () => {
      this.pendingHardMode = true;
      this.doPlant();
      this.popupManager?.close();
    });
    hardBtn.node.setPosition(0, yPos, 0);
    
    const hardHint = PopupManager.createLabel(panel, 'HardHint', '隐藏详细信息', 20);
    hardHint.node.setPosition(0, yPos - 35, 0);
  }
  
  /**
   * 在指定节点下创建 Label
   */
  private createLabelOn(parent: Node, name: string, text: string, fontSize: number): Label {
    const node = new Node(name);
    node.layer = this.node.layer;
    node.setParent(parent);
    
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
    
    // 描边增强可读性（使用 Label 自带属性）
    label.enableOutline = true;
    label.outlineColor = new Color(0, 0, 0, 200);
    label.outlineWidth = 4;
    
    return label;
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
  doPlant(type?: PlantType, hardMode: boolean = false) {
    // 如果没有传参数，使用 pending 的值
    const plantType = type ?? this.pendingPlantType;
    const isHardMode = type !== undefined ? hardMode : this.pendingHardMode;
    
    if (!this.gameData || plantType === null) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (plot.plant) return;  // 已有植物
    
    this.gameData.plots[this.selectedPlot] = plantSeed(plot, plantType, isHardMode);
    
    const config = PLANT_CONFIGS[plantType];
    const modeText = isHardMode ? '（硬核模式）' : '';
    console.log(`🌱 种下了 ${config.name}${modeText}！`);
    this.updateUI();
    saveGame(this.gameData);
    
    // 清理 pending
    this.pendingPlantType = null;
    this.pendingHardMode = false;
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
      
      // 首次收获解锁新地块
      const newPlotId = this.gameData.plots.length;
      this.gameData.plots.push({
        id: newPlotId,
        plant: null,
        soilMoisture: 40,
        hasShelter: false,
        hasDehumidifier: false,
        lastUpdatedAt: Date.now(),
      });
      console.log(`🌾 收获了！解锁新地块 ${newPlotId + 1}`);
      
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
  
  // 植物更新计时器
  private updateTimer: number = 0;
  
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
    
    // 更新植物状态（每 60 秒检查一次）
    this.updateTimer += dt;
    if (this.updateTimer >= 60 && this.gameData && this.weather) {
      this.updateTimer = 0;
      
      let needsUpdate = false;
      for (let i = 0; i < this.gameData.plots.length; i++) {
        const plot = this.gameData.plots[i];
        if (plot.plant) {
          const updated = updatePlot(plot, this.weather);
          if (updated !== plot) {
            this.gameData.plots[i] = updated;
            needsUpdate = true;
          }
        }
      }
      
      if (needsUpdate) {
        this.updateUI();
        saveGame(this.gameData);
      }
    }
  }
  
  onDestroy() {
    if (this.gameData) {
      this.gameData.lastOnlineAt = Date.now();
      saveGame(this.gameData);
    }
  }
}
