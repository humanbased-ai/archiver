import type { RegistryWidgetsType } from "@rjsf/utils";
import { standardWidgets } from "./standard";
import { TagsWidget } from "./tags";
import { ImageUploadWidget } from "./image-upload";
import { ImageDisplayWidget } from "./image-display";
import { TextDisplayWidget } from "./text-display";

export const customWidgets: RegistryWidgetsType = {
  ...standardWidgets,
  tags: TagsWidget,
  "image-upload": ImageUploadWidget,
  "image-display": ImageDisplayWidget,
  "text-display": TextDisplayWidget,
};
