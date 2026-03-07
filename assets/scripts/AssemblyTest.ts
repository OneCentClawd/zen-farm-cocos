/**
 * 组装测试 - 茎秆 + 叶子动态组装
 */

import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Color, Label, Button, Slider } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AssemblyTest')
export class AssemblyTest extends Component {
  
  @property(SpriteFrame)
  stemSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  leafSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  flowerSprite: SpriteFrame | null = null;
  
  // 植物容器
  private plantContainer: Node | null = null;
  private stemNode: Node | null = null;
  private leafNodes: Node[] = [];
  private flowerNode: Node | null = null;
  
  // 当前参数
  private stemHeight: number = 200;
  private stemWidth: number = 8;
  private leafCount: number = 3;
  private hasFlower: boolean = false;
  
  // UI
  private heightLabel: Label | null = null;
  private leafLabel: Label | null = null;
  
  start() {
    console.log('AssemblyTest start!');
    
    // 创建植物容器
    this.plantContainer = new Node('PlantContainer');
    this.plantContainer.parent = this.node;
    this.plantContainer.layer = this.node.layer;
    this.plantContainer.setPosition(100, -100, 0);
    
    // 初始构建
    this.buildPlant();
    
    // 创建控制 UI
    this.createControls();
    
    console.log('AssemblyTest setup complete!');
  }
  
  /**
   * 构建植物（茎秆 + 叶子 + 花）
   */
  buildPlant() {
    if (!this.plantContainer) return;
    
    // 清除旧内容
    this.plantContainer.removeAllChildren();
    this.leafNodes = [];
    
    // 1. 创建茎秆
    if (this.stemSprite) {
      this.stemNode = new Node('Stem');
      this.stemNode.parent = this.plantContainer;
      this.stemNode.layer = this.plantContainer.layer;
      
      const sprite = this.stemNode.addComponent(Sprite);
      sprite.spriteFrame = this.stemSprite;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      sprite.color = new Color(100, 180, 100, 255);
      
      const transform = this.stemNode.addComponent(UITransform);
      transform.setContentSize(this.stemWidth, this.stemHeight);
      transform.anchorY = 0;  // 锚点在底部
      
      this.stemNode.setPosition(0, 0, 0);
    }
    
    // 2. 创建叶子（沿着茎秆分布）
    if (this.leafSprite) {
      for (let i = 0; i < this.leafCount; i++) {
        const leafNode = new Node('Leaf_' + i);
        leafNode.parent = this.plantContainer;
        leafNode.layer = this.plantContainer.layer;
        
        const sprite = leafNode.addComponent(Sprite);
        sprite.spriteFrame = this.leafSprite;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        const transform = leafNode.addComponent(UITransform);
        // 叶子大小随高度递增
        const leafSize = 60 + i * 15;
        transform.setContentSize(leafSize, leafSize);
        
        // 叶子位置：沿茎秆交替分布
        const leafY = 30 + (this.stemHeight / (this.leafCount + 1)) * (i + 1);
        const leafX = (i % 2 === 0 ? -1 : 1) * (20 + leafSize / 3);
        leafNode.setPosition(leafX, leafY, 0);
        
        // 叶子角度：左右交替倾斜
        const angle = (i % 2 === 0 ? 15 : -15) + (Math.random() - 0.5) * 10;
        leafNode.setRotationFromEuler(0, 0, angle);
        
        this.leafNodes.push(leafNode);
      }
    }
    
    // 3. 顶部大叶子或花
    if (this.hasFlower && this.flowerSprite) {
      this.flowerNode = new Node('Flower');
      this.flowerNode.parent = this.plantContainer;
      this.flowerNode.layer = this.plantContainer.layer;
      
      const sprite = this.flowerNode.addComponent(Sprite);
      sprite.spriteFrame = this.flowerSprite;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      
      const transform = this.flowerNode.addComponent(UITransform);
      transform.setContentSize(60, 60);
      
      this.flowerNode.setPosition(0, this.stemHeight + 30, 0);
    } else if (this.leafSprite) {
      // 顶部大叶子
      const topLeaf = new Node('TopLeaf');
      topLeaf.parent = this.plantContainer;
      topLeaf.layer = this.plantContainer.layer;
      
      const sprite = topLeaf.addComponent(Sprite);
      sprite.spriteFrame = this.leafSprite;
      sprite.sizeMode = Sprite.SizeMode.CUSTOM;
      
      const transform = topLeaf.addComponent(UITransform);
      transform.setContentSize(100, 100);
      
      topLeaf.setPosition(0, this.stemHeight, 0);
      this.leafNodes.push(topLeaf);
    }
  }
  
  /**
   * 创建控制面板
   */
  createControls() {
    const panelX = -180;
    let y = 150;
    
    // 标题
    this.createLabel('🌿 组装测试', panelX, y, 20, Color.WHITE);
    y -= 40;
    
    // 茎秆高度
    this.createLabel('茎秆高度', panelX, y, 14, Color.WHITE);
    y -= 20;
    this.heightLabel = this.createLabel(`${this.stemHeight}px`, panelX, y, 14, new Color(150, 255, 150));
    y -= 30;
    this.createButton('-', panelX - 40, y, 40, () => {
      this.stemHeight = Math.max(50, this.stemHeight - 30);
      this.heightLabel!.string = `${this.stemHeight}px`;
      this.buildPlant();
    });
    this.createButton('+', panelX + 40, y, 40, () => {
      this.stemHeight = Math.min(400, this.stemHeight + 30);
      this.heightLabel!.string = `${this.stemHeight}px`;
      this.buildPlant();
    });
    y -= 50;
    
    // 叶子数量
    this.createLabel('叶子数量', panelX, y, 14, Color.WHITE);
    y -= 20;
    this.leafLabel = this.createLabel(`${this.leafCount}片`, panelX, y, 14, new Color(150, 255, 150));
    y -= 30;
    this.createButton('-', panelX - 40, y, 40, () => {
      this.leafCount = Math.max(0, this.leafCount - 1);
      this.leafLabel!.string = `${this.leafCount}片`;
      this.buildPlant();
    });
    this.createButton('+', panelX + 40, y, 40, () => {
      this.leafCount = Math.min(8, this.leafCount + 1);
      this.leafLabel!.string = `${this.leafCount}片`;
      this.buildPlant();
    });
    y -= 50;
    
    // 茎秆粗细
    this.createLabel('茎秆粗细', panelX, y, 14, Color.WHITE);
    y -= 30;
    this.createButton('细', panelX - 40, y, 40, () => {
      this.stemWidth = Math.max(3, this.stemWidth - 2);
      this.buildPlant();
    });
    this.createButton('粗', panelX + 40, y, 40, () => {
      this.stemWidth = Math.min(20, this.stemWidth + 2);
      this.buildPlant();
    });
    y -= 50;
    
    // 开花
    this.createButton('🌸 开花', panelX, y, 100, () => {
      this.hasFlower = !this.hasFlower;
      this.buildPlant();
    });
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
    const btnNode = new Node('Button_' + text);
    btnNode.parent = this.node;
    btnNode.layer = this.node.layer;
    
    const transform = btnNode.addComponent(UITransform);
    transform.setContentSize(width, 30);
    
    const sprite = btnNode.addComponent(Sprite);
    sprite.color = new Color(60, 100, 60, 255);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    const button = btnNode.addComponent(Button);
    button.transition = Button.Transition.COLOR;
    button.normalColor = new Color(60, 100, 60, 255);
    button.hoverColor = new Color(80, 140, 80, 255);
    button.pressedColor = new Color(40, 70, 40, 255);
    
    const labelNode = new Node('Label');
    labelNode.parent = btnNode;
    labelNode.layer = btnNode.layer;
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 16;
    label.color = Color.WHITE;
    
    btnNode.on(Button.EventType.CLICK, onClick);
    btnNode.setPosition(x, y, 0);
  }
}
