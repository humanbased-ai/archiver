# Schema Form

基于 [@rjsf/core](https://github.com/rjsf-team/react-jsonschema-form) 的 JSON Schema 驱动表单系统, 用于数据采集和数据标注场景.

## 架构

```
schema-form/
├── SchemaForm.tsx          # 主入口组件 (包装 RJSF Form)
├── types.ts                # TaskTemplate / FormResult 类型
├── templates.ts            # 内置任务模板 (TEMPLATES)
├── widgets/                # 自定义 widget (RJSF widgets)
│   ├── index.tsx           #   注册表
│   ├── image-upload.tsx    #   图片上传
│   ├── image-display.tsx   #   只读图片
│   ├── image-bbox.tsx      #   矩形框标注
│   ├── text-display.tsx    #   只读文本
│   └── tags.tsx            #   标签输入
├── rjsf-templates/         # RJSF 模板 (覆盖默认 Bootstrap 样式)
│   ├── FieldTemplate.tsx   #   单字段外壳
│   ├── ObjectFieldTemplate.tsx
│   └── ArrayFieldTemplate.tsx
└── README.md               # 本文档
```

## 使用方式

```tsx
import { SchemaForm, TEMPLATES } from "@/schema-form";

const tpl = TEMPLATES.image_classification;

<SchemaForm
  id={tpl.id}
  schema={tpl.schema}
  uiSchema={tpl.uiSchema}
  taskData={{ imageUrl: "https://..." }}  // 上下文 (-> formContext)
  submitText={tpl.submitText}
  onSubmit={(result) => console.log(result.data)}
/>
```

## 标准组件 (RJSF 内置)

直接通过 schema 类型自动选择, 无需自定义:

| schema | 默认 widget |
|--------|------------|
| `string` | `TextWidget` |
| `string` + `enum/oneOf` | `SelectWidget` (可改 `radio`) |
| `string` + `format: "email/uri/date"` | 对应类型 input |
| `number` / `integer` | `NumberWidget` |
| `boolean` | `CheckboxWidget` |
| `array` (items=string + enum) | `CheckboxesWidget` |
| `array` (items=string) | 数组列表 |
| `object` | 嵌套对象 (递归) |

完整 widget 列表: [RJSF widgets reference](https://rjsf-team.github.io/react-jsonschema-form/docs/usage/widgets/)

## 自定义组件开发规范

### 1. Widget 实现

每个自定义 widget 是一个 React 组件, 接收 RJSF 标准的 `WidgetProps`:

```tsx
// widgets/my-widget.tsx
import type { WidgetProps } from "@rjsf/utils";

/**
 * 自定义 widget: 我的控件
 *
 * ui:options 支持:
 *  - someOption: ...
 */
export function MyWidget(props: WidgetProps) {
  const { value, onChange, options, schema, required, disabled, readonly, formContext } = props;

  // value: 当前值, 与表单状态双向绑定
  // onChange(newValue): 更新值
  // options: ui:options 内容
  // schema: 当前字段的 JSON Schema (含 title/description/type 等)
  // formContext: 全局上下文 (= SchemaForm 的 taskData)

  return <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
}
```

### 2. 注册

在 `widgets/index.tsx` 添加:

```tsx
import { MyWidget } from "./my-widget";

export const customWidgets: RegistryWidgetsType = {
  // ...
  "my-widget": MyWidget,
};
```

### 3. 使用

在 template 的 `uiSchema` 中引用:

```ts
uiSchema: {
  fieldName: {
    "ui:widget": "my-widget",
    "ui:options": { someOption: "value" }
  }
}
```

## 任务上下文 (formContext)

类似 Label Studio 中的 `$variable`, 用于在 widget 中读取任务级别的上下文 (图片 URL/待标注文本等):

```ts
// schema 中的字段不存数据, 只是占位
schema: {
  properties: {
    image: { type: "string", title: "待标注图片" }
  }
},
uiSchema: {
  image: {
    "ui:widget": "image-display",
    "ui:options": { sourceField: "imageUrl" }  // 从 formContext.imageUrl 读取
  }
}

// 渲染时:
<SchemaForm taskData={{ imageUrl: "https://..." }} ... />
```

`formContext` 通过 `<RjsfForm formContext={taskData}>` 注入, 在 widget 中通过 `props.formContext` 读取.

## 引入第三方组件库

按 RJSF 官方协议:

```tsx
// 例如使用 antd DatePicker
import { DatePicker } from "antd";
import dayjs from "dayjs";

export function AntdDatePickerWidget(props: WidgetProps) {
  return (
    <DatePicker
      value={props.value ? dayjs(props.value as string) : null}
      onChange={(d) => props.onChange(d?.toISOString())}
      disabled={props.disabled || props.readonly}
    />
  );
}
```

注册后即可在 uiSchema 中通过 `"ui:widget": "antd-date"` 使用.

## 联动 (字段依赖)

使用标准 JSON Schema 的 `dependencies`:

```ts
{
  type: "object",
  properties: {
    category: { type: "string", oneOf: [{ const: "animal" }, { const: "vehicle" }] }
  },
  dependencies: {
    category: {
      oneOf: [
        // category=animal 时显示 subCategory
        {
          properties: {
            category: { const: "animal" },
            subCategory: { type: "string", title: "动物子类" }
          },
          required: ["subCategory"]
        },
        // 其他情况不显示
        { properties: { category: { not: { const: "animal" } } } }
      ]
    }
  }
}
```

## 校验

完全交给 [@rjsf/validator-ajv8](https://github.com/rjsf-team/react-jsonschema-form/tree/main/packages/validator-ajv8) (符合 JSON Schema Draft 7), 无需手写校验逻辑. 例如:

```ts
{
  email: { type: "string", format: "email" },        // 自动校验邮箱
  age: { type: "integer", minimum: 0, maximum: 150 } // 自动校验范围
}
```

## 常用第三方库

| 场景 | 推荐库 |
|------|--------|
| 富文本 | TipTap / Quill |
| 日期/时间 | Ant Design DatePicker / dayjs |
| 颜色 | react-colorful |
| 文件上传 | uppy / antd Upload |
| 多媒体标注 | 自研 (image-bbox 模式) |
