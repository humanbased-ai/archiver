import Phaser from 'phaser'

import knifeImage from '@/assets/images/game/knife.png'
import knifeHImage from '@/assets/images/game/knife-h.png'

import innerDiscImage from '@/assets/images/game/disc-inner.png'
import dividerImage from '@/assets/images/game/sector-divider.png'
import iconRarity1 from '@/assets/images/game/icon-rarity-1.png'
import iconRarity2 from '@/assets/images/game/icon-rarity-2.png'
import iconRarity3 from '@/assets/images/game/icon-rarity-3.png'
import iconRarity4 from '@/assets/images/game/icon-rarity-4.png'
import iconRarity5 from '@/assets/images/game/icon-rarity-5.png'
import iconMatch from '@/assets/images/game/icon-match.png'
import iconNotMatch from '@/assets/images/game/icon-not-match.png'

import discBrokenSound from '@/assets/audios/game/disc-broken.mp3'
import hitDiscSound from '@/assets/audios/game/hit-disc.mp3'
import hitKnifeSound from '@/assets/audios/game/hit-knife.mp3'

import discDestroyAtlas from '@/assets/images/game/disc_destroy.json'
import discDestroySprite from '@/assets/images/game/disc_destroy.png'

import { gameStoreActions } from '../game.store'

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene')
  }

  preload() {
    this.load.image('knife', knifeImage)
    this.load.image('knife-h', knifeHImage)
    this.load.image('inner-disc', innerDiscImage)
    this.load.image('divider', dividerImage)
    this.load.image('rarity-1', iconRarity1)
    this.load.image('rarity-2', iconRarity2)
    this.load.image('rarity-3', iconRarity3)
    this.load.image('rarity-4', iconRarity4)
    this.load.image('rarity-5', iconRarity5)
    this.load.image('match', iconMatch)
    this.load.image('not-match', iconNotMatch)

    this.load.audio('broken', discBrokenSound)
    this.load.audio('hit-disc', hitDiscSound)
    this.load.audio('hit-knife', hitKnifeSound)

    this.load.atlas('disc', discDestroySprite, discDestroyAtlas)

    this.load.on(
      'progress',
      (process: number) => {
        console.log('load process', process)
        if (process < 1) {
          gameStoreActions.updateLoadProgress(process)
        }
      },
      this,
    )

    gameStoreActions.getGameConfig()
  }

  create() {
    // 创建圆盘破碎动画
    this.anims.create({
      key: 'destroy',
      frames: this.anims.generateFrameNames('disc', { prefix: 'disc_', suffix: '.png', end: 36, zeroPad: 3 }),
      duration: 500,
      repeat: 0,
    })

    // 创建圆盘破碎的音效
    this.sound.add('broken')

    // 创建飞刀命中盘上飞刀的音效
    this.sound.add('hit-knife')

    // 创建飞刀命中圆盘的音效
    this.sound.add('hit-disc')

    gameStoreActions.updateLoadProgress(1)
    console.log('preload scene created')
  }
}
