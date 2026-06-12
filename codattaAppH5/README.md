## What is inside?

This project uses many tools like:

### UI Library
- [antd-mobile](https://mobile.ant.design/zh) 提供移动端的 Ant Design 风格 UI 组件，适用于快速开发现代化的移动 Web 应用。
- [lucide-react](https://lucide.dev/) 提供一组易于使用的 SVG 图标库，专为 React 应用设计，用于增强用户界面和交互体验。
- [tailwindcss](https://www.tailwindcss.cn/) 提供基于类名的低级别 CSS 框架，支持快速开发和定制化网页样式，适用于响应式设计和自定义主题。
- [framer-motion](https://www.framer.com/motion/) 提供强大的动画效果库，用于创建流畅的动态交互和复杂的用户界面动画效果。
- [tailwindcss-animated](https://www.tailwindcss-animated.com/)  扩展了 TailwindCSS 的动画能力，提供了一组基础的动画效果类名和工具，用于快速实现常见的界面动画效果。

### Utils
- [@faker-js/faker](https://fakerjs.dev/guide/) 生成各种类型的随机测试数据，如姓名、地址、文本等，用于模拟和测试真实场景中的数据需求。
- [@udecode/cn](https://platejs.org/docs/api/cn#withvariants)  为 React 和 TailwindCSS 设计的工具集，简化开发和样式管理，帮助开发者在项目中快速构建和管理复杂的 UI 组件和样式。
- [dayjs](https://day.js.org/docs/en/parse/string) 轻量级的日期处理库，用于日期格式化、解析和操作，替代传统的 Moment.js 库，用于处理和展示日期和时间。
- [charles](https://help.testlio.com/en/articles/1144391-charles-proxy-guide-for-ios) 代理调试工具

### State
- [valtio](https://valtio.pmnd.rs/docs/introduction/getting-started)  简化的状态管理库，提供响应式状态对象，用于管理 React 应用中的全局或局部状态，简化状态管理流程和代码编写。

### Plugins
- [@spiriit/vite-plugin-svg-spritemap](https://github.com/SpiriitLabs/vite-plugin-svg-spritemap) Vite 插件，用于将多个 SVG 图标集合并为雪碧图，优化 SVG 图标的加载和使用，提高页面性能和开发效率。

### Resources
- [Figma](https://www.figma.com/design/1INsKGvWvp1sgDPjJAUoXf/%E7%A7%BB%E5%8A%A8%E7%AB%AF%E9%80%82%E9%85%8D?node-id=230-1346&t=lJB6nkxFksBUhnqT-0)
- [Figma 色系、字体规范](https://www.figma.com/design/1INsKGvWvp1sgDPjJAUoXf/%E7%A7%BB%E5%8A%A8%E7%AB%AF%E9%80%82%E9%85%8D?node-id=1427-2554&t=9EXH9KQ4hmwjMNKq-0)
- [Telegram mini app doc](https://docs.ton.org/develop/dapps/telegram-apps/app-examples)
- [Telegram mini app office doc](https://core.telegram.org/bots/webapps)
- [Telegram mini app twa/sdk](https://docs.telegram-mini-apps.com/packages/tma-js-sdk)
- [Telegram mini app](https://www.jackygu.me/posts/a-telegram-mini-app/)
- [Telegram bot sdk](https://telegram-bot-sdk.readme.io/reference/setwebhook)
- [Telegram mini app sdk github](https://github.com/Telegram-Mini-Apps/telegram-apps/tree/master/packages)
- [polyfill tg scroll](https://dev.to/nimaxin/how-to-fix-the-telegram-mini-app-scrolling-collapse-issue-a-handy-trick-1abe)

### Attention
- Tg上禁用fix布局，请用absolute代替

## Getting Started

### Install

```bash
yarn install
```
### Dev

```bash
# 开发时，会自动模拟小程序参数，可在src/hooks/tg/useLaunchParams.ts中改schema参数
yarn dev
```

### Lint

```bash
yarn lint
```

### Typecheck

```bash
yarn typecheck
```

### Build

```bash
yarn build
```

### Test

```bash
yarn test
```

View and interact with your tests via UI.

```bash
yarn test:ui
```

### Bundle Analyze

```bash
yarn analyze
```

### test tg params 
```bash
 http://localhost:5175/m/demo/tg?tgWebAppStartParam=L3ZhbGlkYXRpb24vU00yMDI0MDYxNDA2MDkwOTM3OTUvc3VibWl0P2E9MSZiPTI%3D#tgWebAppData=user%3D%257B%2522id%2522%253A6868088893%252C%2522first_name%2522%253A%2522Mackey%2522%252C%2522last_name%2522%253A%2522%2522%252C%2522username%2522%253A%2522Yaya_007ma%2522%252C%2522language_code%2522%253A%2522en%2522%257D%26chat_instance%3D-849526732228562893%26chat_type%3Dprivate%26start_param%3DL3ZhbGlkYXRpb24vU00yMDI0MDYxNDA2MDkwOTM3OTUvc3VibWl0P2E9MSZiPTI%26auth_date%3D1720074726%26hash%3Dace54bda7c64bf61439094646b7d92f98e189efd923b04b6b1a1e8b023a6d398&tgWebAppVersion=7.4&tgWebAppPlatform=weba&tgWebAppThemeParams=%7B%22bg_color%22%3A%22%23212121%22%2C%22text_color%22%3A%22%23ffffff%22%2C%22hint_color%22%3A%22%23aaaaaa%22%2C%22link_color%22%3A%22%238774e1%22%2C%22button_color%22%3A%22%238774e1%22%2C%22button_text_color%22%3A%22%23ffffff%22%2C%22secondary_bg_color%22%3A%22%230f0f0f%22%2C%22header_bg_color%22%3A%22%23212121%22%2C%22accent_text_color%22%3A%22%238774e1%22%2C%22section_bg_color%22%3A%22%23212121%22%2C%22section_header_text_color%22%3A%22%23aaaaaa%22%2C%22subtitle_text_color%22%3A%22%23aaaaaa%22%2C%22destructive_text_color%22%3A%22%23e53935%22%7D

```

### release
- 2024/11/1  修复referal landing页面没有记录referal code的问题。
- 2024/10/22 validation 改版
- 2024/10/15 登录引入okx connect
- 2024/10/08 删除整个vault tab和相关路由和quest
- 2024/09/13 增加manta活动，TG向web引流的quest
- 2024/09/12 修复Buffer问题
- 2024/09/11 去掉了dynamic，增加邮箱登录。
- 2024/09/06 飞刀TG小游戏上线
- 2024/09/05 质押部分，去掉了codatta point的质押逻辑
- 2024/09/04 修改再质押文案, OKX 新增quest。
- 2024/09/03 退出登录增加ton disconnect， 质押失败再质押流程。 
- 2024/08/30 增加验证错误的展示。
- 2024/08/29 钱包链接优化，问题1:执行同步代码后，disconnect可能滞后，导致钱包报错或者无法跳回，问题2:异常后需要disconnec，否则第二次会有问题。修改OKX文案。
- 2024/08/28 OKX活动优化toast, 优化ton链接，nonce的获取，以确保链接按钮代码同步化（避免钱包无法唤起的问题， ios需要在用户点击事件的同步代码中才可唤起其他app）。
- 2024/08/27 OKX活动, 切换到自研钱包链接，屏蔽邮箱登录
- 2024/08/23 优化ADS的文档
- 2024/08/21 修改用户协议 增加广告埋点
- 2024/08/20 ADS广告实验一期, points 不能是小数
- 20224/08/09 TG二期, 双端quest






- 


