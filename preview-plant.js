/**
 * 植物程序化渲染预览
 * 用 Node.js Canvas 模拟 Cocos Graphics 的效果
 */

const { createCanvas } = require('canvas');
const fs = require('fs');

// 画布设置
const WIDTH = 800;
const HEIGHT = 600;
const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// 背景
ctx.fillStyle = '#e8f5e9';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// 地面
ctx.fillStyle = '#8d6e63';
ctx.fillRect(0, HEIGHT - 80, WIDTH, 80);

/**
 * 画幸运草茎秆
 */
function drawStem(x, baseY, height, thickness, tiltAngle, color) {
  const tiltRad = (tiltAngle * Math.PI) / 180;
  const topX = x + Math.sin(tiltRad) * height;
  const topY = baseY - height;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  
  // 贝塞尔曲线
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.bezierCurveTo(
    x, baseY - height * 0.3,
    (x + topX) / 2 + tiltAngle * 0.3, baseY - height * 0.5,
    topX, topY
  );
  ctx.stroke();
  
  return { topX, topY };
}

/**
 * 画三叶草叶子（心形三片组成）
 */
function drawCloverLeaf(x, y, size, angle, color) {
  const rad = (angle * Math.PI) / 180;
  
  // 叶柄终点
  const stemLen = size * 0.3;
  const leafCenterX = x + Math.cos(rad) * stemLen;
  const leafCenterY = y - Math.sin(rad) * stemLen;
  
  // 三片心形叶
  for (let i = 0; i < 3; i++) {
    const leafAngle = rad + (i - 1) * (Math.PI / 4);
    const leafX = leafCenterX + Math.cos(leafAngle) * size * 0.4;
    const leafY = leafCenterY - Math.sin(leafAngle) * size * 0.4;
    
    // 心形叶片
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(leafCenterX, leafCenterY);
    
    // 用两个圆弧近似心形
    ctx.arc(
      leafCenterX + Math.cos(leafAngle + 0.3) * size * 0.25,
      leafCenterY - Math.sin(leafAngle + 0.3) * size * 0.25,
      size * 0.2, 
      leafAngle + Math.PI, 
      leafAngle + Math.PI * 2
    );
    ctx.arc(
      leafCenterX + Math.cos(leafAngle - 0.3) * size * 0.25,
      leafCenterY - Math.sin(leafAngle - 0.3) * size * 0.25,
      size * 0.2, 
      leafAngle, 
      leafAngle + Math.PI
    );
    ctx.closePath();
    ctx.fill();
  }
  
  // 叶脉
  ctx.strokeStyle = adjustColor(color, 20);
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const leafAngle = rad + (i - 1) * (Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(leafCenterX, leafCenterY);
    ctx.lineTo(
      leafCenterX + Math.cos(leafAngle) * size * 0.35,
      leafCenterY - Math.sin(leafAngle) * size * 0.35
    );
    ctx.stroke();
  }
}

/**
 * 画简单椭圆叶子（备选）
 */
function drawSimpleLeaf(x, y, size, angle, color) {
  const rad = (angle * Math.PI) / 180;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-rad);
  
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(size * 0.4, 0, size * 0.5, size * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // 叶脉
  ctx.strokeStyle = adjustColor(color, 15);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(size * 0.8, 0);
  ctx.stroke();
  
  ctx.restore();
}

/**
 * 画幸运草小白花
 */
function drawCloverFlower(x, y, size) {
  // 白色球状花序
  const petalCount = 12;
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = x + Math.cos(angle) * size * 0.3;
    const py = y - Math.sin(angle) * size * 0.3;
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(px, py, size * 0.15, size * 0.08, angle, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 粉色花心
  ctx.fillStyle = '#ffcccc';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 调整颜色亮度
 */
function adjustColor(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 画一株完整的幸运草
 */
function drawClover(x, baseY, plant) {
  const { height, leafCount, tiltAngle, stemWidth, leafColor } = plant;
  
  // 计算颜色
  const greenBase = Math.round(100 + leafColor * 0.5);
  const stemColor = `rgb(60, ${greenBase}, 40)`;
  const leafColorHex = `#${(40).toString(16).padStart(2, '0')}${greenBase.toString(16).padStart(2, '0')}${(50).toString(16).padStart(2, '0')}`;
  
  // 画茎
  const { topX, topY } = drawStem(x, baseY, height, stemWidth, tiltAngle, stemColor);
  
  // 画叶子（沿茎分布）
  for (let i = 0; i < leafCount; i++) {
    const t = 0.3 + (i / Math.max(1, leafCount - 1)) * 0.6;
    const leafX = x + (topX - x) * t;
    const leafY = baseY + (topY - baseY) * t;
    
    const side = i % 2 === 0 ? 1 : -1;
    const angle = 90 + side * 30 + (Math.random() - 0.5) * 20;
    const size = 15 + leafColor * 0.1 + Math.random() * 5;
    
    drawCloverLeaf(leafX, leafY, size, angle, leafColorHex);
  }
  
  // 顶部三叶草
  drawCloverLeaf(topX, topY, 20 + leafColor * 0.15, 90, leafColorHex);
  
  // 如果成熟，画花
  if (plant.hasFlower) {
    drawCloverFlower(topX, topY - 25, 15);
  }
}

// ========== 画不同状态的幸运草 ==========

const baseY = HEIGHT - 80;

// 1. 幼苗（刚发芽）
drawClover(100, baseY, {
  height: 30,
  leafCount: 1,
  tiltAngle: 0,
  stemWidth: 2,
  leafColor: 20,  // 嫩绿
  hasFlower: false
});
ctx.fillStyle = '#333';
ctx.font = '14px sans-serif';
ctx.fillText('幼苗', 80, HEIGHT - 90);

// 2. 生长期（中等）
drawClover(250, baseY, {
  height: 80,
  leafCount: 3,
  tiltAngle: 5,
  stemWidth: 3,
  leafColor: 50,
  hasFlower: false
});
ctx.fillText('生长期', 220, HEIGHT - 90);

// 3. 成熟期（茂盛）
drawClover(400, baseY, {
  height: 120,
  leafCount: 5,
  tiltAngle: -3,
  stemWidth: 4,
  leafColor: 80,  // 深绿
  hasFlower: false
});
ctx.fillText('成熟期', 370, HEIGHT - 90);

// 4. 开花（带白色小花）
drawClover(550, baseY, {
  height: 130,
  leafCount: 6,
  tiltAngle: 8,
  stemWidth: 4.5,
  leafColor: 90,
  hasFlower: true
});
ctx.fillText('开花', 535, HEIGHT - 90);

// 5. 倾斜（被风吹过）
drawClover(700, baseY, {
  height: 100,
  leafCount: 4,
  tiltAngle: 25,
  stemWidth: 3,
  leafColor: 60,
  hasFlower: false
});
ctx.fillText('风吹倾斜', 665, HEIGHT - 90);

// 标题
ctx.fillStyle = '#2e7d32';
ctx.font = 'bold 24px sans-serif';
ctx.fillText('🍀 方案一：程序化绘制幸运草', 20, 40);

ctx.fillStyle = '#555';
ctx.font = '14px sans-serif';
ctx.fillText('每株植物的形态由数据决定：height, leafCount, tiltAngle, stemWidth, leafColor', 20, 70);

// 保存
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('/home/Jack/zen-farm-cocos/preview_clover.png', buffer);
console.log('预览图已保存: preview_clover.png');
