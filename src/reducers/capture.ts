import { Map, List, type MapOf } from "immutable";
import type { OrgCaptureAction, OrgCaptureUpdateAction, OrgCaptureTemplate, ReorderOrgCaptureTemplateAction, RestoreOrgCaptureAction, UpdateOrgCaptureAction, OrgCaptureState } from "../types"
import generateId from "../lib/id_generator";
import { applyCaptureSettingsFromConfig } from "../util/settings_persister";

const indexOfTemplateWithId = (templates: List<MapOf<OrgCaptureTemplate>>, templateId: number): MapOf<OrgCaptureTemplate> | undefined =>
  templates.findIndex((template: MapOf<OrgCaptureTemplate>) => template.get("id") === templateId);

const addNewEmptyCaptureTemplate = (state: MapOf<OrgCaptureState>) => {
  if (!state.get("captureTemplates")) {
    state = state.set("captureTemplates", List());
  }

  return state.update("captureTemplates", (templates: List<MapOf<OrgCaptureTemplate>>): List<MapOf<OrgCaptureTemplate>> =>
    templates.push(
      Map({
        id: generateId(),
        description: "",
        letter: "",
        iconName: "",
        isAvailableInAllOrgFiles: true,
        file: "",
        orgFilesWhereAvailable: List([""]),
        headerPaths: List([""]),
        shouldPrepend: false,
        template: "",
      }),
    ),
  );
};

const updateTemplateFieldPathValue = (state: MapOf<OrgCaptureState>, action: UpdateOrgCaptureAction): MapOf<OrgCaptureState> => {
  const templateIndex = indexOfTemplateWithId(
    state.get("captureTemplates"),
    action.templateId,
  );

  return state.setIn(
    ["captureTemplates", templateIndex].concat(action.fieldPath),
    action.newValue,
  );
};

const addNewTemplateOrgFileAvailability = (state: MapOf<OrgCaptureState>, action: OrgCaptureUpdateAction): MapOf<OrgCaptureState> => {
  const templateIndex = indexOfTemplateWithId(
    state.get("captureTemplates"),
    action.templateId,
  );

  return state.updateIn(
    ["captureTemplates", templateIndex, "orgFilesWhereAvailable"],
    (orgFiles: List<string>): List<string> => orgFiles.push(""),
  );
};

const removeTemplateOrgFileAvailability = (state: MapOf<OrgCaptureState>, action: OrgCaptureUpdateAction): MapOf<OrgCaptureState> => {
  const templateIndex = indexOfTemplateWithId(
    state.get("captureTemplates"),
    action.templateId,
  );

  return state.updateIn(
    ["captureTemplates", templateIndex, "orgFilesWhereAvailable"],
    (orgFiles: List<string>): List<string> => orgFiles.delete(action.orgFileAvailabilityIndex),
  );
};

const addNewTemplateHeaderPath = (state: MapOf<OrgCaptureState>, action: OrgCaptureUpdateAction): MapOf<OrgCaptureState> => {
  const templateIndex = indexOfTemplateWithId(
    state.get("captureTemplates"),
    action.templateId,
  );

  return state.updateIn(
    ["captureTemplates", templateIndex, "headerPaths"],
    (headerPaths: List<string>): List<string> => headerPaths.push(""),
  );
};

const removeTemplateHeaderPath = (state: MapOf<OrgCaptureState>, action: OrgCaptureUpdateAction): MapOf<OrgCaptureState> => {
  const templateIndex = indexOfTemplateWithId(
    state.get("captureTemplates"),
    action.templateId,
  );

  return state.updateIn(
    ["captureTemplates", templateIndex, "headerPaths"],
    (headerPaths: List<string>): List<string> => headerPaths.delete(action.headerPathIndex),
  );
};

const deleteTemplate = (state: MapOf<OrgCaptureState>, action: OrgCaptureUpdateAction): MapOf<OrgCaptureState> => {
  const templateIndex = indexOfTemplateWithId(
    state.get("captureTemplates"),
    action.templateId,
  );

  return state.update("captureTemplates", (templates) =>
    templates.delete(templateIndex),
  );
};

const restoreCaptureSettings = (state: MapOf<OrgCaptureState>, action: RestoreOrgCaptureAction): MapOf<OrgCaptureState> => {
  if (!action.newSettings) {
    return state;
  }

  return applyCaptureSettingsFromConfig(state, action.newSettings);
};


const reorderCaptureTemplate = (state: MapOf<OrgCaptureState>, action: ReorderOrgCaptureTemplateAction): MapOf<OrgCaptureState> =>
  state.update("captureTemplates", (templates) =>
    templates
      .splice(action.fromIndex, 1)
      .splice(action.toIndex, 0, templates.get(action.fromIndex)),
  );

export default (state: MapOf<OrgCaptureState> = Map({} as OrgCaptureState), action: OrgCaptureAction): MapOf<OrgCaptureState> => {
  switch (action.type) {
    case "ADD_NEW_EMPTY_CAPTURE_TEMPLATE":
      return addNewEmptyCaptureTemplate(state, action);
    case "UPDATE_TEMPLATE_FIELD_PATH_VALUE":
      return updateTemplateFieldPathValue(state, action);
    case "ADD_NEW_TEMPLATE_ORG_FILE_AVAILABILITY":
      return addNewTemplateOrgFileAvailability(state, action);
    case "REMOVE_TEMPLATE_ORG_FILE_AVAILABILITY":
      return removeTemplateOrgFileAvailability(state, action);
    case "ADD_NEW_TEMPLATE_HEADER_PATH":
      return addNewTemplateHeaderPath(state, action);
    case "REMOVE_TEMPLATE_HEADER_PATH":
      return removeTemplateHeaderPath(state, action);
    case "DELETE_TEMPLATE":
      return deleteTemplate(state, action);
    case "RESTORE_CAPTURE_SETTINGS":
      return restoreCaptureSettings(state, action);
    case "REORDER_CAPTURE_TEMPLATE":
      return reorderCaptureTemplate(state, action);
    default:
      return state;
  }
};
