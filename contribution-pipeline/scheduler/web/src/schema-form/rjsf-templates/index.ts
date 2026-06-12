import type { TemplatesType } from "@rjsf/utils";
import { FieldTemplate } from "./FieldTemplate";
import { ObjectFieldTemplate } from "./ObjectFieldTemplate";
import { ArrayFieldTemplate } from "./ArrayFieldTemplate";

export const customTemplates: Partial<TemplatesType> = {
  FieldTemplate,
  ObjectFieldTemplate,
  ArrayFieldTemplate,
};
