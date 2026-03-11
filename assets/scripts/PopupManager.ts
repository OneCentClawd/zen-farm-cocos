/**
 * 🎨 弹窗管理器 - 简洁现代风格
 */

import { Node, UITransform, view, Color, Graphics, Label, UIOpacity, tween } from 'cc';

/**
 * 弹窗配置
 */
export interface PopupConfig {
  title?: string;
  width?: number;      // 0-1 表示屏幕比例，>1 表示像素
  height?: number;
  closeOnMask?: boolean;
}

const DEFAULT_CONFIG: PopupConfig = {
  width: 0.6,
  height: 0.45,
  closeOnMask: true,
};

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
    this.close();
    
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const screenSize = view.getVisibleSize();
    
    const panelW = cfg.width! <= 1 ? screenSize.width * cfg.width! : cfg.width!;
    const panelH = cfg.height! <= 1 ? screenSize.height * cfg.height! : cfg.height!;
    
    // 主容器
    const popup = new Node(name);
    popup.layer = this.parentNode.layer;
    popup.setParent(this.parentNode);
    popup.setPosition(0, 0, 0);
    
    const popupTransform = popup.addComponent(UITransform);
    popupTransform.setContentSize(screenSize.width, screenSize.height);
    
    // 遮罩
    const maskNode = new Node('Mask');
    maskNode.layer = this.parentNode.layer;
    maskNode.setParent(popup);
    
    const maskTransform = maskNode.addComponent(UITransform);
    maskTransform.setContentSize(screenSize.width, screenSize.height);
    
    const maskGraphics = maskNode.addComponent(Graphics);
    maskGraphics.fillColor = new Color(0, 0, 0, 120);
    maskGraphics.rect(-screenSize.width / 2, -screenSize.height / 2, screenSize.width, screenSize.height);
    maskGraphics.fill();
    
    // 遮罩淡入
    const maskOpacity = maskNode.addComponent(UIOpacity);
    maskOpacity.opacity = 0;
    tween(maskOpacity).to(0.12, { opacity: 255 }).start();
    
    maskNode.on(Node.EventType.TOUCH_END, (event: any) => {
      event.propagationStopped = true;
      if (cfg.closeOnMask) this.close();
    });
    
    // 面板
    const panelNode = new Node('Panel');
    panelNode.layer = this.parentNode.layer;
    panelNode.setParent(popup);
    
    const panelTransform = panelNode.addComponent(UITransform);
    panelTransform.setContentSize(panelW, panelH);
    
    const g = panelNode.addComponent(Graphics);
    this.drawPanel(g, panelW, panelH);
    
    // 弹出动画
    panelNode.setScale(0.9, 0.9, 1);
    const panelOpacity = panelNode.addComponent(UIOpacity);
    panelOpacity.opacity = 0;
    tween(panelNode).to(0.15, { scale: { x: 1, y: 1, z: 1 } }, { easing: 'backOut' }).start();
    tween(panelOpacity).to(0.12, { opacity: 255 }).start();
    
    panelNode.on(Node.EventType.TOUCH_END, (event: any) => {
      event.propagationStopped = true;
    });
    
    // 标题
    if (cfg.title) {
      const titleLabel = PopupManager.createLabel(panelNode, 'Title', cfg.title, 32, new Color(255, 255, 255, 255));
      titleLabel.node.setPosition(0, panelH / 2 - 40, 0);
    }
    
    this.activePopup = popup;
    return panelNode;
  }
  
  /**
   * 绘制面板 - 毛玻璃风格
   */
  private drawPanel(g: Graphics, w: number, h: number) {
    const r = 16;
    
    // 主背景 - 半透明深色
    g.fillColor = new Color(35, 40, 50, 230);
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.fill();
    
    // 顶部高光线
    g.strokeColor = new Color(255, 255, 255, 40);
    g.lineWidth = 1;
    g.moveTo(-w / 2 + r, h / 2 - 1);
    g.lineTo(w / 2 - r, h / 2 - 1);
    g.stroke();
    
    // 边框
    g.strokeColor = new Color(255, 255, 255, 20);
    g.lineWidth = 1;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
  }
  
  close() {
    if (this.activePopup) {
      this.activePopup.destroy();
      this.activePopup = null;
    }
  }
  
  getActive(): Node | null {
    return this.activePopup;
  }
  
  isShowing(): boolean {
    return this.activePopup !== null;
  }
  
  /**
   * 创建按钮 - 纯文字风格
   */
  static createButton(
    parent: Node,
    name: string,
    text: string,
    fontSize: number = 28,
    onClick?: () => void,
    style: 'primary' | 'secondary' | 'danger' = 'primary'
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(220, 48);
    
    // 文字颜色
    const colors = {
      primary: new Color(100, 200, 120, 255),   // 绿色
      secondary: new Color(180, 180, 190, 255), // 灰色
      danger: new Color(255, 100, 100, 255),    // 红色
    };
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = colors[style];
    
    if (onClick) {
      node.on(Node.EventType.TOUCH_END, (e: any) => {
        e.propagationStopped = true;
        onClick();
      });
      node.on(Node.EventType.TOUCH_START, () => node.setScale(0.96, 0.96, 1));
      node.on(Node.EventType.TOUCH_END, () => node.setScale(1, 1, 1));
      node.on(Node.EventType.TOUCH_CANCEL, () => node.setScale(1, 1, 1));
    }
    
    return label;
  }
  
  /**
   * 创建选项按钮 - 可选中状态
   */
  static createOption(
    parent: Node,
    name: string,
    text: string,
    fontSize: number = 26,
    onClick?: () => void
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(240, 52);
    
    // 背景节点
    const bgNode = new Node('Bg');
    bgNode.layer = parent.layer;
    bgNode.setParent(node);
    const bgTransform = bgNode.addComponent(UITransform);
    bgTransform.setContentSize(240, 52);
    const g = bgNode.addComponent(Graphics);
    g.fillColor = new Color(60, 65, 75, 200);
    g.roundRect(-120, -26, 240, 52, 10);
    g.fill();
    g.strokeColor = new Color(255, 255, 255, 30);
    g.lineWidth = 1;
    g.roundRect(-120, -26, 240, 52, 10);
    g.stroke();
    
    // 文字节点
    const labelNode = new Node('Label');
    labelNode.layer = parent.layer;
    labelNode.setParent(node);
    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setContentSize(240, 52);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = new Color(230, 230, 230, 255);
    
    if (onClick) {
      node.on(Node.EventType.TOUCH_END, (e: any) => {
        e.propagationStopped = true;
        onClick();
      });
      node.on(Node.EventType.TOUCH_START, () => node.setScale(0.97, 0.97, 1));
      node.on(Node.EventType.TOUCH_END, () => node.setScale(1, 1, 1));
      node.on(Node.EventType.TOUCH_CANCEL, () => node.setScale(1, 1, 1));
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
    fontSize: number = 24,
    color?: Color
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(400, fontSize + 12);
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 6;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = color || new Color(200, 200, 205, 255);
    
    return label;
  }
}
