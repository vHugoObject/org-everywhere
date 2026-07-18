import {
  pipe,
  filter,
  map,
  forEach,
  isEmpty,
  negate,
  overSome,
  endsWith,
  isUndefined,
  first,
  reduce,
  cond,
  concat,
  isString,
  merge,
  over,
  takeWhile,
} from "lodash/fp";
import {
  Project,
  SyntaxKind,
  SourceFile,
  Node,
  ImportDeclaration,
  CallExpression,
  PropertyAccessExpression,
  Identifier,
  Structure,
  Structures,
  forEachStructureChild,
  SourceFileStructure,
  ImportDeclarationStructure,
  ImportSpecifierStructure,
  WriterFunction,
  OptionalKind,
  VariableStatementStructure,
} from "ts-morph";

// initialize

const OBJECTSTOREPLACE: Record<string, [string, string]> = Object.fromEntries([
  ["Map", ["{}", "builtin"]],
  ["List", ["[]", "builtin"]],
  ["Set", ["new Set", "builtin"]],
]);

const METHODSTOREPLACE: Record<string, [string, string]> = Object.fromEntries([
  ["getIn", ["property", "lodash"]],
  ["get", ["property", "lodash"]],
  ["set", ["set", "lodash"]],
  ["setIn", ["update", "lodash"]],
  ["update", ["update", "lodash"]],
  ["updateIn", ["update", "lodash"]],
  ["map", ["map", "lodash"]],
  ["has", ["includes", "lodash"]],
  ["merge", ["merge", "lodash"]],
  ["filter", ["filter", "lodash"]],
  ["forEach", ["forEach", "lodash"]],
  ["includes", ["includes", "lodash"]],
  ["trim", ["trim", "lodash"]],
  ["findIndex", ["findIndex", "lodash"]],
  ["split", ["split", "lodash"]],
  ["trimLeft", ["trimEnd", "lodash"]],
  ["join", ["join", "lodash"]],
  ["flatMap", ["flatMap", "lodash"]],
  ["reduce", ["reduce", "lodash"]],
  ["reverse", ["reverse", "lodash"]],
  ["flatten", ["flatten", "lodash"]],
  ["find", ["find", "lodash"]],
  ["take", ["take", "lodash"]],
  ["takeLast", ["takeLast", "lodash"]],
  ["some", ["some", "lodash"]],
  ["sort", ["sort", "utilities"]],
  ["every", ["every", "lodash"]],
  ["zip", ["zip", "lodash"]],
  ["repeat", ["repeat", "lodash"]],
  ["trimRight", ["trimEnd", "lodash"]],
  ["rest", ["tail", "lodash"]],
  ["pop", ["pop", "utilities"]],
  ["first", ["first", "lodash"]],
  ["fromKeys", ["setFromKeys", "utilities"]],
  ["slice", ["genericSlice", "utilities"]],
  ["concat", ["genericConcat", "utilities"]],
  ["keySeq", ["Object.keys", "builtin"]],
  ["entrySeq", ["Object.entries", "builtin"]],
  ["unShift", ["prepend", "utilities"]],
  ["delete", ["splice", "utilities"]],
  ["deleteIn", ["splice", "utilities"]],
  ["remove", ["splice", "utilities"]],
  ["insert", ["insert", "utilities"]],
  ["toSet", ["uniq", "utilities"]],
  ["keys", ["Object.keys", "builtin"]],
  ["values", ["Object.values", "builtin"]],
  ["isEmpty", ["isEmpty", "lodash"]],
  ["count", ["size", "lodash"]],
  ["fromJS", ["", ""]],
  ["toJS", ["", ""]],
  ["toArray", ["", ""]],
  ["toList", ["", ""]],
]);

const OBJECTSANDMETHODSTOREPLACE = merge(OBJECTSTOREPLACE, METHODSTOREPLACE);

const addImportsToFile = (
  sourceFile: SourceFile,
  moduleSpecifier: string,
  imports: Array<[string, string]>,
): void => {
  const structure: ImportDeclarationStructure = {
    kind: 16,
    namedImports: map<[string, string], string>(first)(imports),
    moduleSpecifier,
  };
  // add lodash imports
  sourceFile.addImportDeclaration(structure);
};

const addImports = (
  sourceFile: SourceFile,
  importDeclaration: ImportDeclaration,
  objectsAndMethodsToReplace = OBJECTSANDMETHODSTOREPLACE,
): void => {
  const reducer = (
    prev: Array<[string, string]>,
    curr: OptionalKind<ImportSpecifierStructure> | string | WriterFunction,
  ): Array<[string, string]> => {
    const replacemementNameAndImport: false | [string, string] =
      (Structure.isImportSpecifier(curr) &&
        objectsAndMethodsToReplace[curr.name]) ||
      (isString(curr) && objectsAndMethodsToReplace[curr]);
    if (replacemementNameAndImport) {
      return concat(prev, [replacemementNameAndImport]);
    }
    return prev;
  };

  const namedImports = importDeclaration.getStructure().namedImports;
  if (!(namedImports && namedImports.length > 0)) {
    return;
  }
  const [lodashImports, utilitiesImports] = pipe([
    reduce(reducer, []),
    over([
      filter(([, module]: [string, string]) => module == "lodash"),
      filter(([, module]: [string, string]) => module == "utilities"),
    ]),
  ])(namedImports);

  // add lodash
  lodashImports && addImportsToFile(sourceFile, "lodash", lodashImports);
  // add utilities
  if (utilitiesImports) {
    const utilitiesPath: string = sourceFile
      .getDirectory()
      .getRelativePathTo("src/util/transformers.ts");
    addImportsToFile(sourceFile, utilitiesPath, utilitiesImports);
  }
};

const replaceImmutableObjects = (
  expression: CallExpression,
  objectsToReplace = OBJECTSTOREPLACE,
): void => {
  const identifier = node.getFirstChildIfKind(SyntaxKind.Identifier);

  if (
    !(
      identifier &&
      objectsAndMethodsToReplace.hasOwnProperty(identifier.getText())
    )
  ) {
    return importsToAdd;
  }
};

const replaceImmutableMethods = (
  method: PropertyAccessExpression,
  methodsToReplace = METHODSTOREPLACE,
): void => {
  const identifier = node.getFirstChildIfKind(SyntaxKind.Identifier);

  if (
    !(
      identifier &&
      objectsAndMethodsToReplace.hasOwnProperty(identifier.getText())
    )
  ) {
    return importsToAdd;
  }
};

const replaceImmutableMethodOrObject = (
  node: Node,
  importsToAdd: Array<[string, string]>,
  objectsAndMethodsToReplace = OBJECTSANDMETHODSTOREPLACE,
): Array<[string, string]> => {
  node.forEachChild((childNode: Node) => {
    importsToAdd = replaceImmutableMethodOrObject(childNode, importsToAdd);
  });

  if (!(Node.isCallExpression(node) || Node.isPropertyAccessExpression(node))) {
    return importsToAdd;
  }

  if (Node.isCallExpression(node)) {
    replaceImmutableObjects(node);
  }

  if (Node.isPropertyAccessExpression(node)) {
    replaceImmutableMethods(node);
  }

  return importsToAdd;
};

const runImmutableRefactor = async (): Promise<void> => {
  const project = new Project({});
  project.addSourceFilesAtPaths("src/**/*");

  forEach((sourceFile: SourceFile): void => {
    //overSome([endsWith("ts"), endsWith("tsx")])
    if (sourceFile.getBaseName() !== "App.tsx") return;
    let importsToAdd: Array<[string, string]> = [];
    sourceFile.forEachChild((node: Node) => {
      importsToAdd = replaceImmutableMethodOrObject(node, importsToAdd);
    });
    const imports = sourceFile.getChildrenOfKind(SyntaxKind.ImportDeclaration);
    takeWhile((node: ImportDeclaration) => {
      if (node.getModuleSpecifier().getLiteralValue() == "immutable") {
        sourceFile.removeStatement(node.getChildIndex());
        return false;
      }
      return true;
    })(imports);
  })(project.getSourceFiles());

  await project.save();
};

//await runImmutableRefactor();

const combineTwoFiles = async (
  file1Path: string,
  file2Path: string,
): Promise<void> => {
  const project = new Project({});
  const file1: SourceFile = project.addSourceFileAtPath(file1Path);
  const file2: SourceFile = project.addSourceFileAtPath(file2Path);

  file2.forEachChild((child: Node): void => {
    if (!Node.isVariableStatement(child)) return;
    const childDeclaration = child.getFirstDescendantByKind(
      SyntaxKind.VariableDeclaration,
    );
    if (
      !childDeclaration ||
      !file1.getVariableDeclaration(childDeclaration.getName())
    )
      file1.addVariableStatement(child.getStructure());
  });

  file1.fixMissingImports();
  await file2.deleteImmediately();
  await project.save();
};

await combineTwoFiles("test_helpers/Asserters.ts", "test_helpers/asserters.ts");
