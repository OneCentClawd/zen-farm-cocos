/**
 * 🎨 弹窗管理器 - 统一管理弹窗样式
 */

import { Node, UITransform, view, Color, Graphics, Label } from 'cc';

/**
 * 弹窗配置
 */
export interface PopupConfig {
  title?: string;
  width?: number;      // 0-1 表示屏幕比例，>1 表示像素
  height?: number;
  bgColor?: Color;     // 遮罩颜色
  panelColor?: Color;  // 面板颜色
  borderColor?: Color; // 边框颜色
  borderRadius?: number;
  closeOnMask?: boolean; // 点击遮罩关闭
}

const DEFAULT_CONFIG: PopupConfig = {
  width: 0.85,
  height: 0.7,
  bgColor: new Color(0, 0, 0, 180),
  panelColor: new Color(30, 30, 40, 245),
  borderColor: new Color(100, 100, 120, 255),
  borderRadius: 20,
  closeOnMask: true,
};

/**
 * 弹窗返回值
 */
export interface PopupResult {
  popup: Node;    // 主容器
  panel: Node;    // 内容面板（按钮应该加到这里）
}

/**
 * 弹窗管理器
 */
export class PopupManager {
  private parentNode: Node;
  private activePopup: Node | null = null;
  
  constructor(parentNode: Node) {
    this.parentNode = parentNode;
  }
  
  /**
   * 显示弹窗
   */
  show(name: string, config: PopupConfig = {}): Node {
    // 关闭已有弹窗
    this.close();
    
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const screenSize = view.getVisibleSize();
    
    // 计算实际尺寸
    const panelW = cfg.width! <= 1 ? screenSize.width * cfg.width! : cfg.width!;
    const panelH = cfg.height! <= 1 ? screenSize.height * cfg.height! : cfg.height!;
    
    // 创建主容器
    const popup = new Node(name);
    popup.layer = this.parentNode.layer;
    popup.setParent(this.parentNode);
    popup.setPosition(0, 0, 0);
    
    const popupTransform = popup.addComponent(UITransform);
    popupTransform.setContentSize(screenSize.width, screenSize.height);
    
    // 遮罩背景
    const maskNode = new Node('Mask');
    maskNode.layer = this.parentNode.layer;
    maskNode.setParent(popup);
    maskNode.setPosition(0, 0, 0);
    
    const maskTransform = maskNode.addComponent(UITransform);
    maskTransform.setContentSize(screenSize.width, screenSize.height);
    
    const maskGraphics = maskNode.addComponent(Graphics);
    maskGraphics.fillColor = cfg.bgColor!;
    maskGraphics.rect(-screenSize.width / 2, -screenSize.height / 2, screenSize.width, screenSize.height);
    maskGraphics.fill();
    
    // 遮罩点击事件：关闭弹窗或拦截穿透
    maskNode.on(Node.EventType.TOUCH_END, (event: any) => {
      event.propagationStopped = true; // 阻止事件穿透
      if (cfg.closeOnMask) {
        this.close();
      }
    });
    
    // 内容面板
    const panelNode = new Node('Panel');
    panelNode.layer = this.parentNode.layer;
    panelNode.setParent(popup);
    panelNode.setPosition(0, 0, 0);
    
    const panelTransform = panelNode.addComponent(UITransform);
    panelTransform.setContentSize(panelW, panelH);
    
    const panelGraphics = panelNode.addComponent(Graphics);
    
    // 填充
    panelGraphics.fillColor = cfg.panelColor!;
    panelGraphics.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, cfg.borderRadius!);
    panelGraphics.fill();
    
    // 边框
    panelGraphics.strokeColor = cfg.borderColor!;
    panelGraphics.lineWidth = 2;
    panelGraphics.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, cfg.borderRadius!);
    panelGraphics.stroke();
    
    // 面板拦截点击（防止点面板也关闭）
    panelNode.on(Node.EventType.TOUCH_END, (event: any) => {
      event.propagationStopped = true;
    });
    
    // 标题
    if (cfg.title) {
      const titleNode = new Node('Title');
      titleNode.layer = this.parentNode.layer;
      titleNode.setParent(panelNode);
      titleNode.setPosition(0, panelH / 2 - 50, 0);
      
      const titleTransform = titleNode.addComponent(UITransform);
      titleTransform.setContentSize(panelW, 60);
      
      const titleLabel = titleNode.addComponent(Label);
      titleLabel.string = cfg.title;
      titleLabel.fontSize = 40;
      titleLabel.lineHeight = 50;
      titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
      titleLabel.color = new Color(255, 255, 255, 255);
    }
    
    this.activePopup = popup;
    
    // 返回 panelNode，让调用者把内容加到面板里
    return panelNode;
  }
  
  /**
   * 关闭当前弹窗
   */
  close() {
    if (this.activePopup) {
      this.activePopup.destroy();
      this.activePopup = null;
    }
  }
  
  /**
   * 获取当前弹窗
   */
  getActive(): Node | null {
    return this.activePopup;
  }
  
  /**
   * 是否有弹窗显示
   */
  isShowing(): boolean {
    return this.activePopup !== null;
  }
  
  /**
   * 创建按钮
   */
  static createButton(
    parent: Node,
    name: string,
    text: string,
    fontSize: number = 36,
    onClick?: () => void
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(300, 70);
    transform.anchorX = 0.5;
    transform.anchorY = 0.5;
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 10;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = new Color(255, 255, 255, 255);
    
    if (onClick) {
      node.on(Node.EventType.TOUCH_END, onClick);
    }
    
    return label;
  }
  
  /**
   * 创建文本标签
   */
  static createLabel(
    parent: Node,
    name: string,
    text: string,
    fontSize: number = 32
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(600, fontSize + 20);
    transform.anchorX = 0.5;
    transform.anchorY = 0.5;
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 10;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = new Color(255, 255, 255, 255);
    
    return label;
  }
}
