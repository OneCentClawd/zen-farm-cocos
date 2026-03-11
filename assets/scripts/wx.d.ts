/**
 * 微信小游戏全局类型声明
 */

declare const wx: {
  // 网络请求
  request: (options: {
    url: string;
    method?: string;
    data?: any;
    header?: Record<string, string>;
    success?: (res: { statusCode: number; data: any }) => void;
    fail?: (err: any) => void;
  }) => void;
  
  // 位置
  getLocation: (options: {
    type?: 'wgs84' | 'gcj02';
    success?: (res: { latitude: number; longitude: number }) => void;
    fail?: (err: any) => void;
  }) => void;
  
  // 模糊定位（不需要特殊资质）
  getFuzzyLocation: (options: {
    type?: 'wgs84' | 'gcj02';
    success?: (res: { latitude: number; longitude: number }) => void;
    fail?: (err: any) => void;
  }) => void;
  
  // 存储
  setStorageSync: (key: string, data: any) => void;
  getStorageSync: (key: string) => any;
  removeStorageSync: (key: string) => void;
  
  // 胶囊按钮
  getMenuButtonBoundingClientRect: () => {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
  };
  
  // 系统信息
  getSystemInfoSync: () => {
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    statusBarHeight: number;
    safeArea: {
      top: number;
      bottom: number;
      left: number;
      right: number;
      width: number;
      height: number;
    };
  };
};
