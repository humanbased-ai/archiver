// 自定义 widget 注册表
// ----------------------------------------------------------------
// 当前注册的所有自定义 widget. 添加新 widget 的步骤:
//   1. 在 ./<widget-name>.tsx 中实现, 接收 RJSF WidgetProps
//   2. 在此文件 import 并加入 customWidgets 对象
//   3. 在 templates 的 uiSchema 中通过 "ui:widget": "<widget-name>" 引用
//
// Widget 开发规范见 ./README.md
// ----------------------------------------------------------------

import type { RegistryWidgetsType } from "@rjsf/utils";

// 标准 widget 的 Tailwind 样式覆盖 (替换 RJSF 默认的原生 HTML 样式)
import { standardWidgets } from "./standard";

// 项目特化 widget
import { ImageUploadWidget } from "./image-upload";
import { ImageDisplayWidget } from "./image-display";
import { ImageBboxWidget } from "./image-bbox";
import { TextDisplayWidget } from "./text-display";
import { TagsWidget } from "./tags";

export const customWidgets: RegistryWidgetsType = {
  // 标准 widget (覆盖默认样式)
  ...standardWidgets,

  // 项目特化 widget (用于数据采集/标注)
  "image-upload": ImageUploadWidget,
  "image-display": ImageDisplayWidget,
  "image-bbox": ImageBboxWidget,
  "text-display": TextDisplayWidget,
  tags: TagsWidget,
};
