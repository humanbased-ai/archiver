import GameScene from './scenes/game'
import PreloadScene from './scenes/preload'

// 导入不同等级的图标
import levelAIcon from '@/assets/images/game/level-a.png'
import levelBIcon from '@/assets/images/game/level-b.png'
import levelCIcon from '@/assets/images/game/level-c.png'
import levelSIcon from '@/assets/images/game/level-s.png'
import levelSSIcon from '@/assets/images/game/level-ss.png'
import levelSSSIcon from '@/assets/images/game/level-sss.png'


const CANVAS_WITH = 780
const CANVAS_HEIGHT = 1200
// 圆盘配置
export const DISC_CONFIG = {
  x: CANVAS_WITH / 2,
  y: 392,
  radius: 300, // 圆盘半径
  scale: 0.9, // 圆盘缩放比例
  sectorRadius: 224, // 扇形半径
  stickKnifeOffset: 300, // 飞刀插入偏移量
  angularVelocity: 120, // 角速度（度/秒）
  innerDiscScale: 0.5, // 内圆盘缩放比例
  outerDiscScale: 2, // 外圆盘缩放比例
  textStyle: { fontSize: 24, color: '#DFDFDF', align: 'center', fontStyle: 'bold' }, //增加等效fontWeight: 700的配置
}

// 飞刀配置
export const KNIFE_CONFIG = {
  x: CANVAS_WITH / 2,
  y: CANVAS_HEIGHT - 110,
  speed: 3000, // 飞行速度
  scale: 0.35, // 飞刀缩放比例
  bodySize: { width: 44, height: 240 }, // 飞刀物理体积大小
  bodyOffset: { x: -22, y: -120 }, // 飞刀物理体积偏移量
}

// 扇形配置
export const SECTOR_CONFIG = {
  defaultAlpha: 0.6, // 默认透明度
  textStyle: { fontSize: 24, color: '#DFDFDF', align: 'center', fontStyle: 'bold' }, // 文本样式
  iconScale: 0.24, // 图标缩放比例
  iconRadius: 0.54, // 图标半径（相对于扇形半径）
  textRadius: {
    single: 0.87, // 单行文本半径（相对于扇形半径）
    double: [0.91, 0.83], // 双行文本半径（相对于扇形半径）
  },
}

// 游戏主配置
export const GAME_CONFIG = {
  type: Phaser.AUTO, // 自动选择渲染器（WebGL或Canvas）
  scale: {
    mode: Phaser.Scale.FIT, // 适应屏幕
    width: CANVAS_WITH, // 游戏宽度
    height: CANVAS_HEIGHT, // 游戏高度
    zoom: 0.5, // 缩放比例
  },
  transparent: true, // 透明背景
  scene: [PreloadScene, GameScene], // 游戏场景
  physics: {
    default: 'arcade', // 使用 Arcade 物理引擎
    arcade: {
      gravity: { y: 0, x: 0 }, // 无重力
    },
  },
}

// 等级图标映射
export const LEVEL_ICON_MAP = {
  A: levelAIcon,
  B: levelBIcon,
  C: levelCIcon,
  S: levelSIcon,
  SS: levelSSIcon,
  SSS: levelSSSIcon,
}