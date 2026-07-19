import {
  pipe,
  map,
  reduce,
  cond,
  replace,
  flatMap,
  startsWith,
  endsWith,
  stubTrue,
  eq,
  includes,
  trim,
  overSome,
  remove,
  compact,
  filter,
  constant,
  forEach,
  every,
  overEvery,
  slice,
  partialRight,
  split,
  first,
  join,
  indexOf,
  size,
  partition,
  flatten,
  curry,
  uniq,
} from "lodash/fp";
import {
  Project,
  SyntaxKind,
  SourceFile,
  Node,
  PropertySignatureStructure,
  WriterFunction,
  Writers,
  TypeAliasDeclarationStructure,
  StructureKind,
  ObjectLiteralExpression,
  TypeElementMemberedNodeStructure,
  PropertyAssignment,
  ShorthandPropertyAssignment,
  FunctionDeclaration,
  ArrowFunction,
  ParameterDeclaration,
  Type,
  CaseClause,
  UnionTypeNode,
  TypeNode,
  ObjectBindingPattern,
  ArrayBindingPattern,
  BindingElement,
  QualifiedName,
  ImportTypeNode,
  VariableDeclaration,
  PropertySignature,
  TypeAliasDeclaration,
} from "ts-morph";

const filterMap = curry(pipe([map, compact]));
const arrayToSet = <T>(x: Array<T>): Set<T> => new Set(x);
const includesAny = includes("any");

const reduceReplaceAll = (
  valuesToReplace: Array<string>,
  strToEdit: string,
): string => {
  return reduce(
    (currStrToEdit: string, valueToReplace: string): string => {
      return currStrToEdit.replaceAll(valueToReplace, "");
    },
    strToEdit,
    valuesToReplace,
  );
};

const STATETYPENAME: string = "State";

const ACTIONTYPESTOCREATE: Array<[string, string]> = [
  ["./src/actions/org.ts", "OrgAction"],
  ["./src/actions/capture.ts", "OrgCaptureAction"],
  ["./src/actions/base.ts", "BaseAction"],
  ["./src/actions/sync_backend.ts", "SyncBackendAction"],
];

const REDUCERSTATETYPES: Array<[string, string]> = [
  ["./src/reducers/org.ts", "MapOf<OrgState>"],
  ["./src/reducers/base.ts", "MapOf<BaseState>"],
  ["./src/reducers/capture.ts", "MapOf<OrgCaptureState>"],
  ["./src/reducers/sync_backend.ts", "MapOf<SyncBackendState>"],
];

const REDUCERTYPESTOCREATE: Array<[string, string]> = [
  ["./src/reducers/org.ts", "OrgState"],
  ["./src/reducers/capture.ts", "OrgCaptureState"],
  ["./src/reducers/base.ts", "BaseState"],
  ["./src/reducers/sync_backend.ts", "SyncBackendState"],
];

const MAPOFTYPES = [
  "OrgTimestampPart",
  "OrgTodoKeywordSet",
  "OrgLink",
  "OrgPercentageCookie",
  "OrgFractionCookie",
  "OrgCookie",
  "OrgInlineMarkup",
  "OrgTimestamp",
  "OrgClockString",
  "OrgListItem",
  "OrgList",
  "OrgTable",
  "OrgTableCell",
  "OrgHeadline",
  "OrgText",
  "OrgFile",
  "OrgState",
  "BaseState",
  "SyncBackendState",
  "OrgCaptureState",
  "OrgCaptureTemplate",
  "OrgPropertyListItem",
  "PendingCapture",
  "FileSetting",
  "Bookmark",
  "Search",
  "Client",
  "DirectoryListing",
  "DirectoryListingEntry",
  "AdditionalSyncBackendState",
];

const ISBOOLEANTYPEARGS = [
  startsWith("should"),
  startsWith("is"),
  startsWith("show"),
  eq("isDirty"),
  includes("Should"),
  eq("online"),
  eq("logIntoDrawer"),
  eq("preferEditRawValues"),
  eq("newAgendaStartOnWeekday"),
  eq("agendaStartOnWeekday"),
  eq("closeSubheadersRecursively"),
  eq("opennessState"),
  eq("dirtying"),
  eq("hasMore"),
  eq("isLoadingMore"),
  eq("newHasUnseenChangelog"),
  eq("hasUnseenChangelog"),
];

const ISNUMBERTYPEARGS = [
  endsWith("Id"),
  endsWith("Index"),
  eq("index"),
  eq("newAgendaDefaultDeadlineDelayValue"),
  eq("newEditorDescriptionHeightValue"),
  eq("agendaDefaultDeadlineDelayValue"),
  eq("editorDescriptionHeightValue"),
  eq("cursorPosition"),
  eq("nestingLevel"),
  eq("delay"),
  eq("newFontSize"),
  eq("fontSize"),
  eq("activeClocks"),
  eq("nestingLevel"),
];

const ISDATETYPEARGS = [
  eq("lastSyncAt"),
  eq("currentDate"),
  eq("time"),
  eq("newTime"),
];

const ISSTRINGTYPEARGS = [
  eq("content"),
  eq("loadingMessage"),
  eq("path"),
  eq("colorScheme"),
  eq("theme"),
  eq("staticFile"),
  eq("keybindingName"),
  eq("keybinding"),
  eq("message"),
  eq("contents"),
  eq("todoState"),
  eq("template"),
  eq("newRawTitle"),
  eq("rawTitle"),
  eq("inputText"),
  eq("newRawDescription"),
  eq("rawDescription"),
  eq("searchFilter"),
  eq("newValue"),
  eq("lastSeenChangelogHash"),
  eq("orgFileErrorMessage"),
  eq("newTodoState"),
  eq("currentTodoState"),
  endsWith("Path"),
];

const ISLISTOFSTRINGSTYPEARGS = [
  eq("tags"),
  eq("fileConfigLines"),
  eq("headerPaths"),
];

const ISRECORDSTRINGSTRINGTYPEARGS = [eq("newSettings"), eq("data")];

const ISTYPETYPEARGS = [
  endsWith("Type"),
  eq("modalPage"),
  eq("agendaTimeframe"),
  eq("dispatch"),
  eq("finderTab"),
  eq("bulletStyle"),
  eq("context"),
];

const ISTYPETYPEMAPOFARGS = [eq("search"), eq("pendingCapture")];

const ISHEADER = [eq("header"), eq("subHeader"), eq("subheader")];

const ISLISTOFHEADERS = [
  eq("headers"),
  eq("subHeaders"),
  eq("subheaders"),
  eq("headersOfFile"),
  eq("headersToSearch"),
];

const getActionType = (node: Node): string => {
  return pipe([
    filter(
      (descendant: PropertyAssignment): boolean =>
        descendant.getName() == "type",
    ),
    ([descendant]: Array<PropertyAssignment>) =>
      descendant?.getInitializer()?.getText(),
  ])(node.getDescendantsOfKind(SyntaxKind.PropertyAssignment));
};

const isAction = (node: Node): boolean => {
  return !!getActionType(node);
};

const collectActionValues = (sourceFile: SourceFile): Array<string> => {
  //SyntaxKind.ObjectLiteralExpression
  const actionValues: Set<string> = new Set([]);
  sourceFile.forEachDescendant((node: Node) => {
    if (!Node.isObjectLiteralExpression(node)) {
      return;
    }

    if (isAction(node)) {
      node.forEachDescendant((descendant: Node) => {
        if (
          Node.isPropertyAssignment(descendant) ||
          Node.isShorthandPropertyAssignment(descendant)
        ) {
          actionValues.add(trim(descendant.getName()));
        }
      });
    }
  });
  return Array.from(actionValues);
};

const getAllActionValues = (
  filePaths: ReadonlyArray<string>,
): Array<string> => {
  const project = new Project({});
  const sourceFiles = project.addSourceFilesAtPaths(filePaths);
  const allValues = new Set(flatMap(collectActionValues)(sourceFiles));
  return remove(eq("type"))(Array.from(allValues));
};

const REPLACERS = [replace("\n", " "), replace("/\s+/g", " ")];

const capitalize = (x: string) => x[0].toUpperCase() + x.slice(1);
const runReplacers = (string: string): string => {
  return reduce(
    (prev: string, curr: (str: string) => string): string => {
      return curr(prev);
    },
    string,
    REPLACERS,
  );
};

const tryToConvertStringIntoType = cond([
  [eq("checkboxState"), constant("OrgCheckboxState")],
  [eq("entryType"), constant("LogEntryType")],
  [eq("editMode"), constant("EditModeType")],
  [eq("newBulletStyle"), constant("BulletStyle")],
  [
    overSome([eq("todoKeywordSet"), eq("currentTodoSet")]),
    constant("MapOf<OrgTodoKeywordSet>"),
  ],
  [eq("todoKeywordSets"), constant("List<MapOf<FileSetting>>")],
  [eq("setting"), constant("MapOf<FileSetting>")],
  [eq("settings"), constant("List<MapOf<FileSetting>>")],
  [eq("fileSettings"), constant("List<MapOf<FileSetting>>")],
  [eq("row"), constant("MapOf<OrgTableRow>")],
  [eq("rows"), constant("List<MapOf<OrgTableRow>>")],
  [eq("tablePart"), constant("MapOf<OrgTable>")],
  [overSome([eq("fromList"), eq("toList")]), constant("List<any>")],
  [eq("files"), constant("List<MapOf<OrgFile>>")],
  [eq("file"), constant("MapOf<OrgFile>")],
  [eq("planningItem"), constant("MapOf<OrgPlanningItem>")],
  [eq("planningItems"), constant("List<MapOf<OrgPlanningItem>>")],
  [eq("customKeybindings"), constant("Map<string, string>")],
  [eq("modalPageStack"), constant("List<ModalPage>")],
  [eq("activePopup"), constant("MapOf<Popup>")],
  [eq("activePopupType"), constant("PopupType")],
  [eq("activePopupData"), constant("Map<string, string>")],
  [eq("linesBeforeHeadings"), constant("List<string>")],
  [eq("cell"), constant("MapOf<OrgTableCell>")],
  [eq("cells"), constant("List<MapOf<OrgTableCell>>")],
  [eq("listPart"), constant("MapOf<OrgList>")],
  [eq("bookmark"), constant("List<MapOf<Bookmark>>")],
  [eq("isLoading"), constant("Set<string>")],
  [eq("timestamp"), constant("MapOf<OrgTimestamp>")],
  [eq("timestampPart"), constant("MapOf<OrgTimestampPart>")],
  [
    overSome([eq("listItemPart"), eq("listItem")]),
    constant("MapOf<OrgListItem>"),
  ],
  [eq("listItemPart"), constant("MapOf<OrgListItem>")],
  [eq("property"), constant("MapOf<OrgPropertyListItem>")],
  [
    eq("indexedPlanningItemsWithRepeaters"),
    constant("List<MapOf<OrgPlanningItem>>"),
  ],
  [
    overSome([eq("newPropertyListItems"), eq("propertyListItems")]),
    constant("List<MapOf<OrgPropertyListItem>>"),
  ],
  [
    overSome([
      eq("newAgendaDefaultDeadlineDelayUnit"),
      eq("agendaDefaultDeadlineDelayUnit"),
    ]),
    constant("DelayUnit"),
  ],
  [overSome(ISHEADER), constant("MapOf<OrgHeadline>")],
  [overSome(ISLISTOFHEADERS), constant("List<MapOf<OrgHeadline>>")],
  [overSome(ISBOOLEANTYPEARGS), constant("boolean")],
  [overSome(ISNUMBERTYPEARGS), constant("number")],
  [overSome(ISDATETYPEARGS), constant("Date")],
  [overSome(ISSTRINGTYPEARGS), constant("string")],
  [overSome(ISLISTOFSTRINGSTYPEARGS), constant("List<string>")],
  [overSome(ISRECORDSTRINGSTRINGTYPEARGS), constant("Record<string, string>")],
  [overSome(ISTYPETYPEARGS), capitalize],
  [
    overSome(ISTYPETYPEMAPOFARGS),
    pipe([capitalize, (x: string) => `MapOf<${x}>`]),
  ],
  [stubTrue, constant(null)],
]);

const convertPropertyAssignmentIntoType = (
  node: PropertyAssignment,
): PropertySignatureStructure => {
  const name: string = node.getName();
  const val = node.getInitializer()?.getText();
  if (name == "type" && val) {
    return {
      kind: StructureKind.PropertySignature,
      name,
      type: val,
    };
  }
  return {
    kind: StructureKind.PropertySignature,
    name,
    type: tryToConvertStringIntoType(name),
  };
};

const convertShorthandPropertyAssignmentIntoType = (
  node: ShorthandPropertyAssignment,
): PropertySignatureStructure => {
  const name: string = node.getName();
  return {
    kind: StructureKind.PropertySignature,
    name,
    type: tryToConvertStringIntoType(name),
  };
};

const convertActionValueIntoWriter = (
  node: ObjectLiteralExpression,
): WriterFunction => {
  const properties: Array<PropertySignatureStructure> = pipe([
    map((node: Node): PropertySignatureStructure | undefined => {
      if (Node.isPropertyAssignment(node)) {
        return convertPropertyAssignmentIntoType(node);
      }
      if (Node.isShorthandPropertyAssignment(node)) {
        return convertShorthandPropertyAssignmentIntoType(node);
      }
      return;
    }),
    compact,
  ])(node.getProperties());

  const objectTypeStruct: TypeElementMemberedNodeStructure = {
    properties,
  };
  return Writers.objectType(objectTypeStruct);
};

const collectActions = (
  sourceFile: SourceFile,
): Array<ObjectLiteralExpression> => {
  const actions: Record<string, ObjectLiteralExpression> = {};
  sourceFile.forEachDescendant((node: Node) => {
    if (!Node.isObjectLiteralExpression(node)) {
      return;
    }

    if (isAction(node)) {
      const actionType = getActionType(node);
      actions[actionType] = node;
    }
  });
  return Object.values(actions);
};

const convertActionsIntoUnionType = (
  actions: Array<ObjectLiteralExpression>,
): WriterFunction => {
  const preppedActions: Array<WriterFunction> = map(
    convertActionValueIntoWriter,
  )(actions);
  const [first, second, ...rest] = preppedActions;
  return Writers.unionType(first, second, ...rest);
};

const createTypesForActionsInFile = (
  sourceFile: SourceFile,
  typeName: string,
): TypeAliasDeclarationStructure => {
  const typesWriter: WriterFunction = pipe([
    collectActions,
    convertActionsIntoUnionType,
  ])(sourceFile);
  return {
    kind: StructureKind.TypeAlias,
    name: typeName,
    type: typesWriter,
    isExported: true,
  };
};

const createAllActionTypes = async (
  filePathTuples = ACTIONTYPESTOCREATE,
): Promise<void> => {
  const project = new Project({});
  const typesFile = project.addSourceFileAtPath("./src/types.ts");
  forEach(([filePath, typeName]: [string, string]): void => {
    const sourceFile = project.addSourceFileAtPath(filePath);
    const variableStatementStructure: TypeAliasDeclarationStructure =
      createTypesForActionsInFile(sourceFile, typeName);
    typesFile.addTypeAlias(variableStatementStructure);
  })(filePathTuples);

  await typesFile.save();
};

const isActionCreator = (
  node: FunctionDeclaration | ArrowFunction,
): boolean => {
  const returnValue = node.getLastChildIfKind(
    SyntaxKind.ParenthesizedExpression,
  );
  return returnValue ? isAction(returnValue) : false;
};

const isActionDispatcher = (
  node: FunctionDeclaration | ArrowFunction,
): boolean => {
  const params = new Set(
    node.getParameters().map((node: ParameterDeclaration) => node.getName()),
  );
  return params.has("dispatch");
};

const isReduxReducer = (node: FunctionDeclaration | ArrowFunction): boolean => {
  const params = new Set(
    node.getParameters().map((node: ParameterDeclaration) => node.getName()),
  );
  return params.has("state") && params.has("action");
};

const isOrgFileReducer = (
  node: FunctionDeclaration | ArrowFunction,
): boolean => {
  const params = new Set(
    node.getParameters().map((node: ParameterDeclaration) => node.getName()),
  );
  if (!params.has("state")) return false;

  const stateParamType: string = node
    .getParameterOrThrow("state")
    .getTypeNodeOrThrow()
    .getText();
  return stateParamType === "MapOf<OrgFile>" ? true : false;
};

const annotateAllXReturnValues =
  (
    filePathTuples: Array<[string, string]>,
    predicate: (node: FunctionDeclaration | ArrowFunction) => boolean,
  ) =>
  async (): Promise<void> => {
    const project = new Project({});
    forEach(([filePath, typeName]: [string, string]): void => {
      const sourceFile = project.addSourceFileAtPath(filePath);
      sourceFile.forEachDescendant((descendant: Node): void => {
        if (
          (Node.isFunctionDeclaration(descendant) ||
            Node.isArrowFunction(descendant)) &&
          predicate(descendant)
        ) {
          descendant.setReturnType(typeName);
        }
      });
    })(filePathTuples);
    await project.save();
  };

const annotateAllActionDispatcherReturnValues = async (
  filePathTuples = ACTIONTYPESTOCREATE,
): Promise<void> => {
  const project = new Project({});
  forEach(([filePath]: [string, string]): void => {
    const sourceFile = project.addSourceFileAtPath(filePath);
    sourceFile.forEachDescendant((descendant: Node): void => {
      if (
        Node.isFunctionDeclaration(descendant) ||
        Node.isArrowFunction(descendant)
      ) {
        const currentReturnType = descendant.getReturnType().getText();
        if (descendant.getReturnTypeNode()) return;
        if (
          includes("import", currentReturnType) ||
          eq("any", currentReturnType)
        )
          return;
        currentReturnType &&
          currentReturnType !== "typeName" &&
          descendant.setReturnType(currentReturnType);
      }
    });
  })(filePathTuples);
  await project.save();
};

const baseConvertTypeIntoTypeNode = (): ((type: Type) => TypeNode) => {
  const tempProject = new Project({});
  const tempFile = tempProject.createSourceFile("./temp.ts", "let x = 1");
  const tempNode = tempFile.getFirstDescendantByKind(
    SyntaxKind.VariableDeclaration,
  ) as VariableDeclaration;
  return (type: Type): TypeNode =>
    tempNode.setType(type.getText()).getTypeNode() as TypeNode;
};

const convertTypeIntoTypeNode = baseConvertTypeIntoTypeNode();

const createTypeForValue = (type: Type): string => {
  const typeAsText: string = type.getText();
  const typeNode: TypeNode = convertTypeIntoTypeNode(type);

  const qualifiedNameReplacers: Array<string> = map(
    (qualifiedName: QualifiedName): string => {
      return qualifiedName.getLeft().getText() + ".";
    },
  )(typeNode.getDescendantsOfKind(SyntaxKind.QualifiedName) ?? []);

  const importTypeReplacers: Array<string> = pipe([
    map((importType: ImportTypeNode): string | undefined => {
      const qualifier = importType.getQualifier()?.getText();
      if (!qualifier) return;
      return importType
        .getText()
        .slice(0, indexOf(qualifier, typeAsText) - size(qualifier) + 1);
    }),
    compact,
  ])(typeNode.getDescendantsOfKind(SyntaxKind.ImportType) ?? []);

  const replacers: Array<string> = uniq([
    ...qualifiedNameReplacers,
    ...importTypeReplacers,
  ]);
  if (replacers.length === 0) return typeAsText;
  console.log(replacers);

  return reduceReplaceAll(replacers, typeAsText);
};

const createObjectBindingPatternType = (
  node: ObjectBindingPattern,
): WriterFunction => {
  const properties: Array<PropertySignatureStructure> = pipe([
    map((binding: BindingElement): PropertySignatureStructure | undefined => {
      const name = pipe([split(" "), first, trim])(binding.getText());
      const type = getTypeForNode(binding);
      if (!type) return;
      return {
        kind: StructureKind.PropertySignature,
        name,
        type,
      };
    }),
    compact,
  ])(node.getElements());

  return Writers.objectType({
    properties,
  });
};

const createTupleBindingPatternType = (node: ArrayBindingPattern): string => {
  return pipe([
    map(getTypeForNode),
    compact,
    join(", "),
    (x: string) => {
      return `[${x}]`.replaceAll("'", "");
    },
  ])(node.getElements());
};

const tryInferenceByVariableName = (
  node: ParameterDeclaration | VariableDeclaration | BindingElement,
  stateTypeName: string = STATETYPENAME,
): string | null => {
  const paramName: string = node.getName();
  const myInference: string =
    stateTypeName && paramName == "state"
      ? stateTypeName
      : tryToConvertStringIntoType(paramName);
  if (myInference) {
    return myInference;
  }
  return null;
};

const getTypeForNode = (
  node: ParameterDeclaration | VariableDeclaration | BindingElement,
): string | WriterFunction | null => {
  const typescriptInference = node.getType();
  if (typescriptInference.isAny()) {
    return tryInferenceByVariableName(node);
  }

  const objPattern = node.getFirstChildByKind(SyntaxKind.ObjectBindingPattern);
  if (objPattern) {
    return createObjectBindingPatternType(objPattern);
  }
  const arrayPattern = node.getFirstChildByKind(SyntaxKind.ArrayBindingPattern);
  if (arrayPattern) {
    return createTupleBindingPatternType(arrayPattern);
  }

  return createTypeForValue(typescriptInference);
};

const annotateAllDeclarations = async (
  filePaths: Array<string>,
): Promise<void> => {
  const project = new Project({});
  forEach((filePath: string): void => {
    const sourceFile = project.addSourceFileAtPath(filePath);
    sourceFile.forEachDescendant((descendant: Node): void => {
      const isDeclaration =
        Node.isParameterDeclaration(descendant) ||
        Node.isVariableDeclaration(descendant);
      if (!isDeclaration) return;

      // skip arrow functions
      if (descendant.getFirstChildByKind(SyntaxKind.ArrowFunction)) return;
      // skip curried functions
      if (
        descendant
          .getFirstChildByKind(SyntaxKind.CallExpression)
          ?.getReturnType()
          .getText()
          .includes("CurriedFunction")
      )
        return;

      const typeNode = descendant.getTypeNode();
      if (typeNode && !includesAny(typeNode.getText())) return;
      const type = getTypeForNode(descendant);
      type && descendant.setType(type);
      return;
    });
    sourceFile.fixMissingImports();
    sourceFile.organizeImports();
  })(filePaths);
  await project.save();
};

//await annotateAllActionDispatcherReturnValues([["./src/actions/sync_backend.ts", "SyncBackendAction"]])
//await annotateAllDeclarations(["./src/actions/org.ts"])
await annotateAllDeclarations(["./src/lib/org_utils.ts"]);

const annotateAllActionCreatorReturnValues = annotateAllXReturnValues(
  ACTIONTYPESTOCREATE,
  isActionCreator,
);

const annotateAllReduxReducerReturnValues = annotateAllXReturnValues(
  [["./src/reducers/org.ts", "MapOf<OrgState>"]],
  isReduxReducer,
);

const annotateAllOrgFileReducerReturnValues = annotateAllXReturnValues(
  [["./src/reducers/org.ts", "MapOf<OrgFile>"]],
  isOrgFileReducer,
);

//await annotateAllOrgFileReducerReturnValues();

const convertValueIntoPropertySignature = (
  name: string,
): PropertySignatureStructure => {
  return {
    kind: StructureKind.PropertySignature,
    name,
    type: tryToConvertStringIntoType(name),
  };
};

const convertKeysIntoObjectTypeStructure = (
  keys: Array<string>,
): TypeElementMemberedNodeStructure => {
  return {
    properties: map(convertValueIntoPropertySignature)(keys),
  };
};

const createObjectTypeStructure = (
  typeName: string,
  keys: Array<string>,
): TypeAliasDeclarationStructure => {
  const struct: TypeElementMemberedNodeStructure =
    convertKeysIntoObjectTypeStructure(keys);
  const typesWriter: WriterFunction = Writers.objectType(struct);
  return {
    kind: StructureKind.TypeAlias,
    name: typeName,
    type: typesWriter,
    isExported: true,
  };
};

const maybeGetStateValue = (node: Node): string | undefined => {
  if (!Node.isCallExpression(node)) return;
  const propertyAccessExpr = node.getFirstChildByKind(
    SyntaxKind.PropertyAccessExpression,
  );
  if (
    !propertyAccessExpr?.getFirstChild(
      (node: Node) => Node.isIdentifier(node) && node.getText() === "state",
    )
  )
    return;
  return node
    .getFirstDescendantByKind(SyntaxKind.StringLiteral)
    ?.getLiteralValue();
};

const collectAllStateValues = (sourceFile: SourceFile): Array<string> => {
  const stateValues: Set<string> = new Set();
  sourceFile.forEachDescendant((node: Node) => {
    const stateValue = maybeGetStateValue(node);
    stateValue && stateValues.add(stateValue);
  });
  return Array.from(stateValues);
};

const createStateTypeForSlice = async (
  stateTuples: Array<[string, string]>,
): Promise<void> => {
  const project = new Project({});
  const typesFile = project.addSourceFileAtPath("./src/types.ts");
  stateTuples.forEach(([filePath, typeName]: [string, string]): void => {
    const sourceFile: SourceFile = project.addSourceFileAtPath(filePath);
    const stateValues: Array<string> = collectAllStateValues(sourceFile);
    const stateTypeAlias: TypeAliasDeclarationStructure =
      createObjectTypeStructure(typeName, stateValues);
    typesFile.addTypeAlias(stateTypeAlias);
  });

  await project.save();
};

export const isUpperAlphaCharacter = (x: string): boolean => !!x.match(/[A-Z]/);

const isReduxActionType = overEvery([
  startsWith('"'),
  endsWith('"'),
  pipe([slice(1, -1), remove(eq("_")), every(isUpperAlphaCharacter)]),
]);

const getReduxReducerTypesFromSwitchCase = (
  sourceFile: SourceFile,
): Array<string> => {
  const cases = sourceFile.getDescendantsOfKind(SyntaxKind.CaseClause);
  return pipe([
    filter((caseClause: CaseClause) =>
      isReduxActionType(caseClause.getExpression().getText()),
    ),
    map((caseClause: CaseClause) =>
      caseClause.getExpression().getText().slice(1, -1),
    ),
  ])(cases);
};

const getMissingActions = async (
  filePathTuples: Array<[string, string]>,
): Promise<void> => {
  const project = new Project({});
  const typesFile = project.addSourceFileAtPath("./src/types.ts");
  filePathTuples.forEach(([filePath, typeName]: [string, string]): void => {
    const sourceFile: SourceFile = project.addSourceFileAtPath(filePath);
    const sliceType = typesFile.getTypeAlias(typeName);
    const sliceTypeValues = sliceType?.getText();
    const statements = getReduxReducerTypesFromSwitchCase(sourceFile);
    const missingStatements = remove(partialRight(includes, [sliceTypeValues]))(
      statements,
    );
  });
};

const annotateFunctionArgsInReduxReducerFile =
  (
    stateTypeName: string,
    actionMapping: Record<string, string>,
    functionMapping: Record<string, string>,
    sourceFile: SourceFile,
  ) =>
  (descendant: Node): void => {
    if (!Node.isParameterDeclaration(descendant) || descendant.getTypeNode())
      return;
    const name: string = descendant.getName();
    if (name == "state") {
      descendant.setType(stateTypeName);
      return;
    }
    if (name !== "action") {
      const type = getTypeForNode(descendant);
      if (type) descendant.setType(type);
      return;
    }

    const func = descendant.getFirstAncestor((anc: Node) => {
      return Node.isVariableDeclaration(anc);
    });

    if (!func) return;

    const funcName: string = func.getName();
    const actionTypeName = functionMapping[funcName];

    if (!actionTypeName) return;

    const actionObj = actionMapping[actionTypeName];

    if (actionObj) {
      descendant.setType(actionObj);
    }
  };

const convertActionTypeIntoObj = (
  node: UnionTypeNode,
): Record<string, string> => {
  const typeNodeToTuple = (
    typeNode: TypeNode,
  ): [string, string] | undefined => {
    if (!Node.isTypeElementMembered(typeNode)) return;
    const actionTypeName = typeNode
      .getProperty("type")
      ?.getTypeNode()
      ?.getText();
    if (!actionTypeName) return;
    return [actionTypeName, typeNode.getText()];
  };
  return pipe([map(typeNodeToTuple), compact, Object.fromEntries])(
    node.getTypeNodes(),
  );
};

const convertReducerCaseClausesIntoObj = (
  sourceFile: SourceFile,
): Record<string, string> => {
  const cases = sourceFile.getDescendantsOfKind(SyntaxKind.CaseClause);
  const expectedArgs = new Set(["state", "action"]);
  const getFunctionNameFromCaseClause = (clause: CaseClause) => {
    const func = clause.getFirstDescendantByKind(SyntaxKind.CallExpression);
    if (!func) return;
    const args = new Set(
      map((node: Node): string => node.getText())(func.getArguments()),
    );
    if (expectedArgs.difference(args).size === 0)
      return func.getExpression().getText();
    if (func.getExpression().getText() == "inFile")
      return func.getArguments()[0].getText();
  };
  return pipe([
    filter((caseClause: CaseClause) =>
      isReduxActionType(caseClause.getExpression().getText()),
    ),
    map((caseClause: CaseClause) => [
      getFunctionNameFromCaseClause(caseClause),
      caseClause.getExpression().getText(),
    ]),
    Object.fromEntries,
  ])(cases);
};

const annotateReduxReducerFiles = async (
  filePathTuples: Array<[string, string, string]>,
): Promise<void> => {
  const project = new Project({});
  const typesFile = project.addSourceFileAtPath("./src/types.ts");
  filePathTuples.forEach(
    ([filePath, actionTypeName, stateTypeName]: [
      string,
      string,
      string,
    ]): void => {
      const sourceFile: SourceFile = project.addSourceFileAtPath(filePath);
      const actionType = typesFile
        .getTypeAlias(actionTypeName)
        ?.getFirstDescendantByKind(SyntaxKind.UnionType);
      if (!actionType) return;
      // Record<actionTypeName, actionObj>
      const actionMapping = convertActionTypeIntoObj(actionType);
      // Record<functionName, actionTypeName>
      const functionMapping = convertReducerCaseClausesIntoObj(sourceFile);
      sourceFile.forEachDescendant(
        annotateFunctionArgsInReduxReducerFile(
          stateTypeName,
          actionMapping,
          functionMapping,
          sourceFile,
        ),
      );
      sourceFile.fixMissingImports();
      sourceFile.organizeImports();
    },
  );
  await project.save();
};

const filterInFileFunctions = (clause: CaseClause): string | undefined => {
  const func = clause.getFirstDescendantByKind(SyntaxKind.CallExpression);
  if (!func) return;
  if (func.getExpression().getText() == "inFile") {
    return func.getArguments()[0].getText();
  }
};

const getInFileFunctionNames = (): Promise<Array<string>> => {
  const project = new Project({});
  const sourceFile: SourceFile = project.addSourceFileAtPath(
    "./src/reducers/org.ts",
  );
  const cases = sourceFile.getDescendantsOfKind(SyntaxKind.CaseClause);
  return filterMap(filterInFileFunctions, cases);
};

const reducersForOrgFiles = async (): Promise<void> => {
  const project = new Project({});
  const sourceFile: SourceFile = project.addSourceFileAtPath(
    "./src/reducers/org.ts",
  );
  const inFileFunctions: Set<string> = pipe([
    getInFileFunctionNames,
    (x: Array<string>): Set<string> => new Set(x),
  ])();

  sourceFile.forEachDescendant((descendant: Node): void => {
    if (!Node.isParameterDeclaration(descendant)) return;
    if (descendant.getName() !== "state") return;
    const funcName = descendant.getFirstAncestorByKind(
      SyntaxKind.VariableDeclaration,
    );
    if (funcName && inFileFunctions.has(funcName.getName())) {
      descendant.setType("MapOf<OrgFile>");
    }
  });

  await project.save();
};

const convertPropSignaturesIntoStructures = map(
  (propSig: PropertySignature): PropertySignatureStructure => {
    return propSig.getStructure();
  },
);

const shiftPropertiesFromTypeXToTypeY = async (
  typeX: string,
  typeY: string,
  fileWithProps: string,
): Promise<void> => {
  const project = new Project({});
  const sourceFile: SourceFile = project.addSourceFileAtPath(
    "./src/reducers/org.ts",
  );
  const typesFile = project.addSourceFileAtPath("./src/types.ts");
  const inFileFunctions: Set<string> = pipe([
    getInFileFunctionNames,
    arrayToSet,
  ])();

  const inFileStateFilter = (
    variable: VariableDeclaration,
  ): Array<string> | undefined => {
    if (!inFileFunctions.has(variable.getName())) return;
    return filterMap(
      maybeGetStateValue,
      variable.getDescendantsOfKind(SyntaxKind.CallExpression),
    );
  };
  const inFileState: Set<string> = pipe([filterMap, flatten, arrayToSet])(
    inFileStateFilter,
    sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration),
  );

  const typeAliasX: TypeAliasDeclaration = typesFile.getTypeAliasOrThrow(typeX);
  const typeAliasY: TypeAliasDeclaration = typesFile.getTypeAliasOrThrow(typeY);
  const typeAliasXProps = convertPropSignaturesIntoStructures(
    typeAliasX
      .getFirstChildByKindOrThrow(SyntaxKind.TypeLiteral)
      .getProperties(),
  );
  const typeAliasYPropStructs: Array<PropertySignatureStructure> =
    convertPropSignaturesIntoStructures(
      typeAliasY
        .getFirstChildByKindOrThrow(SyntaxKind.TypeLiteral)
        .getProperties(),
    );

  const [newTypeAliasXProps, propStructsToAddToTypeAliasY]: [
    Array<PropertySignatureStructure>,
    Array<PropertySignatureStructure>,
  ] = partition((propSig: PropertySignatureStructure): boolean => {
    if (inFileState.has(propSig.name)) {
      return false;
    }
    return true;
  }, typeAliasXProps);

  const typeAliasYPropStructNames = pipe([
    map((property: PropertySignatureStructure): string => property.name),
    arrayToSet,
  ])(typeAliasYPropStructs);

  const removeDuplicateStructs = (
    propertySig: PropertySignatureStructure,
  ): PropertySignatureStructure | undefined => {
    if (typeAliasYPropStructNames.has(propertySig.name)) return;
    return propertySig;
  };

  const newTypeAliasYProps: Array<PropertySignatureStructure> = uniq([
    ...typeAliasYPropStructs,
    ...filterMap(removeDuplicateStructs, propStructsToAddToTypeAliasY),
  ]);

  const newTypeAliasX: WriterFunction = Writers.objectType({
    properties: newTypeAliasXProps,
  });

  const newTypeAliasY = Writers.objectType({
    properties: newTypeAliasYProps,
  });

  typeAliasX.setType(newTypeAliasX);
  typeAliasY.setType(newTypeAliasY);

  await project.save();
};

const fixMapOfTypes = async (path: string): Promise<void> => {
  const MAPOFTYPESSET = new Set(MAPOFTYPES);
  const project = new Project({});

  const sourceFiles: Array<SourceFile> = project.addSourceFilesAtPaths(path);

  forEach((sourceFile: SourceFile): void => {
    const params: Array<ParameterDeclaration> = sourceFile.getDescendantsOfKind(
      SyntaxKind.Parameter,
    );
    forEach((param: ParameterDeclaration) => {
      const typeNode = param.getTypeNode()?.getText();
      if (!typeNode) return;
      if (!MAPOFTYPESSET.has(typeNode)) return;
      console.log(typeNode);
      param.setType(`MapOf<${typeNode}>`);
    })(params);
  })(sourceFiles);

  await project.save();
};

const annotateAllReturnTypesInFiles = async (
  filePaths: Array<string>,
): Promise<void> => {
  const project = new Project({});
  forEach((filePath: string): void => {
    const sourceFile = project.addSourceFileAtPath(filePath);
    sourceFile.forEachDescendant((descendant: Node): void => {
      const isFunc =
        Node.isFunctionDeclaration(descendant) ||
        Node.isArrowFunction(descendant);
      if (!isFunc) return;
      const typeNode = descendant.getReturnTypeNode();
      if (typeNode && typeNode.getText() !== "any") return;
      const inferredType: Type = descendant.getReturnType();
      if (inferredType.getText() !== "any") {
        descendant.setReturnType(createTypeForValue(inferredType));
        return;
      }
      return;
    });
  })(filePaths);
  await project.save();
};

await annotateAllReturnTypesInFiles(["./src/lib/org_utils.ts"]);

//await fixMapOfTypes("./src/reducers/*")

// await shiftPropertiesFromTypeXToTypeY(
//   "OrgState",
//   "OrgFile",
//   "./src/reducers/org.ts",
// );

// await annotateReduxReducerFiles([
//   ["./src/reducers/org.ts", "OrgAction", "MapOf<OrgState>"],
// ]);
