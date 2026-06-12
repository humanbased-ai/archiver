# 需求分析
## 打标类型
- 类型1：Mid-horizon task labeling (gif分段连续打标)
- 类型3：Long-horizon task labeling (gif整体打标)

## 交互流程
- 页面访问
  - 用户访问https://codatta.io/label/1?gif=1,2,3，进入类型1打标页面
  - 用户访问https://codatta.io/label/3?gif=1,2,3，进入类型3打标页面
- 用户未登录，跳转到codatta登录页面,登录后返回打标页面
- 用户登录后，判断用户是否已经打过标，如果打过标，则将打标详情展示给用户，所有输入框置灰，按钮置灰，并在用户进行打标操作时给出已完成打标提示(对钩完成状态)
- 用户未打过标，则展示打标页面，用户进行打标操作，完成后给出已完成打标提示，所有输入框和按钮置灰，是否要引导用户去打标下一个gif或做其他的引导提示


## 功能实现
- 1.请用vite + typescript + react + tailwindcss + prettier + react-router-dom + prettier + eslint 搭建一个新项目
- 2.请实现一个方法来提取gif中的所有帧
- 3.请实现类似video播放控件的组件，可以播放、暂停、进度条拖拽、鼠标悬停展示缩略图

