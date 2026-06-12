import Phaser from 'phaser'
import { sample, throttle } from 'lodash'

import Knife from '../objects/knife'
import Disc from '../objects/disc'

import { gameStore, gameStoreActions } from '../game.store'

/**
 * 游戏主场景
 */
export default class GameScene extends Phaser.Scene {
  private disc: Disc | null = null
  private knife: Knife | null = null
  private isReady: boolean = false
  private isHiting: boolean = false
  private lock: boolean = false

  constructor() {
    super('GameScene')
  }

  /**
   * 创建游戏场景
   */
  create() {
    console.log('GameScene create')

    this.createAnimations()
    this.createGameObjects()
    this.bindInput()
    this.startRound()
    this.isReady = true
  }

  /**
   * 创建动画
   */
  private createAnimations() {
    this.anims.create({
      key: 'destroy',
      frames: this.anims.generateFrameNames('disc', { prefix: 'disc_', suffix: '.png', end: 36, zeroPad: 3 }),
      duration: 500,
      repeat: 0,
    })
  }

  /**
   * 创建游戏对象
   */
  private createGameObjects() {
    this.knife = new Knife(this)
    this.disc = new Disc(this)
  }

  /**
   * 开始新回合
   */
  private startRound() {
    if (!this.disc) return

    const currentRound = gameStore.currentRound
    if (!currentRound) return

    const { partitions, config } = currentRound
    const partitionItem = sample(partitions)
    this.disc.start(partitionItem!, config)
    this.setupCollisions()
    gameStoreActions.setIsGamePlaying(true)
  }

  /**
   * 设置碰撞检测
   */
  private setupCollisions() {
    if (!this.knife || !this.disc) return

    // 清除现有的碰撞检测
    this.physics.world.colliders.destroy()

    // 飞刀与盘上飞刀的碰撞
    this.physics.add.collider(this.knife, this.disc.getStickKnives(), this.onKnifeHitKnife, undefined, this)

    // 飞刀与转盘的碰撞
    this.physics.add.collider(this.knife, this.disc, this.onKnifeHitDisc, undefined, this)
  }

  /**
   * 飞刀与盘上飞刀碰撞的处理
   */
  private onKnifeHitKnife() {
    if (this.isHiting) return
    this.isHiting = true

    console.log('飞刀碰到盘上的飞刀了 1')
    this.knife?.drop()
    this.checkGameState()
    this.lock = false
    console.log('飞刀碰到盘上的飞刀了 2')
  }

  /**
   * 飞刀与转盘碰撞的处理
   */
  private onKnifeHitDisc() {
    if (this.isHiting) return
    this.isHiting = true

    console.log('飞刀插在盘上了 1')
    this.disc?.stickKnife()
    this.knife?.stick()
    this.setupCollisions()
    this.checkGameState()

    const score = this.disc?.getScore() || 0
    gameStoreActions.addScore(score)
    this.lock = false
    console.log('飞刀插在盘上了 2', score)
  }

  /**
   * 检查游戏状态
   */
  private checkGameState() {
    if (gameStore.currrentKnives === 0 && gameStore.isGamePlaying) {
      gameStoreActions.setIsGamePlaying(false)

      this.disc?.broke(() => {
        console.log('gameStoreActions.nextRound()')
        gameStoreActions.nextRound()
        this.startRound()
      })
    }
  }

  /**
   * 更新游戏状态
   * @param time 当前时间
   * @param delta 时间增量
   */
  update(time: number, delta: number) {
    if (gameStore.isGamePlaying) {
      this.disc?.update(time, delta)
    }
  }

  /**
   * 绑定输入事件
   */
  private bindInput() {
    let time = +new Date()

    const handlePointerDown = () => {
      let now = +new Date()

      console.log('handlePointerDown', gameStore.currrentKnives <= 0, gameStore.isGameOver, !this.isReady, this.lock)
      if (now - time < 120) return
      if (now - time > 1000) {
        this.lock = false
      }

      if (gameStore.currrentKnives <= 0 || gameStore.isGameOver || !this.isReady || this.lock) return

      time = now
      this.isHiting = false
      this.lock = true
      gameStoreActions.reduceKnives()
      this.knife?.fly()
    }

    this.input.on('pointerdown', handlePointerDown, this)
  }
}