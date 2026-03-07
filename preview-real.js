/**
 * 真实风素材预览
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const WIDTH = 900;
const HEIGHT = 500;

async function main() {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  
  // 背景渐变（天空）
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.7, '#c8e6c9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // 地面
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(0, HEIGHT - 80, WIDTH, 80);
  
  // 草地
  ctx.fillStyle = '#388e3c';
  ctx.fillRect(0, HEIGHT - 85, WIDTH, 10);
  
  // 加载素材
  const sproutImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/real_sprout.png');
  const leafImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/real_leaf.png');
  const cloverImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/real_clover.png');
  const flowerImg = await loadImage('/home/Jack/zen-farm-cocos/assets/textures/real_flower.png');
  
  const baseY = HEIGHT - 80;
  
  // 1. 发芽期
  const sproutScale = 0.22;
  ctx.drawImage(
    sproutImg,
    100 - sproutImg.width * sproutScale / 2,
    baseY - sproutImg.height * sproutScale + 30,
    sproutImg.width * sproutScale,
    sproutImg.height * sproutScale
  );
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('发芽', 85, HEIGHT - 90);
  
  // 2. 幼苗期（单片叶子）
  const leafScale = 0.18;
  ctx.save();
  ctx.translate(250, baseY - 80);
  ctx.rotate(-0.1);
  ctx.drawImage(
    leafImg,
    -leafImg.width * leafScale / 2,
    -leafImg.height * leafScale + 20,
    leafImg.width * leafScale,
    leafImg.height * leafScale
  );
  ctx.restore();
  ctx.fillText('幼苗', 235, HEIGHT - 90);
  
  // 3. 生长期
  const growScale = 0.25;
  ctx.drawImage(
    cloverImg,
    420 - cloverImg.width * growScale / 2,
    baseY - cloverImg.height * growScale + 20,
    cloverImg.width * growScale,
    cloverImg.height * growScale
  );
  ctx.fillText('生长', 405, HEIGHT - 90);
  
  // 4. 成熟期
  const matureScale = 0.38;
  ctx.drawImage(
    cloverImg,
    600 - cloverImg.width * matureScale / 2,
    baseY - cloverImg.height * matureScale + 25,
    cloverImg.width * matureScale,
    cloverImg.height * matureScale
  );
  ctx.fillText('成熟', 585, HEIGHT - 90);
  
  // 5. 开花期（成熟+花）
  const bloomScale = 0.4;
  ctx.drawImage(
    cloverImg,
    790 - cloverImg.width * bloomScale / 2,
    baseY - cloverImg.height * bloomScale + 25,
    cloverImg.width * bloomScale,
    cloverImg.height * bloomScale
  );
  // 花朵
  const flowerScale = 0.12;
  ctx.drawImage(
    flowerImg,
    790 - flowerImg.width * flowerScale / 2,
    baseY - cloverImg.height * bloomScale - 20,
    flowerImg.width * flowerScale,
    flowerImg.height * flowerScale
  );
  ctx.fillText('开花', 775, HEIGHT - 90);
  
  // 标题
  ctx.fillStyle = '#1b5e20';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('🍀 真实风素材 - 幸运草完整生长周期', 20, 35);
  
  ctx.fillStyle = '#333';
  ctx.font = '14px sans-serif';
  ctx.fillText('HuggingFace FLUX.1 生成 | 照片级真实质感 | 透明PNG', 20, 58);
  
  // 保存
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('/home/Jack/zen-farm-cocos/preview_real.png', buffer);
  console.log('预览图已保存: preview_real.png');
}

main().catch(console.error);
