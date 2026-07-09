import type { OrgCaptureAction } from "../types";

export const addNewEmptyCaptureTemplate = (): OrgCaptureAction => ({
  type: "ADD_NEW_EMPTY_CAPTURE_TEMPLATE",
});

export const updateTemplateFieldPathValue = (
  templateId: number,
  fieldPath: string,
  newValue: string,
): OrgCaptureAction => ({
  type: "UPDATE_TEMPLATE_FIELD_PATH_VALUE",
  templateId,
  fieldPath,
  newValue,
});

export const addNewTemplateOrgFileAvailability = (
  templateId: number,
): OrgCaptureAction => ({
  type: "ADD_NEW_TEMPLATE_ORG_FILE_AVAILABILITY",
  templateId,
});

export const removeTemplateOrgFileAvailability = (
  templateId: number,
  orgFileAvailabilityIndex: number,
): OrgCaptureAction => ({
  type: "REMOVE_TEMPLATE_ORG_FILE_AVAILABILITY",
  templateId,
  orgFileAvailabilityIndex,
});

export const addNewTemplateHeaderPath = (
  templateId: number,
): OrgCaptureAction => ({
  type: "ADD_NEW_TEMPLATE_HEADER_PATH",
  templateId,
});

export const removeTemplateHeaderPath = (
  templateId: number,
  headerPathIndex: number,
): OrgCaptureAction => ({
  type: "REMOVE_TEMPLATE_HEADER_PATH",
  templateId,
  headerPathIndex,
});

export const deleteTemplate = (templateId: number): OrgCaptureAction => ({
  type: "DELETE_TEMPLATE",
  templateId,
});

export const restoreCaptureSettings = (
  newSettings: Record<string, string>,
): OrgCaptureAction => ({
  type: "RESTORE_CAPTURE_SETTINGS",
  newSettings,
});

export const reorderCaptureTemplate = (
  fromIndex: number,
  toIndex: number,
): OrgCaptureAction => ({
  type: "REORDER_CAPTURE_TEMPLATE",
  fromIndex,
  toIndex,
});
