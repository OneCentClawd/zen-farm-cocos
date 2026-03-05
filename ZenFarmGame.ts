/**
 * 🌱 佛系种地 - 主游戏控制器
 * Cocos Creator 3.x 组件
 */

import { 
  _decorator, Component, Node, Label, Color, 
  UITransform, view, director, Canvas, Sprite, SpriteFrame 
} from 'cc';
import { PlantType, HealthState, PLANT_CONFIGS } from './PlantTypes';
import { WeatherData, fetchWeather } from './Environment';
import { GameSaveData, PlotData, waterPlot, plantSeed, harvestPlot, updatePlot, installShelter, removeShelter, installDehumidifier, removeDehumidifier } from './GameData';
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
  private facilityLabel: Label | null = null;  // 设施状态
  
  // 选择界面
  private selectPanel: Node | null = null;
  private confirmPanel: Node | null = null;
  private difficultyPanel: Node | null = null;
  private pendingPlantType: PlantType | null = null;
  private pendingHardMode: boolean = false;
  
  // 临时菜单（防止重复弹出）
  private activeMenu: Node | null = null;
  
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
    this.actionLabel.node.setPosition(0, -halfH + 200, 0);
    this.actionLabel.node.on(Node.EventType.TOUCH_END, this.onActionTap, this);
    
    // 增加点击区域
    const actionTransform = this.actionLabel.node.getComponent(UITransform);
    if (actionTransform) {
      actionTransform.setContentSize(screenSize.width, 100);
    }
    
    // 设施按钮
    this.facilityLabel = this.createLabel('Facility', '🏠 设施管理', 32);
    this.facilityLabel.node.setPosition(0, -halfH + 80, 0);
    this.facilityLabel.node.on(Node.EventType.TOUCH_END, this.showFacilityMenu, this);
    const facilityTransform = this.facilityLabel.node.getComponent(UITransform);
    if (facilityTransform) {
      facilityTransform.setContentSize(300, 60);
    }
    
    console.log('✅ UI 创建完成');
  }
  
  /**
   * 创建带半透明背景的弹窗容器
   */
  private createMenuWithBackground(name: string): Node {
    const screenSize = view.getVisibleSize();
    
    // 主容器
    const menuNode = new Node(name);
    menuNode.layer = this.node.layer;
    menuNode.setParent(this.node);
    menuNode.setPosition(0, 0, 0);
    
    const menuTransform = menuNode.addComponent(UITransform);
    menuTransform.setContentSize(screenSize.width, screenSize.height);
    
    // 半透明黑色背景
    const bgNode = new Node('Background');
    bgNode.layer = this.node.layer;
    bgNode.setParent(menuNode);
    bgNode.setPosition(0, 0, 0);
    
    const bgTransform = bgNode.addComponent(UITransform);
    bgTransform.setContentSize(screenSize.width, screenSize.height);
    
    const bgSprite = bgNode.addComponent(Sprite);
    bgSprite.color = new Color(0, 0, 0, 180);  // 半透明黑色
    bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    // 内容区域（白色半透明背景）
    const contentNode = new Node('Content');
    contentNode.layer = this.node.layer;
    contentNode.setParent(menuNode);
    contentNode.setPosition(0, 0, 0);
    
    const contentTransform = contentNode.addComponent(UITransform);
    contentTransform.setContentSize(screenSize.width * 0.85, screenSize.height * 0.7);
    
    const contentSprite = contentNode.addComponent(Sprite);
    contentSprite.color = new Color(40, 40, 50, 230);  // 深色背景
    contentSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    return menuNode;
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
    
    // 植物
    if (plot.plant) {
      const config = PLANT_CONFIGS[plot.plant.type];
      const emoji = getPlantEmoji(plot.plant);
      const isHardMode = plot.plant.hardMode;
      
      if (this.plantEmoji) this.plantEmoji.string = emoji;
      
      // 状态显示 - 硬核模式隐藏详细信息
      if (this.statusLabel) {
        if (isHardMode) {
          // 硬核模式：只显示植物名和模式
          const modeIcon = '🔥';
          this.statusLabel.string = `${config.name} ${modeIcon}`;
        } else {
          // 佛系模式：显示完整信息
          const healthEmoji = getHealthEmoji(plot.plant.healthState);
          const progress = (plot.plant.growthProgress * 100).toFixed(0);
          this.statusLabel.string = `${config.name} ${healthEmoji} ${plot.plant.healthValue.toFixed(0)}%\n生长: ${progress}%`;
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
    // 防止重复弹出
    if (this.activeMenu) {
      this.activeMenu.destroy();
      this.activeMenu = null;
    }
    
    // 创建带背景的菜单
    const menuNode = this.createMenuWithBackground('PlantMenu');
    this.activeMenu = menuNode;
    
    let yPos = 100;
    
    // 浇水按钮
    const waterBtn = this.createLabelOn(menuNode, 'Water', '💧 浇水', 48);
    waterBtn.node.setPosition(0, yPos, 0);
    const waterTransform = waterBtn.node.getComponent(UITransform);
    if (waterTransform) waterTransform.setContentSize(300, 80);
    waterBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.doWater();
      this.closeActiveMenu();
    }, this);
    yPos -= 100;
    
    // 收获按钮（仅成熟时显示）
    if (canHarvest) {
      const harvestBtn = this.createLabelOn(menuNode, 'Harvest', '🌾 收获', 48);
      harvestBtn.node.setPosition(0, yPos, 0);
      const harvestTransform = harvestBtn.node.getComponent(UITransform);
      if (harvestTransform) harvestTransform.setContentSize(300, 80);
      harvestBtn.node.on(Node.EventType.TOUCH_END, () => {
        this.doHarvest();
        this.closeActiveMenu();
      }, this);
      yPos -= 100;
    }
    
    // 挖除按钮
    const removeBtn = this.createLabelOn(menuNode, 'Remove', '🗑️ 挖除', 48);
    removeBtn.node.setPosition(0, yPos, 0);
    const removeTransform = removeBtn.node.getComponent(UITransform);
    if (removeTransform) removeTransform.setContentSize(300, 80);
    removeBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.showRemoveConfirm(menuNode);
    }, this);
    yPos -= 100;
    
    // 取消按钮
    const cancelBtn = this.createLabelOn(menuNode, 'Cancel', '❌ 取消', 36);
    cancelBtn.node.setPosition(0, yPos, 0);
    cancelBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.closeActiveMenu();
    }, this);
  }
  
  /**
   * 关闭当前活动菜单
   */
  closeActiveMenu() {
    if (this.activeMenu) {
      this.activeMenu.destroy();
      this.activeMenu = null;
    }
  }
  
  /**
   * 显示挖除确认
   */
  showRemoveConfirm(parentMenu: Node) {
    // 清除父菜单内容
    parentMenu.removeAllChildren();
    
    const warnLabel = this.createLabelOn(parentMenu, 'Warn', '⚠️ 确定要挖除这棵植物吗？', 36);
    warnLabel.node.setPosition(0, 50, 0);
    
    const hintLabel = this.createLabelOn(parentMenu, 'Hint', '挖除后无法恢复！', 28);
    hintLabel.node.setPosition(0, 0, 0);
    
    // 确认按钮
    const confirmBtn = this.createLabelOn(parentMenu, 'Confirm', '✅ 确认挖除', 40);
    confirmBtn.node.setPosition(0, -80, 0);
    const confirmTransform = confirmBtn.node.getComponent(UITransform);
    if (confirmTransform) confirmTransform.setContentSize(300, 70);
    confirmBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.doRemovePlant();
      this.closeActiveMenu();
    }, this);
    
    // 取消按钮
    const cancelBtn = this.createLabelOn(parentMenu, 'Cancel', '❌ 取消', 36);
    cancelBtn.node.setPosition(0, -160, 0);
    cancelBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.closeActiveMenu();
    }, this);
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
    if (!this.gameData) return;
    
    // 防止重复弹出
    if (this.activeMenu) {
      this.activeMenu.destroy();
      this.activeMenu = null;
    }
    
    const plot = this.gameData.plots[this.selectedPlot];
    
    // 创建带背景的菜单
    const menuNode = this.createMenuWithBackground('FacilityMenu');
    this.activeMenu = menuNode;
    
    // 标题
    const title = this.createLabelOn(menuNode, 'Title', '🏠 设施管理', 48);
    title.node.setPosition(0, 200, 0);
    
    // 遮雨棚
    const shelterText = plot.hasShelter ? '🏠 遮雨棚 ✅ (点击移除)' : '🏠 遮雨棚 (点击安装)';
    const shelterBtn = this.createLabelOn(menuNode, 'Shelter', shelterText, 36);
    shelterBtn.node.setPosition(0, 80, 0);
    const shelterTransform = shelterBtn.node.getComponent(UITransform);
    if (shelterTransform) shelterTransform.setContentSize(500, 70);
    shelterBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.toggleShelter();
      this.closeActiveMenu();
    }, this);
    
    // 遮雨棚说明
    const shelterHint = this.createLabelOn(menuNode, 'ShelterHint', '阻挡降雨，防止积涝（24小时后自动移除）', 24);
    shelterHint.node.setPosition(0, 30, 0);
    
    // 除湿器
    const dehumText = plot.hasDehumidifier ? '💨 除湿器 ✅ (点击移除)' : '💨 除湿器 (点击安装)';
    const dehumBtn = this.createLabelOn(menuNode, 'Dehum', dehumText, 36);
    dehumBtn.node.setPosition(0, -50, 0);
    const dehumTransform = dehumBtn.node.getComponent(UITransform);
    if (dehumTransform) dehumTransform.setContentSize(500, 70);
    dehumBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.toggleDehumidifier();
      this.closeActiveMenu();
    }, this);
    
    // 除湿器说明
    const dehumHint = this.createLabelOn(menuNode, 'DehumHint', '每小时降低 2% 土壤湿度', 24);
    dehumHint.node.setPosition(0, -100, 0);
    
    // 取消按钮
    const cancelBtn = this.createLabelOn(menuNode, 'Cancel', '❌ 关闭', 36);
    cancelBtn.node.setPosition(0, -200, 0);
    cancelBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.closeActiveMenu();
    }, this);
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
    if (this.selectPanel) {
      this.selectPanel.active = true;
      return;
    }
    
    const screenSize = view.getVisibleSize();
    
    // 创建选择面板
    this.selectPanel = new Node('SelectPanel');
    this.selectPanel.layer = this.node.layer;
    this.selectPanel.setParent(this.node);
    this.selectPanel.setPosition(0, 0, 0);
    
    const panelTransform = this.selectPanel.addComponent(UITransform);
    panelTransform.setContentSize(screenSize.width, screenSize.height);
    
    // 标题
    const titleLabel = this.createLabelOn(this.selectPanel, 'Title', '🌱 选择要种植的植物', 40);
    titleLabel.node.setPosition(0, 300, 0);
    
    // 植物选项
    const plants = [
      { type: PlantType.CLOVER, emoji: '🍀', name: '幸运草', y: 150 },
      { type: PlantType.SUNFLOWER, emoji: '🌻', name: '向日葵', y: 50 },
      { type: PlantType.STRAWBERRY, emoji: '🍓', name: '草莓', y: -50 },
      { type: PlantType.SAKURA, emoji: '🌸', name: '樱花', y: -150 },
    ];
    
    for (const p of plants) {
      const config = PLANT_CONFIGS[p.type];
      const btn = this.createLabelOn(this.selectPanel, p.name, 
        `${p.emoji} ${p.name}  ⭐${config.difficulty}  📅${config.growthDays}天`, 36);
      btn.node.setPosition(0, p.y, 0);
      
      const btnTransform = btn.node.getComponent(UITransform);
      if (btnTransform) btnTransform.setContentSize(500, 60);
      
      btn.node.on(Node.EventType.TOUCH_END, () => {
        this.showPlantConfirm(p.type);
      }, this);
    }
    
    // 取消按钮
    const cancelBtn = this.createLabelOn(this.selectPanel, 'Cancel', '❌ 取消', 36);
    cancelBtn.node.setPosition(0, -280, 0);
    cancelBtn.node.on(Node.EventType.TOUCH_END, () => {
      if (this.selectPanel) this.selectPanel.active = false;
    }, this);
  }
  
  /**
   * 显示种植确认界面
   */
  showPlantConfirm(type: PlantType) {
    const config = PLANT_CONFIGS[type];
    this.pendingPlantType = type;
    
    // 隐藏选择面板
    if (this.selectPanel) this.selectPanel.active = false;
    
    // 显示难度选择
    this.showDifficultySelect(config);
  }
  
  /**
   * 显示难度选择界面
   */
  showDifficultySelect(config: any) {
    if (this.difficultyPanel) {
      this.difficultyPanel.active = true;
      this.updateDifficultyPanel(config);
      return;
    }
    
    const screenSize = view.getVisibleSize();
    
    this.difficultyPanel = new Node('DifficultyPanel');
    this.difficultyPanel.layer = this.node.layer;
    this.difficultyPanel.setParent(this.node);
    this.difficultyPanel.setPosition(0, 0, 0);
    
    const panelTransform = this.difficultyPanel.addComponent(UITransform);
    panelTransform.setContentSize(screenSize.width, screenSize.height);
    
    this.updateDifficultyPanel(config);
  }
  
  /**
   * 更新难度选择面板
   */
  updateDifficultyPanel(config: any) {
    if (!this.difficultyPanel) return;
    
    this.difficultyPanel.removeAllChildren();
    
    // 标题
    const titleLabel = this.createLabelOn(this.difficultyPanel, 'Title',
      `${config.emoji} ${config.name}`, 56);
    titleLabel.node.setPosition(0, 300, 0);
    
    // 选择难度提示
    const hintLabel = this.createLabelOn(this.difficultyPanel, 'Hint',
      '选择游戏难度', 36);
    hintLabel.node.setPosition(0, 200, 0);
    
    // 佛系模式
    const normalBtn = this.createLabelOn(this.difficultyPanel, 'Normal',
      '🧘 佛系模式\n显示适宜温度、湿度等提示', 32);
    normalBtn.node.setPosition(0, 80, 0);
    const normalTransform = normalBtn.node.getComponent(UITransform);
    if (normalTransform) normalTransform.setContentSize(500, 100);
    normalBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.pendingHardMode = false;
      this.showConfirmPanel(config);
    }, this);
    
    // 硬核模式
    const hardBtn = this.createLabelOn(this.difficultyPanel, 'Hard',
      '💪 硬核模式\n无任何提示，全靠经验！', 32);
    hardBtn.node.setPosition(0, -60, 0);
    const hardTransform = hardBtn.node.getComponent(UITransform);
    if (hardTransform) hardTransform.setContentSize(500, 100);
    hardBtn.node.on(Node.EventType.TOUCH_END, () => {
      this.pendingHardMode = true;
      this.showConfirmPanel(config);
    }, this);
    
    // 返回按钮
    const backBtn = this.createLabelOn(this.difficultyPanel, 'Back', '❌ 返回', 36);
    backBtn.node.setPosition(0, -200, 0);
    backBtn.node.on(Node.EventType.TOUCH_END, () => {
      if (this.difficultyPanel) this.difficultyPanel.active = false;
      if (this.selectPanel) this.selectPanel.active = true;
    }, this);
  }
  
  /**
   * 显示最终确认面板
   */
  showConfirmPanel(config: any) {
    if (this.difficultyPanel) this.difficultyPanel.active = false;
    
    if (this.confirmPanel) {
      this.confirmPanel.active = true;
      this.updateConfirmPanel(config);
      return;
    }
    
    const screenSize = view.getVisibleSize();
    
    // 创建确认面板
    this.confirmPanel = new Node('ConfirmPanel');
    this.confirmPanel.layer = this.node.layer;
    this.confirmPanel.setParent(this.node);
    this.confirmPanel.setPosition(0, 0, 0);
    
    const panelTransform = this.confirmPanel.addComponent(UITransform);
    panelTransform.setContentSize(screenSize.width, screenSize.height);
    
    this.updateConfirmPanel(config);
  }
  
  /**
   * 更新确认面板内容
   */
  updateConfirmPanel(config: any) {
    if (!this.confirmPanel) return;
    
    // 清空旧内容
    this.confirmPanel.removeAllChildren();
    
    // 植物名称
    const modeText = this.pendingHardMode ? '🔥' : '🌿';
    const titleLabel = this.createLabelOn(this.confirmPanel, 'Title', 
      `${config.emoji} ${config.name} ${modeText}`, 56);
    titleLabel.node.setPosition(0, 300, 0);
    
    // 难度模式
    const modeLabel = this.createLabelOn(this.confirmPanel, 'Mode',
      this.pendingHardMode ? '硬核模式 - 无提示' : '佛系模式 - 有提示', 28);
    modeLabel.node.setPosition(0, 230, 0);
    
    // 难度星级
    const diffLabel = this.createLabelOn(this.confirmPanel, 'Diff',
      `难度: ${'⭐'.repeat(config.difficulty)}`, 32);
    diffLabel.node.setPosition(0, 170, 0);
    
    // 生长周期（始终显示）
    const growthLabel = this.createLabelOn(this.confirmPanel, 'Growth',
      `📅 成熟周期: ${config.growthDays} 天`, 32);
    growthLabel.node.setPosition(0, 110, 0);
    
    // 以下只在佛系模式显示
    if (!this.pendingHardMode) {
      // 温度要求
      const tempLabel = this.createLabelOn(this.confirmPanel, 'Temp',
        `🌡️ 适宜温度: ${config.tempMin}°C ~ ${config.tempMax}°C`, 28);
      tempLabel.node.setPosition(0, 50, 0);
      
      // 水分要求
      const waterLabel = this.createLabelOn(this.confirmPanel, 'Water',
        `💧 适宜湿度: ${config.moistureMin}% ~ ${config.moistureMax}%`, 28);
      waterLabel.node.setPosition(0, 0, 0);
      
      // 特性
      let traits = [];
      if (config.droughtTolerance >= 0.7) traits.push('耐旱');
      if (config.coldTolerance >= 0.7) traits.push('耐寒');
      if (config.heatTolerance >= 0.7) traits.push('耐热');
      if (config.needsVernalization) traits.push('需要春化');
      if (config.isAnnual) traits.push('一年生');
      
      const traitText = traits.length > 0 ? `🏷️ 特性: ${traits.join('、')}` : '🏷️ 无特殊特性';
      const traitLabel = this.createLabelOn(this.confirmPanel, 'Traits', traitText, 28);
      traitLabel.node.setPosition(0, -50, 0);
      
      // 规则提示
      const ruleLabel = this.createLabelOn(this.confirmPanel, 'Rule',
        '📜 需要每天关注天气，按时浇水\n极端天气可能导致植物死亡！', 24);
      ruleLabel.node.setPosition(0, -120, 0);
    } else {
      // 硬核模式只显示简单提示
      const hardHint = this.createLabelOn(this.confirmPanel, 'HardHint',
        '💪 硬核模式下不会显示任何提示\n你需要自己判断植物的状态！', 28);
      hardHint.node.setPosition(0, 0, 0);
    }
    
    // 确认按钮
    const confirmBtn = this.createLabelOn(this.confirmPanel, 'Confirm', '✅ 确认种植', 40);
    confirmBtn.node.setPosition(0, -230, 0);
    const confirmTransform = confirmBtn.node.getComponent(UITransform);
    if (confirmTransform) confirmTransform.setContentSize(300, 70);
    confirmBtn.node.on(Node.EventType.TOUCH_END, () => {
      if (this.pendingPlantType !== null) {
        this.doPlant(this.pendingPlantType, this.pendingHardMode);
        this.pendingPlantType = null;
      }
      if (this.confirmPanel) this.confirmPanel.active = false;
    }, this);
    
    // 取消按钮
    const cancelBtn = this.createLabelOn(this.confirmPanel, 'Cancel', '❌ 返回', 36);
    cancelBtn.node.setPosition(0, -310, 0);
    cancelBtn.node.on(Node.EventType.TOUCH_END, () => {
      if (this.confirmPanel) this.confirmPanel.active = false;
      if (this.difficultyPanel) this.difficultyPanel.active = true;
    }, this);
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
  doPlant(type: PlantType, hardMode: boolean = false) {
    if (!this.gameData) return;
    
    const plot = this.gameData.plots[this.selectedPlot];
    if (plot.plant) return;  // 已有植物
    
    this.gameData.plots[this.selectedPlot] = plantSeed(plot, type, hardMode);
    
    const config = PLANT_CONFIGS[type];
    const modeText = hardMode ? '（硬核模式）' : '';
    console.log(`🌱 种下了 ${config.name}${modeText}！`);
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
