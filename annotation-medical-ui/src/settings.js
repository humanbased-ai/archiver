module.exports = {
  /**
   * 侧边栏主题 深色主题theme-dark，浅色主题theme-light
   */
  sideTheme: 'theme-dark',

  /**
   * 是否系统布局配置
   */
  showSettings: false,

  /**
   * 是否显示顶部导航
   */
  topNav: false,

  /**
   * 是否显示 tagsView
   */
  tagsView: true,

  /**
   * 是否固定头部
   */
  fixedHeader: false,

  /**
   * 是否显示logo
   */
  sidebarLogo: true,

  /**
   * 是否显示动态标题
   */
  dynamicTitle: false,

  /**
   * @type {string | array} 'production' | ['production', 'development']
   * @description Need show err logs component.
   * The default is only used in the production env
   * If you want to also use it in dev, you can pass ['production', 'development']
   */
  errorLog: 'production',
  // baseUrl: 'http://192.168.33.168:9090',
  // baseUrl_img: 'http://localhost:8080',
  // image_url: 'http://192.168.33.168:9090',
  // service_url: 'http://192.168.33.168:9093/image/uploadFile',
  // domain: "localhost",

  baseUrl: 'https://healthcare.codatta.io',
  baseUrl_img: 'https://image-healthcare.codatta.io',
  image_url: 'https://healthcare.codatta.io/api',
  service_url: 'https://ims-healthcare.codatta.io/image/uploadFile',
  domain: ".codatta.io",
}
