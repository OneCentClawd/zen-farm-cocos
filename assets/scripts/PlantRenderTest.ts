/**
 * 植物渲染测试场景
 * 用滑动条和按钮手动调整植物参数
 */

import { _decorator, Component, Node, Label, Slider, Button, Sprite, SpriteFrame, UITransform, Color, EditBox, Canvas, Widget, ScrollView, Layout } from 'cc';
import { PlantData, createPlant, PLANT_CONFIGS } from './Plant';
import { PlantSpriteRenderer } from './PlantSpriteRenderer';
const { ccclass, property } = _decorator;

@ccclass('PlantRenderTest')
export class PlantRenderTest extends Component {
  
  @property(PlantSpriteRenderer)
  plantRenderer: PlantSpriteRenderer | null = null;
  
  // UI 引用
  private progressSlider: Node | null = null;
  private progressLabel: Label | null = null;
  private heightSlider: Node | null = null;
  private heightLabel: Label | null = null;
  private tiltSlider: Node | null = null;
  private tiltLabel: Label | null = null;
  private leafCountLabel: Label | null = null;
  
  // 植物数据
  private testPlant: PlantData | null = null;
  
  start() {
    // 创建测试植物
    this.testPlant = createPlant('clover', 'test-clover-001');
    
    // 创建 UI
    this.createUI();
    
    // 初始渲染
    this.updatePlant();
  }
  
  createUI() {
    const canvas = this.node;
    
    // === 控制面板背景 ===
    const panel = this.createPanel(canvas, 'ControlPanel', -280, 0, 200, 400);
    
    let yPos = 160;
    
    // === 标题 ===
    this.createLabel(panel, '🍀 植物测试', 0, yPos, 24, Color.WHITE);
    yPos -= 50;
    
    // === 成熟度滑动条 ===
    this.createLabel(panel, '成熟度 (Progress)', 0, yPos, 16, Color.WHITE);
    yPos -= 25;
    this.progressLabel = this.createLabel(panel, '0%', 0, yPos, 14, new Color(200, 255, 200));
    yPos -= 30;
    this.progressSlider = this.createSlider(panel, 0, yPos, 0, (value) => {
      if (this.testPlant) {
        this.testPlant.growthProgress = value;
        this.progressLabel!.string = `${Math.round(value * 100)}%`;
        this.updatePlant();
      }
    });
    yPos -= 50;
    
    // === 高度滑动条 ===
    this.createLabel(panel, '高度 (Height)', 0, yPos, 16, Color.WHITE);
    yPos -= 25;
    this.heightLabel = this.createLabel(panel, '0 cm', 0, yPos, 14, new Color(200, 255, 200));
    yPos -= 30;
    this.heightSlider = this.createSlider(panel, 0, yPos, 0, (value) => {
      if (this.testPlant) {
        const maxHeight = PLANT_CONFIGS['clover'].maxHeight;
        this.testPlant.physicalTraits.height = value * maxHeight;
        this.heightLabel!.string = `${Math.round(value * maxHeight)} cm`;
        this.updatePlant();
      }
    });
    yPos -= 50;
    
    // === 倾斜角度滑动条 ===
    this.createLabel(panel, '倾斜角度 (Tilt)', 0, yPos, 16, Color.WHITE);
    yPos -= 25;
    this.tiltLabel = this.createLabel(panel, '0°', 0, yPos, 14, new Color(200, 255, 200));
    yPos -= 30;
    this.tiltSlider = this.createSlider(panel, 0, yPos, 0.5, (value) => {
      if (this.testPlant) {
        const tilt = (value - 0.5) * 60;  // -30° to +30°
        this.testPlant.physicalTraits.tiltAngle = tilt;
        this.tiltLabel!.string = `${Math.round(tilt)}°`;
        this.updatePlant();
      }
    });
    yPos -= 50;
    
    // === 叶子数量按钮 ===
    this.createLabel(panel, '叶子数量', 0, yPos, 16, Color.WHITE);
    yPos -= 25;
    this.leafCountLabel = this.createLabel(panel, '0 片', 0, yPos, 14, new Color(200, 255, 200));
    yPos -= 35;
    
    // - 和 + 按钮
    this.createButton(panel, '-', -40, yPos, 50, 35, () => {
      if (this.testPlant && this.testPlant.physicalTraits.leafCount > 0) {
        this.testPlant.physicalTraits.leafCount--;
        this.leafCountLabel!.string = `${this.testPlant.physicalTraits.leafCount} 片`;
        this.updatePlant();
      }
    });
    this.createButton(panel, '+', 40, yPos, 50, 35, () => {
      if (this.testPlant && this.testPlant.physicalTraits.leafCount < 10) {
        this.testPlant.physicalTraits.leafCount++;
        this.leafCountLabel!.string = `${this.testPlant.physicalTraits.leafCount} 片`;
        this.updatePlant();
      }
    });
    yPos -= 50;
    
    // === 快捷按钮 ===
    this.createButton(panel, '🌱 幼苗', 0, yPos, 150, 35, () => this.setPreset('seedling'));
    yPos -= 45;
    this.createButton(panel, '🌿 生长', 0, yPos, 150, 35, () => this.setPreset('growing'));
    yPos -= 45;
    this.createButton(panel, '🍀 成熟', 0, yPos, 150, 35, () => this.setPreset('mature'));
  }
  
  /**
   * 创建面板背景
   */
  createPanel(parent: Node, name: string, x: number, y: number, w: number, h: number): Node {
    const panel = new Node(name);
    panel.parent = parent;
    panel.layer = parent.layer;
    
    const transform = panel.addComponent(UITransform);
    transform.setContentSize(w, h);
    
    const sprite = panel.addComponent(Sprite);
    sprite.color = new Color(40, 60, 40, 200);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    panel.setPosition(x, y, 0);
    
    return panel;
  }
  
  /**
   * 创建文字标签
   */
  createLabel(parent: Node, text: string, x: number, y: number, fontSize: number, color: Color): Label {
    const node = new Node('Label');
    node.parent = parent;
    node.layer = parent.layer;
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    
    const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
    transform.setContentSize(180, fontSize + 10);
    
    node.setPosition(x, y, 0);
    
    return label;
  }
  
  /**
   * 创建滑动条
   */
  createSlider(parent: Node, x: number, y: number, defaultValue: number, onChange: (value: number) => void): Node {
    const sliderNode = new Node('Slider');
    sliderNode.parent = parent;
    sliderNode.layer = parent.layer;
    
    const transform = sliderNode.addComponent(UITransform);
    transform.setContentSize(160, 20);
    
    // 背景条
    const bgNode = new Node('Background');
    bgNode.parent = sliderNode;
    bgNode.layer = sliderNode.layer;
    const bgTransform = bgNode.addComponent(UITransform);
    bgTransform.setContentSize(160, 8);
    const bgSprite = bgNode.addComponent(Sprite);
    bgSprite.color = new Color(80, 100, 80, 255);
    bgSprite.type = Sprite.Type.SIMPLE;
    bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    // 填充条
    const fillNode = new Node('Fill');
    fillNode.parent = sliderNode;
    fillNode.layer = sliderNode.layer;
    const fillTransform = fillNode.addComponent(UITransform);
    fillTransform.setContentSize(80, 8);
    fillTransform.anchorX = 0;
    const fillSprite = fillNode.addComponent(Sprite);
    fillSprite.color = new Color(100, 200, 100, 255);
    fillSprite.type = Sprite.Type.SIMPLE;
    fillSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    fillNode.setPosition(-80, 0, 0);
    
    // 滑块
    const handleNode = new Node('Handle');
    handleNode.parent = sliderNode;
    handleNode.layer = sliderNode.layer;
    const handleTransform = handleNode.addComponent(UITransform);
    handleTransform.setContentSize(20, 20);
    const handleSprite = handleNode.addComponent(Sprite);
    handleSprite.color = new Color(200, 255, 200, 255);
    handleSprite.type = Sprite.Type.SIMPLE;
    handleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    // Slider 组件
    const slider = sliderNode.addComponent(Slider);
    slider.handle = handleNode.getComponent(Sprite);
    slider.progress = defaultValue;
    
    // 事件监听
    sliderNode.on('slide', (sl: Slider) => {
      const progress = sl.progress;
      fillTransform.setContentSize(160 * progress, 8);
      handleNode.setPosition(-80 + 160 * progress, 0, 0);
      onChange(progress);
    });
    
    // 初始位置
    fillTransform.setContentSize(160 * defaultValue, 8);
    handleNode.setPosition(-80 + 160 * defaultValue, 0, 0);
    
    sliderNode.setPosition(x, y, 0);
    
    return sliderNode;
  }
  
  /**
   * 创建按钮
   */
  createButton(parent: Node, text: string, x: number, y: number, w: number, h: number, onClick: () => void): Node {
    const btnNode = new Node('Button');
    btnNode.parent = parent;
    btnNode.layer = parent.layer;
    
    const transform = btnNode.addComponent(UITransform);
    transform.setContentSize(w, h);
    
    const sprite = btnNode.addComponent(Sprite);
    sprite.color = new Color(80, 140, 80, 255);
    sprite.type = Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    const button = btnNode.addComponent(Button);
    button.transition = Button.Transition.COLOR;
    button.normalColor = new Color(80, 140, 80, 255);
    button.hoverColor = new Color(100, 180, 100, 255);
    button.pressedColor = new Color(60, 100, 60, 255);
    
    // 文字
    const labelNode = new Node('Label');
    labelNode.parent = btnNode;
    labelNode.layer = btnNode.layer;
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 16;
    label.color = Color.WHITE;
    
    // 点击事件
    btnNode.on(Button.EventType.CLICK, onClick);
    
    btnNode.setPosition(x, y, 0);
    
    return btnNode;
  }
  
  /**
   * 设置预设值
   */
  setPreset(preset: 'seedling' | 'growing' | 'mature') {
    if (!this.testPlant) return;
    
    const presets = {
      seedling: { progress: 0.15, height: 8, tilt: 0, leaves: 1 },
      growing: { progress: 0.5, height: 25, tilt: 5, leaves: 3 },
      mature: { progress: 1.0, height: 50, tilt: -3, leaves: 6 }
    };
    
    const p = presets[preset];
    this.testPlant.growthProgress = p.progress;
    this.testPlant.physicalTraits.height = p.height;
    this.testPlant.physicalTraits.tiltAngle = p.tilt;
    this.testPlant.physicalTraits.leafCount = p.leaves;
    
    // 更新 UI 显示
    this.progressLabel!.string = `${Math.round(p.progress * 100)}%`;
    this.heightLabel!.string = `${p.height} cm`;
    this.tiltLabel!.string = `${p.tilt}°`;
    this.leafCountLabel!.string = `${p.leaves} 片`;
    
    this.updatePlant();
  }
  
  /**
   * 更新植物渲染
   */
  updatePlant() {
    if (this.plantRenderer && this.testPlant) {
      this.plantRenderer.render(this.testPlant);
    }
  }
}
