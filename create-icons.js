// 这是一个Node.js脚本，用于生成PWA图标
// 运行: node create-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const scale = size / 512;
    
    // 背景圆形
    ctx.fillStyle = '#1890ff';
    ctx.beginPath();
    ctx.arc(size/2, size/2, 240 * scale, 0, 2 * Math.PI);
    ctx.fill();
    
    // 书本背景
    ctx.fillStyle = 'white';
    ctx.fillRect(160 * scale, 140 * scale, 192 * scale, 232 * scale);
    
    // 书本线条
    ctx.fillStyle = '#1890ff';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(180 * scale, (160 + i * 20) * scale, 152 * scale, 4 * scale);
    }
    
    // 问号圆形背景
    ctx.fillStyle = '#1890ff';
    ctx.beginPath();
    ctx.arc(256 * scale, 280 * scale, 40 * scale, 0, 2 * Math.PI);
    ctx.fill();
    
    // 问号文字
    ctx.fillStyle = 'white';
    ctx.font = `bold ${48 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 256 * scale, 280 * scale);
    
    // 装饰圆点
    const colors = ['#52c41a', '#faad14', '#faad14', '#52c41a'];
    const positions = [
        [200 * scale, 320 * scale],
        [220 * scale, 340 * scale],
        [292 * scale, 340 * scale],
        [312 * scale, 320 * scale]
    ];
    
    positions.forEach((pos, i) => {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(pos[0], pos[1], 6 * scale, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    return canvas;
}

// 生成图标
try {
    const icon192 = createIcon(192);
    const icon512 = createIcon(512);
    const icon32 = createIcon(32);
    
    fs.writeFileSync('./public/pwa-192x192.png', icon192.toBuffer('image/png'));
    fs.writeFileSync('./public/pwa-512x512.png', icon512.toBuffer('image/png'));
    fs.writeFileSync('./public/favicon.ico', icon32.toBuffer('image/png'));
    fs.writeFileSync('./public/apple-touch-icon.png', icon192.toBuffer('image/png'));
    
    console.log('PWA图标生成成功！');
} catch (error) {
    console.log('需要安装canvas包: npm install canvas');
    console.log('或者手动使用generate-icons.html生成图标');
}
