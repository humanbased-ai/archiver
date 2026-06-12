import Phaser from 'phaser'
import { sample } from 'lodash'
import Sector from './sector'
import { DISC_CONFIG } from '../config'

/**
 * 飞刀转盘类
 */
export default class Disc extends Phaser.GameObjects.Container {
  get innerDisc(): Phaser.GameObjects.Image {
    return this.getByName('inner-disc') as Phaser.GameObjects.Image
  }

  get outerDisc(): Phaser.GameObjects.Sprite {
    return this.getByName('outer-disc') as Phaser.GameObjects.Sprite
  }
  get stickKnives(): Phaser.GameObjects.Image[] {
    return this.list.filter((obj) => obj.name === 'stick-knife') as Phaser.GameObjects.Image[]
  }
  get sectors(): Sector[] {
    return this.list.filter((obj) => obj instanceof Sector) as Sector[]
  }
  get brokenSound(): Phaser.Sound.BaseSound {
    return this.scene.sound.get('broken') as Phaser.Sound.BaseSound
  }

  constructor(scene: Phaser.Scene) {
    super(scene, DISC_CONFIG.x, DISC_CONFIG.y)
    this.init()
  }

  private init() {
    this.scene.add.existing(this)
    this.scene.physics.add.existing(this)

    const body = this.body as Phaser.Physics.Arcade.Body
    setupPhysics(body)

    this.setScale(DISC_CONFIG.scale)

    const outerDisc = createOuterDisc(this.scene)
    const innerDisc = createInnerDisc(this.scene)

    this.add([outerDisc, innerDisc])
  }

  start(partitions: [number, number][], config: Codatta.Game.ConfigItem[][]) {
    const sectorConfig = createSectorConfig(partitions, config)

    toggleObjects(this, false)
    const sectors = createSectors(this.scene, sectorConfig)
    this.add(sectors)
    this.bringToTop(this.innerDisc)
    toggleObjects(this, true)
  }

  broke(callback: () => void) {
    broke(this, this.brokenSound, callback)
  }

  stickKnife() {
    const knife = createStickKnife(this.scene, this.angle, DISC_CONFIG.stickKnifeOffset)
    this.add(knife)
    this.sendToBack(knife)

    setupKnifePhysics(this.scene, knife)
  }

  getScore(): number {
    return getScore(this.angle, this.sectors)
  }

  update(_time: number, dt: number) {
    updateDisc(this, dt)
  }

  getStickKnives() {
    return this.stickKnives
  }
}

const setupPhysics = (body: Phaser.Physics.Arcade.Body) => {
  body.setSize(DISC_CONFIG.radius * 2, DISC_CONFIG.radius * 2)
  body.setOffset(-DISC_CONFIG.radius, -DISC_CONFIG.radius)
  body.setCircle(DISC_CONFIG.radius)
  body.setImmovable(true)
}

const createOuterDisc = (scene: Phaser.Scene) =>
  scene.add.sprite(0, 0, 'disc', 'disc_001.png').setOrigin(0.5).setScale(2).setName('outer-disc')

const createInnerDisc = (scene: Phaser.Scene) =>
  scene.add.image(0, 0, 'inner-disc').setScale(0.5, 0.5).setOrigin(0.5).setName('inner-disc')

const createSectorConfig = (partitions: [number, number][], config: Codatta.Game.ConfigItem[][]) =>
  partitions.map((item) => ({
    ...(sample(config[item[0] - 1]) as Codatta.Game.ConfigItem),
    angle: item[1],
  }))

const createSectors = (scene: Phaser.Scene, sectorConfig: (Codatta.Game.ConfigItem & { angle: number })[]) => {
  let angleOffset = 0
  return sectorConfig.map((config) => {
    const sector = new Sector(scene, {
      startAngle: angleOffset,
      endAngle: angleOffset - config.angle,
      radius: DISC_CONFIG.sectorRadius,
      score: config.score,
      color: config.color,

      text: config.content,
      icon: config.icon,
      textStyle: DISC_CONFIG.textStyle,
    })
    angleOffset -= config.angle
    return sector
  })
}

const toggleObjects = (disc: Disc, isVisible: boolean) => {
  disc.innerDisc?.setVisible(isVisible).setActive(isVisible)
  disc.sectors.forEach((sector) => sector.setVisible(isVisible).setActive(isVisible))
  disc.stickKnives.forEach((knife) => knife.setVisible(isVisible).setActive(isVisible))

  if (!isVisible) {
    disc.stickKnives.forEach((knife) => knife.destroy())
    disc.sectors.forEach((sector) => sector.destroy())
  } else {
    disc.outerDisc?.setFrame('disc_000.png')
  }
}

const broke = (disc: Disc, brokenSound: Phaser.Sound.BaseSound, callback: () => void) => {
  const onBroken = () => {
    console.log('onBroken')
    disc.outerDisc?.off('animationcomplete', onBroken)
    callback?.()
  }

  toggleObjects(disc, false)
  brokenSound.play({ volume: 0.5 })
  disc.outerDisc?.play('destroy').on('animationcomplete', onBroken)
}

const createStickKnife = (scene: Phaser.Scene, angle: number, offset: number) => {
  const knife = scene.add.image(0, 0, 'knife').setScale(0.35).setOrigin(0.5).setName('stick-knife')
  const x = Math.cos(Math.PI / 2 - Phaser.Math.DegToRad(angle)) * offset
  const y = Math.sin(Math.PI / 2 - Phaser.Math.DegToRad(angle)) * offset
  return knife.setAngle(-angle).setPosition(x, y).setActive(true).setVisible(true)
}

const setupKnifePhysics = (scene: Phaser.Scene, knife: Phaser.GameObjects.Image) => {
  scene.physics.add.existing(knife)
  const body = knife.body as Phaser.Physics.Arcade.Body
  body.setAngularVelocity(0)
  body.setSize(160, 160)
  body.setImmovable(true)
}

const getScore = (angle: number, sectors: Sector[]): number => {
  const normalizedAngle = angle < 0 ? 360 + angle : angle
  const sector = sectors.find((sector) => {
    const config = sector.getConfig()
    return normalizedAngle >= Math.abs(config!.startAngle) && normalizedAngle <= Math.abs(config!.endAngle)
  })
  return sector?.getConfig()?.score || 0
}

const updateDisc = (disc: Disc, dt: number) => {
  disc.angle = (disc.angle + DISC_CONFIG.angularVelocity * (dt / 1000)) % 360
  // disc.innerDisc?.setAngle(-disc.angle)
}
