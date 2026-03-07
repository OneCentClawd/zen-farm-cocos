/**
 * 方案二预览：AI素材动态组装（完整版）
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const WIDTH = 900;
const HEIGHT = 550;

async function main() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  
  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#87CEEB');  // 天蓝
  gradient.addColorStop(0.6, '#e8f5e9');  // 浅绿
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // 地面
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, HEIGHT - 60, WIDTH, 60);
  
  // 草地纹理
  ctx.fillStyle = '#228B22';
  ctx.fillRect(0, HEIGHT - 65, WIDTH, 8);
  
  // 加载素材
  const sproutImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/sprout.png');
  const stemImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/stem_final.png');
  const clover3Img = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/clover_3leaf.png');
  const cloverImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/clover_complete.png');
  
  const baseY = HEIGHT - 60;
  
  // ===== 1. 种子期 =====
  ctx.fillStyle = '#654321';
  ctx.beginPath();
  ctx.ellipse(80, baseY + 5, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#333';
  ctx.font = '13px sans-serif';
  ctx.fillText('种子', 65, HEIGHT - 70);
  
  // ===== 2. 发芽期 =====
  const sproutScale = 0.18;
  ctx.drawImage(
    sproutImg,
    200 - sproutImg.width * sproutScale / 2,
    baseY - sproutImg.height * sproutScale + 40,
    sproutImg.width * sproutScale,
    sproutImg.height * sproutScale
  );
  ctx.fillText('发芽', 185, HEIGHT - 70);
  
  // ===== 3. 幼苗期（小三叶草）=====
  // 用 clover_3leaf 里的小叶子
  const crop3 = { x: 100, y: 80, w: 180, h: 200 };  // 左上小叶子
  const young3Scale = 0.5;
  ctx.save();
  ctx.translate(330, baseY - 50);
  ctx.drawImage(
    clover3Img,
    crop3.x, crop3.y, crop3.w, crop3.h,
    -crop3.w * young3Scale / 2, -crop3.h * young3Scale,
    crop3.w * young3Scale, crop3.h * young3Scale
  );
  ctx.restore();
  
  // 画茎
  ctx.save();
  ctx.translate(330, baseY);
  ctx.drawImage(stemImg, -5, -55, 10, 55);
  ctx.restore();
  
  ctx.fillText('幼苗', 315, HEIGHT - 70);
  
  // ===== 4. 生长期 =====
  const growScale = 0.2;
  ctx.save();
  ctx.translate(470, baseY);
  ctx.rotate(-0.05);
  ctx.drawImage(
    cloverImg,
    -cloverImg.width * growScale / 2,
    -cloverImg.height * growScale + 10,
    cloverImg.width * growScale,
    cloverImg.height * growScale
  );
  ctx.restore();
  ctx.fillText('生长期', 445, HEIGHT - 70);
  
  // ===== 5. 成熟期 =====
  const matureScale = 0.32;
  ctx.save();
  ctx.translate(620, baseY);
  ctx.drawImage(
    cloverImg,
    -cloverImg.width * matureScale / 2,
    -cloverImg.height * matureScale + 15,
    cloverImg.width * matureScale,
    cloverImg.height * matureScale
  );
  ctx.restore();
  ctx.fillText('成熟期', 595, HEIGHT - 70);
  
  // ===== 6. 茂盛（倾斜）=====
  const fullScale = 0.35;
  ctx.save();
  ctx.translate(790, baseY);
  ctx.rotate(0.25);  // 风吹倾斜
  ctx.drawImage(
    cloverImg,
    -cloverImg.width * fullScale / 2,
    -cloverImg.height * fullScale + 15,
    cloverImg.width * fullScale,
    cloverImg.height * fullScale
  );
  ctx.restore();
  ctx.fillText('茂盛(风吹)', 755, HEIGHT - 70);
  
  // 标题
  ctx.fillStyle = '#2e7d32';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('🍀 方案二：AI素材动态组装 - 幸运草完整生长周期', 20, 35);
  
  ctx.fillStyle = '#555';
  ctx.font = '13px sans-serif';
  ctx.fillText('素材来源：HuggingFace FLUX.1 | 动态参数：height, scale, tiltAngle, leafCount', 20, 58);
  
  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/home/Jack/zen-farm-cocos/preview_clover_final.png', buffer);
  console.log('预览图已保存: preview_clover_final.png');
}

main().catch(console.error);
