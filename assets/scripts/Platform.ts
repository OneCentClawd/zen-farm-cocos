/**
 * 🎮 跨平台适配层
 * 处理微信小游戏和浏览器的差异
 */

import { sys } from 'cc';

/**
 * 判断是否在微信小游戏环境
 */
export function isWechatGame(): boolean {
  return sys.platform === sys.Platform.WECHAT_GAME;
}

/**
 * 跨平台 HTTP GET 请求
 */
export function httpGet(url: string): Promise<any> {
  if (isWechatGame()) {
    // 微信小游戏环境
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'GET',
        success: (res: any) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        },
        fail: (err: any) => {
          reject(err);
        }
      });
    });
  } else {
    // 浏览器环境
    return fetch(url).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    });
  }
}

/**
 * 获取用户位置（微信需要授权）
 */
export function getLocation(): Promise<{ lat: number; lon: number }> {
  if (isWechatGame()) {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'wgs84',
        success: (res: any) => {
          resolve({ lat: res.latitude, lon: res.longitude });
        },
        fail: (err: any) => {
          console.warn('获取位置失败，使用默认位置');
          // 默认北京
          resolve({ lat: 39.9, lon: 116.4 });
        }
      });
    });
  } else {
    // 浏览器环境用 navigator.geolocation
    return new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          },
          () => {
            // 失败时用默认位置
            resolve({ lat: 39.9, lon: 116.4 });
          }
        );
      } else {
        resolve({ lat: 39.9, lon: 116.4 });
      }
    });
  }
}

// 微信小游戏全局类型声明
declare const wx: {
  request: (options: any) => void;
  getLocation: (options: any) => void;
  setStorageSync: (key: string, data: any) => void;
  getStorageSync: (key: string) => any;
  removeStorageSync: (key: string) => void;
};
