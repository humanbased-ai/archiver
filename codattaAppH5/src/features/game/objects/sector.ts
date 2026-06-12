import Phaser from 'phaser'
import { SECTOR_CONFIG } from '../config'

interface SectorConfig {
  startAngle: number
  endAngle: number
  radius: number
  color?: string
  score: number
  alpha?: number
  icon?: string
  text: string[]
  textStyle: Phaser.Types.GameObjects.Text.TextStyle
}

/**
 * 扇形类
 */
export default class Sector extends Phaser.GameObjects.Container {
  private config: SectorConfig | null = null
  /**
   * 构造函数
   * @param scene Phaser场景
   * @param config 扇形配置
   */
  constructor(scene: Phaser.Scene, config: SectorConfig) {
    super(scene, 0, 0)

    this.config = config
    this.init()
  }

  init() {
    const elements = createSectorElements(this.scene, this.config!)
    this.add(elements)
    this.setRotation(Phaser.Math.DegToRad(this.config!.startAngle + 90))
  }

  getConfig() {
    return this.config
  }
}

/**
 * 创建扇形元素
 * @param scene Phaser场景
 * @param config 扇形配置
 * @returns Phaser游戏对象数组
 */
const createSectorElements = (
  scene: Phaser.Scene,
  config: SectorConfig,
): (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[] => {
  const halfAngle = Phaser.Math.DegToRad((config.endAngle - config.startAngle) / 2)
  return [...createDividers(scene, halfAngle), ...createTexts(scene, config), createSectorIcon(scene, config)].filter(
    Boolean,
  ) as (Phaser.GameObjects.Image | Phaser.GameObjects.Text)[]
}

/**
 * 创建分隔线
 * @param scene Phaser场景
 * @param halfAngle 半角
 * @returns Phaser图像对象数组
 */
const createDividers = (scene: Phaser.Scene, halfAngle: number) => [
  createDivider(scene, 0),
  createDivider(scene, halfAngle * 2),
]

/**
 * 创建分隔线
 * @param scene Phaser场景
 * @param rotation 旋转角度
 * @returns Phaser图像对象
 */
const createDivider = (scene: Phaser.Scene, rotation: number) =>
  scene.add.image(0, 0, 'divider').setOrigin(1, 0.5).setScale(-0.308, 0.5).setRotation(rotation)

/**
 * 创建文本
 * @param scene Phaser场景
 * @param config 扇形配置
 * @returns Phaser文本对象数组
 */
const createTexts = (scene: Phaser.Scene, config: SectorConfig) => {
  const createTextForRadius = (text: string, radiusRatio: number) => {
    const path = createTextPath(config.radius * radiusRatio, 0, config.endAngle - config.startAngle)
    const pathLength = path.getLength()
    const fontSize = (parseFloat(config.textStyle.fontSize as string) || 32) * 0.5
    const { scale, totalT } = calculateTextParameters(pathLength, text.length, fontSize)
    return createTextOnPath(scene, text, path, text.length, totalT, scale, config.textStyle)
  }

  const isSingleRow = config.text.length <= 1
  if (isSingleRow) {
    return config.text[0] ? createTextForRadius(config.text[0], SECTOR_CONFIG.textRadius.single) : []
  } else {
    return [
      ...createTextForRadius(config.text[0], SECTOR_CONFIG.textRadius.double[0]),
      ...createTextForRadius(config.text[1], SECTOR_CONFIG.textRadius.double[1]),
    ]
  }
}

/**
 * 创建文本路径
 * @param radius 半径
 * @param startAngle 起始角度
 * @param endAngle 结束角度
 * @returns Phaser路径对象
 */
const createTextPath = (radius: number, startAngle: number, endAngle: number) => {
  const path = new Phaser.Curves.Path(0, 0)
  const ellipse = new Phaser.Curves.Ellipse(0, 0, radius, radius, 0, endAngle - startAngle, true, 0)
  return path.add(ellipse)
}

/**
 * 在路径上创建文本
 * @param scene Phaser场景
 * @param text 文本内容
 * @param path 路径
 * @param wordCount 单词数量
 * @param totalT 总T值
 * @param scale 缩放比例
 * @param textStyle 文本样式
 * @returns Phaser文本对象数组
 */
const createTextOnPath = (
  scene: Phaser.Scene,
  text: string,
  path: Phaser.Curves.Path,
  wordCount: number,
  totalT: number,
  scale: number,
  textStyle: Phaser.Types.GameObjects.Text.TextStyle,
) => {
  const chars = []
  for (let i = 0; i < wordCount; i++) {
    const t = wordCount === 1 ? 0.5 : (1 - totalT) / 2 + (totalT / (wordCount - 1)) * i
    const point = path.getPoint(t)
    const char = scene.add.text(point.x, point.y, text[wordCount - 1 - i], textStyle).setScale(scale)
    char.setOrigin(0.5)

    const tangent = path.getTangent(t)
    char.rotation = Math.PI + Phaser.Math.Angle.Between(0, 0, tangent.x, tangent.y)

    chars.push(char)
  }
  return chars
}

/**
 * 计算文本参数
 * @param pathLength 路径长度
 * @param wordCount 单词数量
 * @param fontSize 字体大小
 * @returns 缩放比例和总T值
 */
const calculateTextParameters = (pathLength: number, wordCount: number, fontSize: number) => {
  const spacing = 0
  const margin = 12
  const maxWidth = wordCount * (fontSize + spacing) - spacing
  const scale = Math.min((pathLength - margin * 2) / maxWidth, 1)
  const totalT = (maxWidth * scale) / pathLength
  return { scale, totalT }
}

/**
 * 创建扇形图标
 * @param scene Phaser场景
 * @param config 扇形配置
 * @returns Phaser图像对象或null
 */
const createSectorIcon = (scene: Phaser.Scene, config: SectorConfig) => {
  if (!config.icon) return null
  const iconRadius = config.radius * SECTOR_CONFIG.iconRadius
  const path = createTextPath(iconRadius, 0, config.endAngle - config.startAngle)
  return createIcon(scene, config.icon, path)
}

/**
 * 创建图标
 * @param scene Phaser场景
 * @param icon 图标键
 * @param path 路径
 * @returns Phaser图像对象
 */
const createIcon = (scene: Phaser.Scene, icon: string, path: Phaser.Curves.Path) => {
  const rarityIcon = scene.add.image(0, 0, icon).setOrigin(0.5).setScale(SECTOR_CONFIG.iconScale)

  const point = path.getPoint(0.5)
  rarityIcon.setPosition(point.x, point.y)

  const tangent = path.getTangent(0.5)
  rarityIcon.rotation = Math.PI + Phaser.Math.Angle.Between(0, 0, tangent.x, tangent.y)

  return rarityIcon
}
