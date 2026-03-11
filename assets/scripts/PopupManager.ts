/**
 * 🎨 弹窗管理器 - 统一管理弹窗样式
 */

import { Node, UITransform, view, Color, Graphics, Label, UIOpacity, tween } from 'cc';

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
  height: 0.6,
  bgColor: new Color(0, 0, 0, 150),
  panelColor: new Color(45, 52, 65, 250),     // 深蓝灰色
  borderColor: new Color(80, 140, 120, 200),  // 淡绿边框
  borderRadius: 24,
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
    
    // 遮罩淡入动画
    const maskOpacity = maskNode.addComponent(UIOpacity);
    maskOpacity.opacity = 0;
    tween(maskOpacity).to(0.15, { opacity: 255 }).start();
    
    // 遮罩点击事件：关闭弹窗或拦截穿透
    maskNode.on(Node.EventType.TOUCH_END, (event: any) => {
      event.propagationStopped = true;
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
    
    // 绘制面板（带阴影效果）
    this.drawPanel(panelGraphics, panelW, panelH, cfg);
    
    // 面板弹出动画
    panelNode.setScale(0.85, 0.85, 1);
    const panelOpacity = panelNode.addComponent(UIOpacity);
    panelOpacity.opacity = 0;
    tween(panelNode).to(0.2, { scale: { x: 1, y: 1, z: 1 } }, { easing: 'backOut' }).start();
    tween(panelOpacity).to(0.15, { opacity: 255 }).start();
    
    // 面板拦截点击（防止点面板也关闭）
    panelNode.on(Node.EventType.TOUCH_END, (event: any) => {
      event.propagationStopped = true;
    });
    
    // 标题
    if (cfg.title) {
      const titleNode = new Node('Title');
      titleNode.layer = this.parentNode.layer;
      titleNode.setParent(panelNode);
      titleNode.setPosition(0, panelH / 2 - 45, 0);
      
      const titleTransform = titleNode.addComponent(UITransform);
      titleTransform.setContentSize(panelW, 60);
      
      const titleLabel = titleNode.addComponent(Label);
      titleLabel.string = cfg.title;
      titleLabel.fontSize = 36;
      titleLabel.lineHeight = 45;
      titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
      titleLabel.color = new Color(255, 255, 255, 255);
      
      // 标题下划线
      const lineNode = new Node('TitleLine');
      lineNode.layer = this.parentNode.layer;
      lineNode.setParent(panelNode);
      lineNode.setPosition(0, panelH / 2 - 75, 0);
      
      const lineGraphics = lineNode.addComponent(Graphics);
      lineGraphics.strokeColor = new Color(80, 140, 120, 150);
      lineGraphics.lineWidth = 1;
      lineGraphics.moveTo(-panelW * 0.4, 0);
      lineGraphics.lineTo(panelW * 0.4, 0);
      lineGraphics.stroke();
    }
    
    this.activePopup = popup;
    
    return panelNode;
  }
  
  /**
   * 绘制面板（带装饰效果）
   */
  private drawPanel(g: Graphics, w: number, h: number, cfg: PopupConfig) {
    const r = cfg.borderRadius!;
    
    // 外发光/阴影效果（多层半透明矩形）
    for (let i = 3; i > 0; i--) {
      const offset = i * 4;
      const alpha = 30 - i * 8;
      g.fillColor = new Color(0, 0, 0, Math.max(0, alpha));
      g.roundRect(-w / 2 - offset, -h / 2 - offset, w + offset * 2, h + offset * 2, r + offset);
      g.fill();
    }
    
    // 主面板渐变背景（上深下浅）
    const topColor = cfg.panelColor!;
    const bottomColor = new Color(
      Math.min(255, topColor.r + 15),
      Math.min(255, topColor.g + 18),
      Math.min(255, topColor.b + 25),
      topColor.a
    );
    
    // 分段绘制模拟渐变
    const segments = 10;
    const segH = h / segments;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const color = new Color(
        Math.round(topColor.r + (bottomColor.r - topColor.r) * t),
        Math.round(topColor.g + (bottomColor.g - topColor.g) * t),
        Math.round(topColor.b + (bottomColor.b - topColor.b) * t),
        topColor.a
      );
      g.fillColor = color;
      
      if (i === 0) {
        // 顶部圆角
        g.roundRect(-w / 2, h / 2 - segH, w, segH, r);
      } else if (i === segments - 1) {
        // 底部圆角
        g.roundRect(-w / 2, -h / 2, w, segH, r);
      } else {
        g.rect(-w / 2, h / 2 - (i + 1) * segH, w, segH);
      }
      g.fill();
    }
    
    // 内边框高光
    g.strokeColor = new Color(255, 255, 255, 30);
    g.lineWidth = 1;
    g.roundRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, r - 2);
    g.stroke();
    
    // 外边框
    g.strokeColor = cfg.borderColor!;
    g.lineWidth = 2;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
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
   * 创建按钮（带背景）
   */
  static createButton(
    parent: Node,
    name: string,
    text: string,
    fontSize: number = 32,
    onClick?: () => void,
    bgColor?: Color
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(260, 55);
    transform.anchorX = 0.5;
    transform.anchorY = 0.5;
    
    // 按钮背景
    const btnBg = bgColor || new Color(70, 130, 110, 220);
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = btnBg;
    graphics.roundRect(-130, -27, 260, 54, 12);
    graphics.fill();
    
    // 按钮高光边框
    graphics.strokeColor = new Color(255, 255, 255, 60);
    graphics.lineWidth = 1;
    graphics.roundRect(-130, -27, 260, 54, 12);
    graphics.stroke();
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = new Color(255, 255, 255, 255);
    
    if (onClick) {
      node.on(Node.EventType.TOUCH_END, (event: any) => {
        event.propagationStopped = true;
        onClick();
      });
      
      // 按下效果
      node.on(Node.EventType.TOUCH_START, () => {
        node.setScale(0.95, 0.95, 1);
      });
      node.on(Node.EventType.TOUCH_END, () => {
        node.setScale(1, 1, 1);
      });
      node.on(Node.EventType.TOUCH_CANCEL, () => {
        node.setScale(1, 1, 1);
      });
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
    fontSize: number = 28,
    color?: Color
  ): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const transform = node.addComponent(UITransform);
    transform.setContentSize(500, fontSize + 16);
    transform.anchorX = 0.5;
    transform.anchorY = 0.5;
    
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = color || new Color(230, 230, 235, 255);
    
    return label;
  }
  
  /**
   * 创建分隔线
   */
  static createDivider(parent: Node, name: string, width: number = 200): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    node.setParent(parent);
    
    const graphics = node.addComponent(Graphics);
    graphics.strokeColor = new Color(100, 100, 120, 100);
    graphics.lineWidth = 1;
    graphics.moveTo(-width / 2, 0);
    graphics.lineTo(width / 2, 0);
    graphics.stroke();
    
    return node;
  }
}
