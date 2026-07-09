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
  mergeAll,
  every,
  first,
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
  ImportDeclarationStructure,
  ImportDeclaration,
  ImportSpecifier,
  Type,
  TypeAliasDeclaration,
  InterfaceDeclaration,
} from "ts-morph";

const ACTIONTYPESTOCREATE: Array<[string, string]> = [
  ["./src/actions/org.ts", "OrgAction"],
  ["./src/actions/capture.ts", "OrgCaptureAction"],
  ["./src/actions/base.ts", "BaseAction"],
  ["./src/actions/sync_backend.ts", "SyncBackendAction"],
];

const REDUCERTYPESTOCREATE: Array<[string, string]> = [
  ["./src/reducers/org.ts", "MapOf<BaseState>"],
  ["./src/reducers/capture.ts", "MapOf<OrgCaptureState>"],
  ["./src/reducers/base.ts", "MapOf<OrgState>"],
  ["./src/reducers/sync_backend.ts", "MapOf<SyncBackendState>"],
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
  eq("closeSubheadersRecursively"),
  eq("opennessState"),
  eq("dirtying"),
  eq("hasMore"),
  eq("isLoadingMore"),
];

const ISNUMBERTYPEARGS = [
  endsWith("Id"),
  endsWith("Index"),
  eq("newFontSize"),
  eq("index"),
  eq("newAgendaDefaultDeadlineDelayValue"),
  eq("newEditorDescriptionHeightValue"),
  eq("cursorPosition"),
  eq("nestingLevel"),
  eq("delay"),
];

const ISDATETYPEARGS = [
  eq("timestamp"),
  eq("lastSyncAt"),
  eq("currentDate"),
  eq("time"),
  eq("newTime"),
];

const ISSTRINGTYPEARGS = [
  eq("contents"),
  eq("content"),
  eq("loadingMessage"),
  eq("path"),
  eq("lastViewedPath"),
  eq("colorScheme"),
  eq("theme"),
  eq("staticFile"),
  eq("keybindingName"),
  eq("keybinding"),
  eq("message"),
  eq("fieldPath"),
  eq("contents"),
  eq("newTodoState"),
  eq("targetPath"),
  eq("sourcePath"),
  eq("template"),
  eq("bookmark"),
  eq("newRawTitle"),
  eq("inputText"),
  eq("newRawDescription"),
  eq("searchFilter"),
  eq("newValue"),
  eq("lastViewedPath"),
  eq("lastViewedFilePath"),
];

const ISARRAYTYPEARGS = [
  eq("tags"),
  eq("keybindings"),
  eq("newPropertyListItems"),
];

const ISTYPETYPEARGS = [
  endsWith("Type"),
  eq("modalPage"),
  eq("agendaTimeframe"),
  eq("context"),
  eq("dispatch"),
  eq("finderTab"),
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

const getTypeForValue = cond([
  [overSome(ISBOOLEANTYPEARGS), constant("boolean")],
  [overSome(ISNUMBERTYPEARGS), constant("number")],
  [overSome(ISDATETYPEARGS), constant("Date")],
  [overSome(ISSTRINGTYPEARGS), constant("string")],
  [overSome(ISARRAYTYPEARGS), constant("Array<string>")],
  [eq("entryType"), constant("LogEntryType")],
  [eq("newBulletStyle"), constant("BulletStyle")],
  [overSome(ISTYPETYPEARGS), capitalize],
  [eq("newAgendaDefaultDeadlineDelayUnit"), constant("DelayUnit")],
  [
    overSome([eq("newSettings"), eq("data")]),
    constant("Record<string, string>"),
  ],
  [stubTrue, constant("any")],
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
    type: getTypeForValue(name),
  };
};

const convertShorthandPropertyAssignmentIntoType = (
  node: ShorthandPropertyAssignment,
): PropertySignatureStructure => {
  const name: string = node.getName();
  return {
    kind: StructureKind.PropertySignature,
    name,
    type: getTypeForValue(name),
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

const getNamedImportsAsString = map(
  (currentNamedImport: ImportSpecifier): string => currentNamedImport.getName(),
);

const sourceFileHasNamedImport = (
  sourceFile: SourceFile,
  namedImport: string,
): boolean => {
  const sourceFileNamedImports: Set<string> = pipe([
    flatMap(
      (importDeclaration: ImportDeclaration): Array<string> =>
        getNamedImportsAsString(importDeclaration.getNamedImports()),
    ),
    (namedImports: Array<string>): Set<string> => new Set(namedImports),
  ])(sourceFile.getImportDeclarations());
  return sourceFileNamedImports.has(namedImport);
};

const getAllOrgTypesAsStrings = (): Array<string> => {
  const project = new Project({});
  const typesFile = project.addSourceFileAtPath("./src/types.ts");
  const allTypes = [
    ...typesFile.getDescendantsOfKind(SyntaxKind.TypeAliasDeclaration),
    ...typesFile.getDescendantsOfKind(SyntaxKind.InterfaceDeclaration),
  ];
  return map((x: TypeAliasDeclaration | InterfaceDeclaration): string =>
    x.getName(),
  )(allTypes);
};

const filterForLibraries = (importDeclaration: ImportDeclaration): boolean => {
  return !importDeclaration.isModuleSpecifierRelative();
};

const mapAllNamedImportsToModuleSpecifier = (
  importDeclaration: ImportDeclaration,
): Record<string, string> => {
  const moduleSpecifier: string = importDeclaration
    .getModuleSpecifier()
    .getLiteralValue();
  return pipe([
    map((x: ImportSpecifier): [string, string] => [
      x.getName(),
      moduleSpecifier,
    ]),
    Object.fromEntries,
  ])(importDeclaration.getNamedImports());
};

const isTypeImportSpecifier = (importSpecifier: ImportSpecifier) => {
  return importSpecifier.isTypeOnly();
};

const importDeclarationContainsTypeImports = (
  importDeclaration: ImportDeclaration,
): boolean => {
  const imports = filter(isTypeImportSpecifier)(
    importDeclaration.getNamedImports(),
  );
  return imports.length > 0;
};
const filterForLibraryTypeImports = (
  importDeclaration: ImportDeclaration,
): boolean => {
  if (importDeclaration.isModuleSpecifierRelative()) return false;
  return (
    importDeclaration.isTypeOnly() ||
    importDeclarationContainsTypeImports(importDeclaration)
  );
};

const mapAllNamedTypeImportsToModuleSpecifier = (
  importDeclaration: ImportDeclaration,
): Record<string, string> => {
  if (importDeclaration.isTypeOnly())
    return mapAllNamedTypeImportsToModuleSpecifier(importDeclaration);
  const moduleSpecifier: string = importDeclaration
    .getModuleSpecifier()
    .getLiteralValue();
  return pipe([
    filter(isTypeImportSpecifier),
    map((x: ImportSpecifier): [string, string] => [
      x.getName(),
      moduleSpecifier,
    ]),
    Object.fromEntries,
  ])(importDeclaration.getNamedImports());
};

const createImportsMapping =
  (
    importDeclarationFilter: (importDeclaration: ImportDeclaration) => boolean,
    importMapper: (
      importDeclaration: ImportDeclaration,
    ) => Record<string, string>,
  ) =>
  (): Record<string, string> => {
    const project = new Project({});
    project.addSourceFilesAtPaths("./src/**");
    const reducer = (
      mapping: Record<string, string>,
      sourceFile: SourceFile,
    ): Record<string, string> => {
      const newMaps = pipe([
        filter(importDeclarationFilter),
        map(importMapper),
      ])(sourceFile.getImportDeclarations());

      return mergeAll([mapping, ...newMaps]);
    };

    return reduce(reducer, {}, project.getSourceFiles());
  };

const getAllLibraryImports = createImportsMapping(
  filterForLibraries,
  mapAllNamedImportsToModuleSpecifier,
);
const getAllLibraryTypeImports = createImportsMapping(
  filterForLibraryTypeImports,
  mapAllNamedImportsToModuleSpecifier,
);

const ALLORGTYPES = new Set(getAllOrgTypesAsStrings());
const DEPENDENCYMAPPING = getAllLibraryImports();
const LIBRARYTYPESMAPPING = getAllLibraryTypeImports();

const isOrgType = (inference: string): boolean => {
  return ALLORGTYPES.has(inference);
};

const isLibraryTypeImport = (inference: string) => {
  return LIBRARYTYPESMAPPING[inference];
};

const isDependencyImport = (inference: string) => {
  return DEPENDENCYMAPPING[inference];
};

const maybeAddImportToFile = (
  sourceFile: SourceFile,
  moduleSpecifier: string,
  namedImport: string,
): void => {
  if (sourceFileHasNamedImport(sourceFile, namedImport)) return;

  const structure: ImportDeclarationStructure = {
    kind: 16,
    namedImports: [namedImport],
    moduleSpecifier,
  };
  // add lodash imports
  sourceFile.addImportDeclaration(structure);
};

const PRIMITIVETYPESSET = new Set(["string", "number", "boolean", ""]);
const isPrimitiveType = (
  type: Type,
  typeSet: Set<string> = PRIMITIVETYPESSET,
): boolean => {
  if (typeSet.has(type.getText())) return true;
  if (type.isTuple()) return every(isPrimitiveType, type.getTupleElements());
  if (type.isArray()) {
    const arrayElementType = type.getArrayElementType();
    return arrayElementType ? isPrimitiveType(arrayElementType) : false;
  }
  if (type.isUnion()) return every(isPrimitiveType, type.getUnionTypes());
  if (type.getTypeArguments())
    return every(isPrimitiveType, type.getTypeArguments());
  return false;
};
const handleTypescriptInference = (
  node: ParameterDeclaration,
  sourceFile: SourceFile,
  type: Type,
): void => {
  //if (normalType) just return it as a string
  if (isPrimitiveType(type)) node.setType(type.getText());
};

const annotateParameter = (
  sourceFile: SourceFile,
  node: ParameterDeclaration,
): void => {
  const paramName: string = node.getName();
  const myInference: string = getTypeForValue(paramName);
  const typescriptInference = node.getType();
  const typescriptInferenceAsString: string = node.getType().getText();

  if (myInference == "any" && typescriptInferenceAsString == "any") {
    return;
  }

  if (myInference == "any" && typescriptInferenceAsString !== "any") {
    handleTypescriptInference(node, sourceFile, typescriptInference);
    return;
  }

  if (isOrgType(myInference)) {
    const typesPath: string = sourceFile
      .getDirectory()
      .getRelativePathTo("src/types.ts");
    maybeAddImportToFile(sourceFile, typesPath, myInference);
  }

  const moduleSpecifier = isLibraryTypeImport(myInference);
  if (moduleSpecifier) {
    maybeAddImportToFile(sourceFile, moduleSpecifier, myInference);
  }

  console.log(paramName, myInference);
  node.setType(myInference);
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
        annotateParameter(sourceFile, descendant);
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
const annotateAllReducerReturnValues = annotateAllXReturnValues(
  [["./src/reducers/capture.ts", "MapOf<OrgCaptureState>"]],
  isReduxReducer,
);

await annotateAllReducerReturnValues();
