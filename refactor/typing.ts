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
  concat,
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

const filterMap = curry(pipe([map, compact]));
const arrayToSet = <T>(x: Array<T>): Set<T> => new Set(x);

const STATETYPENAME: string = "MapOf<OrgState>";

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

const ISARRAYOFSTRINGSTYPEARGS = [eq("tags"), eq("fileConfigLines")];

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
    overSome([eq("todoKeywordSets"), eq("currentTodoSet")]),
    constant("MapOf<OrgTodoKeywordSet>"),
  ],
  [eq("setting"), constant("MapOf<FileSetting>")],
  [eq("settings"), constant("List<MapOf<FileSetting>>")],
  [eq("fileSettings"), constant("List<MapOf<FileSetting>>")],
  [eq("row"), constant("MapOf<OrgTableRow>")],
  [eq("rows"), constant("List<MapOf<OrgTableRow>>")],
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
  [overSome(ISARRAYOFSTRINGSTYPEARGS), constant("List<string>")],
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
          Node.isFunctionDeclaration(descendant) ||
          (Node.isArrowFunction(descendant) && predicate(descendant))
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
  console.log(typeNode.getText(), Node.isTypeReference(typeNode));
  if (!Node.isTypeReference(typeNode)) return typeAsText;

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

  const replacers: Array<string> = [
    ...qualifiedNameReplacers,
    ...importTypeReplacers,
  ];
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

const getTypeForNode = (
  node: ParameterDeclaration | VariableDeclaration | BindingElement,
  stateTypeName: string = STATETYPENAME,
): string | WriterFunction | null => {
  const paramName: string = node.getName();
  const myInference: string =
    paramName == "state"
      ? stateTypeName
      : tryToConvertStringIntoType(paramName);
  if (myInference) {
    return myInference;
  }

  const typescriptInference = node.getType();
  if (typescriptInference.isAny()) {
    return null;
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

const annotateAllFunctionArguments = async (
  filePaths: Array<string>,
): Promise<void> => {
  const project = new Project({});
  forEach((filePath: string): void => {
    const sourceFile = project.addSourceFileAtPath(filePath);
    sourceFile.forEachDescendant((descendant: Node): void => {
      if (
        Node.isParameterDeclaration(descendant) &&
        !descendant.getTypeNode()
      ) {
        const type = getTypeForNode(descendant);
        type && descendant.setType(type);
      }
    });

    sourceFile.organizeImports();
  })(filePaths);
  await project.save();
};

//await annotateAllActionDispatcherReturnValues([["./src/actions/sync_backend.ts", "SyncBackendAction"]])
//await annotateAllFunctionArguments(["./src/actions/org.ts"])

const annotateAllActionCreatorReturnValues = annotateAllXReturnValues(
  ACTIONTYPESTOCREATE,
  isActionCreator,
);

const annotateAllReduxReducerReturnValues = annotateAllXReturnValues(
  [["./src/reducers/org.ts", "MapOf<OrgState>"]],
  isReduxReducer,
);

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
      console.log(funcName?.getName());
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

await shiftPropertiesFromTypeXToTypeY(
  "OrgState",
  "OrgFile",
  "./src/reducers/org.ts",
);

// await annotateReduxReducerFiles([
//   ["./src/reducers/org.ts", "OrgAction", "MapOf<OrgState>"],
// ]);
