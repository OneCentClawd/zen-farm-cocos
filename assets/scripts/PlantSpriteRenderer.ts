/**
 * 植物精灵渲染器（方案二：AI素材动态组装）
 * 根据 PlantData 动态组装 Sprite 显示植物
 */

import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform, Vec3, Color, resources, ImageAsset, Texture2D, assetManager } from 'cc';
import { PlantData, PLANT_CONFIGS, getCurrentStage } from './Plant';
const { ccclass, property } = _decorator;

// 生长阶段枚举
enum GrowthPhase {
  SEED = 0,      // 种子
  SPROUT = 1,    // 发芽
  SEEDLING = 2,  // 幼苗
  GROWING = 3,   // 生长期
  MATURE = 4,    // 成熟期
  BLOOMING = 5   // 开花期
}

@ccclass('PlantSpriteRenderer')
export class PlantSpriteRenderer extends Component {
  
  // 素材引用（在编辑器中拖入）
  @property(SpriteFrame)
  sproutSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  stemSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  smallLeafSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  fullCloverSprite: SpriteFrame | null = null;
  
  @property(SpriteFrame)
  flowerSprite: SpriteFrame | null = null;
  
  // 动态创建的节点
  private plantContainer: Node | null = null;
  private stemNode: Node | null = null;
  private leafNodes: Node[] = [];
  private flowerNode: Node | null = null;
  
  onLoad() {
    // 创建植物容器
    this.plantContainer = new Node('PlantContainer');
    this.plantContainer.parent = this.node;
    this.plantContainer.setPosition(0, 0, 0);
  }
  
  /**
   * 根据植物数据渲染
   */
  render(plant: PlantData) {
    if (!this.plantContainer) return;
    
    // 清除旧内容
    this.clear();
    
    // 获取生长阶段
    const phase = this.getGrowthPhase(plant);
    const traits = plant.physicalTraits;
    
    // 根据阶段选择渲染方式
    switch (phase) {
      case GrowthPhase.SEED:
        this.renderSeed();
        break;
      case GrowthPhase.SPROUT:
        this.renderSprout(traits);
        break;
      case GrowthPhase.SEEDLING:
        this.renderSeedling(traits);
        break;
      case GrowthPhase.GROWING:
      case GrowthPhase.MATURE:
        this.renderFullPlant(traits, phase === GrowthPhase.MATURE);
        break;
      case GrowthPhase.BLOOMING:
        this.renderFullPlant(traits, true);
        this.renderFlower(traits);
        break;
    }
    
    // 应用倾斜
    if (this.plantContainer) {
      this.plantContainer.setRotationFromEuler(0, 0, -traits.tiltAngle);
    }
  }
  
  /**
   * 获取生长阶段
   */
  private getGrowthPhase(plant: PlantData): GrowthPhase {
    const progress = plant.growthProgress;
    const stage = getCurrentStage(plant);
    
    if (progress < 0.05) return GrowthPhase.SEED;
    if (progress < 0.15) return GrowthPhase.SPROUT;
    if (progress < 0.3) return GrowthPhase.SEEDLING;
    if (progress < 0.6) return GrowthPhase.GROWING;
    if (stage.index >= 3) return GrowthPhase.BLOOMING;  // 开花期
    return GrowthPhase.MATURE;
  }
  
  /**
   * 渲染种子
   */
  private renderSeed() {
    // 简单的棕色椭圆（用代码画或者加载种子素材）
    const seedNode = new Node('Seed');
    seedNode.parent = this.plantContainer;
    seedNode.layer = this.node.layer;
    
    const sprite = seedNode.addComponent(Sprite);
    // 如果有种子素材就用，没有就用颜色块
    if (this.sproutSprite) {
      sprite.spriteFrame = this.sproutSprite;
      const transform = seedNode.getComponent(UITransform) || seedNode.addComponent(UITransform);
      transform.setContentSize(20, 15);
    }
    seedNode.setPosition(0, 5, 0);
    seedNode.setScale(0.3, 0.3, 1);
  }
  
  /**
   * 渲染发芽期
   */
  private renderSprout(traits: PlantData['physicalTraits']) {
    if (!this.sproutSprite || !this.plantContainer) return;
    
    const sproutNode = new Node('Sprout');
    sproutNode.parent = this.plantContainer;
    sproutNode.layer = this.node.layer;
    
    const sprite = sproutNode.addComponent(Sprite);
    sprite.spriteFrame = this.sproutSprite;
    
    const transform = sproutNode.getComponent(UITransform) || sproutNode.addComponent(UITransform);
    
    // 根据高度缩放
    const scale = Math.max(0.3, traits.height / 30);
    const baseSize = 100;
    transform.setContentSize(baseSize * scale, baseSize * scale);
    
    // 锚点在底部
    transform.anchorY = 0;
    sproutNode.setPosition(0, 0, 0);
  }
  
  /**
   * 渲染幼苗期
   */
  private renderSeedling(traits: PlantData['physicalTraits']) {
    if (!this.plantContainer) return;
    
    // 画茎
    if (this.stemSprite) {
      this.stemNode = new Node('Stem');
      this.stemNode.parent = this.plantContainer;
      this.stemNode.layer = this.node.layer;
      
      const sprite = this.stemNode.addComponent(Sprite);
      sprite.spriteFrame = this.stemSprite;
      
      const transform = this.stemNode.getComponent(UITransform) || this.stemNode.addComponent(UITransform);
      const stemHeight = traits.height * 2;
      const stemWidth = Math.max(8, traits.stemWidth * 3);
      transform.setContentSize(stemWidth, stemHeight);
      transform.anchorY = 0;
      this.stemNode.setPosition(0, 0, 0);
    }
    
    // 顶部小叶子
    if (this.smallLeafSprite) {
      const leafNode = new Node('SmallLeaf');
      leafNode.parent = this.plantContainer;
      leafNode.layer = this.node.layer;
      
      const sprite = leafNode.addComponent(Sprite);
      sprite.spriteFrame = this.smallLeafSprite;
      
      const transform = leafNode.getComponent(UITransform) || leafNode.addComponent(UITransform);
      const leafSize = 40 + traits.leafCount * 10;
      transform.setContentSize(leafSize, leafSize);
      transform.anchorY = 0;
      
      leafNode.setPosition(0, traits.height * 2, 0);
      this.leafNodes.push(leafNode);
    }
  }
  
  /**
   * 渲染完整植物（生长期/成熟期）
   */
  private renderFullPlant(traits: PlantData['physicalTraits'], isMature: boolean) {
    if (!this.fullCloverSprite || !this.plantContainer) return;
    
    const cloverNode = new Node('FullClover');
    cloverNode.parent = this.plantContainer;
    cloverNode.layer = this.node.layer;
    
    const sprite = cloverNode.addComponent(Sprite);
    sprite.spriteFrame = this.fullCloverSprite;
    
    const transform = cloverNode.getComponent(UITransform) || cloverNode.addComponent(UITransform);
    
    // 根据高度和成熟度计算尺寸
    const baseScale = isMature ? 1.2 : 0.8;
    const heightFactor = traits.height / 50;  // 基准高度50cm
    const scale = baseScale * Math.min(2, Math.max(0.5, heightFactor));
    
    const baseSize = 150;
    transform.setContentSize(baseSize * scale, baseSize * scale);
    transform.anchorY = 0;
    
    cloverNode.setPosition(0, 0, 0);
    
    // 根据健康度调整颜色
    const health = traits.leafColor / 100;  // 用 leafColor 模拟健康度
    const tint = new Color(
      255,
      Math.round(200 + health * 55),
      Math.round(200 + health * 55),
      255
    );
    sprite.color = tint;
    
    this.leafNodes.push(cloverNode);
  }
  
  /**
   * 渲染花朵
   */
  private renderFlower(traits: PlantData['physicalTraits']) {
    if (!this.flowerSprite || !this.plantContainer) return;
    
    this.flowerNode = new Node('Flower');
    this.flowerNode.parent = this.plantContainer;
    this.flowerNode.layer = this.node.layer;
    
    const sprite = this.flowerNode.addComponent(Sprite);
    sprite.spriteFrame = this.flowerSprite;
    
    const transform = this.flowerNode.getComponent(UITransform) || this.flowerNode.addComponent(UITransform);
    transform.setContentSize(50, 50);
    
    // 花朵在顶部
    const flowerY = traits.height * 2 + 60;
    this.flowerNode.setPosition(0, flowerY, 0);
  }
  
  /**
   * 清除所有渲染内容
   */
  clear() {
    if (this.plantContainer) {
      this.plantContainer.removeAllChildren();
    }
    this.stemNode = null;
    this.leafNodes = [];
    this.flowerNode = null;
  }
  
  /**
   * 设置整体缩放
   */
  setScale(scale: number) {
    if (this.plantContainer) {
      this.plantContainer.setScale(scale, scale, 1);
    }
  }
}
