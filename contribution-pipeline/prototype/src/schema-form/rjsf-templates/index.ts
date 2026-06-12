import type { TemplatesType } from "@rjsf/utils";

import { FieldTemplate } from "./FieldTemplate";
import { ObjectFieldTemplate } from "./ObjectFieldTemplate";
import { ArrayFieldTemplate } from "./ArrayFieldTemplate";

/**
 * 自定义模板集合 - Tailwind 风格
 * 通过 `<Form templates={customTemplates} />` 注入
 */
export const customTemplates: Partial<TemplatesType> = {
  FieldTemplate,
  ObjectFieldTemplate,
  ArrayFieldTemplate,
};
