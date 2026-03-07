/**
 * 程序化渲染测试
 * 用滑动条控制植物参数，实时预览
 */

import { _decorator, Component, Node, Label, Button, Color, UITransform, Graphics } from 'cc';
import { PlantData, createPlant, PLANT_CONFIGS } from './Plant';
import { ProceduralPlantRenderer } from './ProceduralPlantRenderer';
const { ccclass, property } = _decorator;

@ccclass('ProceduralTest')
export class ProceduralTest extends Component {
  
  // 植物渲染器节点
  private rendererNode: Node | null = null;
  private renderer: ProceduralPlantRenderer | null = null;
  
  // 植物数据
  private testPlant: PlantData | null = null;
  
  // UI 标签
  private progressLabel: Label | null = null;
  private heightLabel: Label | null = null;
  private leafLabel: Label | null = null;
  private tiltLabel: Label | null = null;
  
  start() {
    console.log('ProceduralTest start!');
    
    // 创建渲染器节点
    this.rendererNode = new Node('PlantRenderer');
    this.rendererNode.parent = this.node;
    this.rendererNode.layer = this.node.layer;
    this.rendererNode.setPosition(100, -120, 0);
    
    // 添加 UITransform
    const transform = this.rendererNode.addComponent(UITransform);
    transform.setContentSize(300, 400);
    
    // 添加 Graphics 组件
    this.rendererNode.addComponent(Graphics);
    
    // 添加渲染器组件
    this.renderer = this.rendererNode.addComponent(ProceduralPlantRenderer);
    
    // 创建测试植物
    this.testPlant = createPlant('clover', 'test-clover');
    this.testPlant.growthProgress = 0.5;
    this.testPlant.physicalTraits.height = 40;
    this.testPlant.physicalTraits.leafCount = 3;
    
    // 创建控制面板
    this.createControls();
    
    // 初始渲染
    this.updatePlant();
    
    console.log('ProceduralTest setup complete!');
  }
  
  updatePlant() {
    if (this.renderer && this.testPlant) {
      this.renderer.render(this.testPlant);
    }
  }
  
  createControls() {
    const panelX = -180;
    let y = 180;
    
    // 标题
    this.createLabel('🍀 程序化渲染', panelX, y, 18, Color.WHITE);
    y -= 40;
    
    // === 成熟度 ===
    this.createLabel('成熟度', panelX, y, 14, Color.WHITE);
    y -= 20;
    this.progressLabel = this.createLabel('50%', panelX, y, 14, new Color(150, 255, 150));
    y -= 25;
    this.createButton('-', panelX - 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.growthProgress = Math.max(0, this.testPlant.growthProgress - 0.1);
        this.progressLabel!.string = `${Math.round(this.testPlant.growthProgress * 100)}%`;
        this.updatePlant();
      }
    });
    this.createButton('+', panelX + 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.growthProgress = Math.min(1, this.testPlant.growthProgress + 0.1);
        this.progressLabel!.string = `${Math.round(this.testPlant.growthProgress * 100)}%`;
        this.updatePlant();
      }
    });
    y -= 40;
    
    // === 高度 ===
    this.createLabel('高度', panelX, y, 14, Color.WHITE);
    y -= 20;
    this.heightLabel = this.createLabel('40 cm', panelX, y, 14, new Color(150, 255, 150));
    y -= 25;
    this.createButton('-', panelX - 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.physicalTraits.height = Math.max(10, this.testPlant.physicalTraits.height - 10);
        this.heightLabel!.string = `${this.testPlant.physicalTraits.height} cm`;
        this.updatePlant();
      }
    });
    this.createButton('+', panelX + 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.physicalTraits.height = Math.min(100, this.testPlant.physicalTraits.height + 10);
        this.heightLabel!.string = `${this.testPlant.physicalTraits.height} cm`;
        this.updatePlant();
      }
    });
    y -= 40;
    
    // === 叶子数量 ===
    this.createLabel('叶子数量', panelX, y, 14, Color.WHITE);
    y -= 20;
    this.leafLabel = this.createLabel('3 片', panelX, y, 14, new Color(150, 255, 150));
    y -= 25;
    this.createButton('-', panelX - 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.physicalTraits.leafCount = Math.max(0, this.testPlant.physicalTraits.leafCount - 1);
        this.leafLabel!.string = `${this.testPlant.physicalTraits.leafCount} 片`;
        this.updatePlant();
      }
    });
    this.createButton('+', panelX + 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.physicalTraits.leafCount = Math.min(8, this.testPlant.physicalTraits.leafCount + 1);
        this.leafLabel!.string = `${this.testPlant.physicalTraits.leafCount} 片`;
        this.updatePlant();
      }
    });
    y -= 40;
    
    // === 倾斜角度 ===
    this.createLabel('倾斜角度', panelX, y, 14, Color.WHITE);
    y -= 20;
    this.tiltLabel = this.createLabel('0°', panelX, y, 14, new Color(150, 255, 150));
    y -= 25;
    this.createButton('←', panelX - 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.physicalTraits.tiltAngle = Math.max(-30, this.testPlant.physicalTraits.tiltAngle - 5);
        this.tiltLabel!.string = `${this.testPlant.physicalTraits.tiltAngle}°`;
        this.updatePlant();
      }
    });
    this.createButton('→', panelX + 40, y, 40, () => {
      if (this.testPlant) {
        this.testPlant.physicalTraits.tiltAngle = Math.min(30, this.testPlant.physicalTraits.tiltAngle + 5);
        this.tiltLabel!.string = `${this.testPlant.physicalTraits.tiltAngle}°`;
        this.updatePlant();
      }
    });
    y -= 50;
    
    // === 预设按钮 ===
    this.createButton('🌱 幼苗', panelX, y, 100, () => this.setPreset('seedling'));
    y -= 35;
    this.createButton('🌿 生长', panelX, y, 100, () => this.setPreset('growing'));
    y -= 35;
    this.createButton('🍀 成熟', panelX, y, 100, () => this.setPreset('mature'));
    y -= 35;
    this.createButton('💮 开花', panelX, y, 100, () => this.setPreset('blooming'));
  }
  
  setPreset(preset: string) {
    if (!this.testPlant) return;
    
    const presets: { [key: string]: any } = {
      seedling: { progress: 0.12, height: 15, leaves: 1, tilt: 0 },
      growing: { progress: 0.5, height: 40, leaves: 3, tilt: 5 },
      mature: { progress: 0.85, height: 60, leaves: 5, tilt: -3 },
      blooming: { progress: 1.0, height: 70, leaves: 6, tilt: 0 }
    };
    
    const p = presets[preset];
    if (!p) return;
    
    this.testPlant.growthProgress = p.progress;
    this.testPlant.physicalTraits.height = p.height;
    this.testPlant.physicalTraits.leafCount = p.leaves;
    this.testPlant.physicalTraits.tiltAngle = p.tilt;
    
    // 更新标签
    this.progressLabel!.string = `${Math.round(p.progress * 100)}%`;
    this.heightLabel!.string = `${p.height} cm`;
    this.leafLabel!.string = `${p.leaves} 片`;
    this.tiltLabel!.string = `${p.tilt}°`;
    
    this.updatePlant();
  }
  
  createLabel(text: string, x: number, y: number, fontSize: number, color: Color): Label {
    const node = new Node('Label');
    node.parent = this.node;
    node.layer = this.node.layer;
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    
    node.setPosition(x, y, 0);
    return label;
  }
  
  createButton(text: string, x: number, y: number, width: number, onClick: () => void) {
    const btnNode = new Node('Button');
    btnNode.parent = this.node;
    btnNode.layer = this.node.layer;
    
    const transform = btnNode.addComponent(UITransform);
    transform.setContentSize(width, 28);
    
    const g = btnNode.addComponent(Graphics);
    g.fillColor = new Color(50, 90, 50, 255);
    g.roundRect(-width/2, -14, width, 28, 4);
    g.fill();
    
    const button = btnNode.addComponent(Button);
    button.transition = Button.Transition.SCALE;
    
    const labelNode = new Node('Label');
    labelNode.parent = btnNode;
    labelNode.layer = btnNode.layer;
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 14;
    label.color = Color.WHITE;
    
    btnNode.on(Button.EventType.CLICK, onClick);
    btnNode.setPosition(x, y, 0);
  }
}
