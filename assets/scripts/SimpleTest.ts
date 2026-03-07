/**
 * 简单测试 - 直接显示植物素材
 */

import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Color, Label, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SimpleTest')
export class SimpleTest extends Component {
  
  @property(SpriteFrame)
  sproutSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  cloverSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  flowerSprite: SpriteFrame | null = null;
  
  private currentStage: number = 0;
  private displayNode: Node | null = null;
  
  start() {
    console.log('SimpleTest start!');
    
    // 创建显示节点
    this.displayNode = new Node('PlantDisplay');
    this.displayNode.parent = this.node;
    this.displayNode.layer = this.node.layer;
    
    const sprite = this.displayNode.addComponent(Sprite);
    const transform = this.displayNode.addComponent(UITransform);
    transform.setContentSize(300, 300);
    
    this.displayNode.setPosition(0, 50, 0);
    
    // 显示第一阶段
    this.showStage(0);
    
    // 创建切换按钮
    this.createButton('上一阶段', -100, -200, () => this.prevStage());
    this.createButton('下一阶段', 100, -200, () => this.nextStage());
    
    // 阶段标签
    this.createStageLabel();
    
    console.log('SimpleTest setup complete!');
  }
  
  showStage(stage: number) {
    if (!this.displayNode) return;
    
    const sprite = this.displayNode.getComponent(Sprite);
    if (!sprite) return;
    
    const sprites = [this.sproutSprite, this.cloverSprite, this.flowerSprite];
    const sizes = [[150, 200], [250, 350], [100, 100]];
    
    if (stage >= 0 && stage < sprites.length && sprites[stage]) {
      sprite.spriteFrame = sprites[stage];
      sprite.sizeMode = Sprite.SizeMode.TRIMMED;
      
      const transform = this.displayNode.getComponent(UITransform);
      if (transform) {
        transform.setContentSize(sizes[stage][0], sizes[stage][1]);
      }
    }
    
    this.currentStage = stage;
    this.updateLabel();
  }
  
  prevStage() {
    const newStage = Math.max(0, this.currentStage - 1);
    this.showStage(newStage);
  }
  
  nextStage() {
    const newStage = Math.min(2, this.currentStage + 1);
    this.showStage(newStage);
  }
  
  private stageLabel: Label | null = null;
  
  createStageLabel() {
    const labelNode = new Node('StageLabel');
    labelNode.parent = this.node;
    labelNode.layer = this.node.layer;
    
    const label = labelNode.addComponent(Label);
    label.string = '阶段: 发芽';
    label.fontSize = 24;
    label.color = Color.WHITE;
    
    labelNode.setPosition(0, -130, 0);
    this.stageLabel = label;
  }
  
  updateLabel() {
    if (!this.stageLabel) return;
    const names = ['🌱 发芽', '🍀 成熟', '💮 开花'];
    this.stageLabel.string = names[this.currentStage] || '未知';
  }
  
  createButton(text: string, x: number, y: number, onClick: () => void) {
    const btnNode = new Node('Button_' + text);
    btnNode.parent = this.node;
    btnNode.layer = this.node.layer;
    
    // 添加 UITransform 和 Sprite（作为按钮背景）
    const transform = btnNode.addComponent(UITransform);
    transform.setContentSize(120, 40);
    
    const sprite = btnNode.addComponent(Sprite);
    sprite.color = new Color(60, 120, 60, 255);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    
    // 添加 Button 组件
    const button = btnNode.addComponent(Button);
    button.transition = Button.Transition.COLOR;
    button.normalColor = new Color(60, 120, 60, 255);
    button.hoverColor = new Color(80, 160, 80, 255);
    button.pressedColor = new Color(40, 80, 40, 255);
    
    // 文字
    const labelNode = new Node('Label');
    labelNode.parent = btnNode;
    labelNode.layer = btnNode.layer;
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 18;
    label.color = Color.WHITE;
    
    // 点击事件
    btnNode.on(Button.EventType.CLICK, onClick);
    
    btnNode.setPosition(x, y, 0);
  }
}
