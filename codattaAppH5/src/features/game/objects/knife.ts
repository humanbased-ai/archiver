import Phaser from 'phaser'
import { KNIFE_CONFIG } from '../config'

/**
 * 飞刀类
 */
export default class Knife extends Phaser.GameObjects.Container {
  private get hitKnifeSound(): Phaser.Sound.BaseSound {
    return this.scene.sound.get('hit-knife') as Phaser.Sound.BaseSound
  }

  private get hitDiscSound(): Phaser.Sound.BaseSound {
    return this.scene.sound.get('hit-disc') as Phaser.Sound.BaseSound
  }

  /**
   * 构造函数
   * @param config 飞刀配置
   */
  constructor(scene: Phaser.Scene) {
    super(scene, KNIFE_CONFIG.x, KNIFE_CONFIG.y)
    this.init()
  }

  private init() {
    this.scene.add.existing(this)
    this.scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    setupPhysics(body)

    const knifeSprite = createKnifeSprite(this.scene)

    this.add([knifeSprite])
  }

  fly() {
    fly(this)
  }

  drop() {
    drop(this, this.hitKnifeSound)
  }

  stick() {
    stick(this, this.hitDiscSound)
  }

  reset() {
    reset(this)
  }
}

/**
 * 设置物理属性
 * @param body 物理体
 */
const setupPhysics = (body: Phaser.Physics.Arcade.Body) => {
  body.setSize(KNIFE_CONFIG.bodySize.width, KNIFE_CONFIG.bodySize.height)
  body.setOffset(KNIFE_CONFIG.bodyOffset.x, KNIFE_CONFIG.bodyOffset.y)
}

/**
 * 创建飞刀精灵
 * @param scene Phaser场景
 * @returns Phaser图像对象
 */
const createKnifeSprite = (scene: Phaser.Scene) => scene.add.image(0, 0, 'knife').setScale(KNIFE_CONFIG.scale)

/**
 * 飞刀飞行
 * @param body 物理体
 */
const fly = (knife: Knife) => {
  const body = knife.body as Phaser.Physics.Arcade.Body
  body.setVelocityY(-KNIFE_CONFIG.speed)
}

/**
 * 飞刀掉落
 * @param knife 飞刀对象
 * @param sound 音效
 */
const drop = (knife: Knife, sound: Phaser.Sound.BaseSound) => {
  sound.play({ volume: 0.5 })
  knife.scene.tweens.add({
    targets: knife,
    angle: knife.angle + 180,
    y: knife.y + 600,
    duration: 300,
    onComplete: () => reset(knife),
  })
}

/**
 * 飞刀插入
 * @param knife 飞刀对象
 * @param sound 音效
 */
const stick = (knife: Knife, sound: Phaser.Sound.BaseSound) => {
  sound.play({ volume: 0.5 })
  reset(knife)
}

/**
 * 重置飞刀
 * @param knife 飞刀对象
 */
const reset = (knife: Knife) => {
  const body = knife.body as Phaser.Physics.Arcade.Body
  body.setVelocityY(0)

  knife.setAngle(0)
  knife.setAlpha(0)
  knife.setPosition(KNIFE_CONFIG.x, KNIFE_CONFIG.y)
  knife.scene.tweens.add({
    targets: knife,
    alpha: 1,
    duration: 300,
    delay: 300,
    ease: 'easeInOut',
  })
}
