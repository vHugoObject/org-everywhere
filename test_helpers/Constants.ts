import { repeat, partialRight, zipObject, pipe, add, concat } from "lodash/fp";
import {
  type Option,
  none as optionNone,
  some as optionSome,
} from "fp-ts/Option";
import { unfold } from "../src/util/transformers";
import { Map, Set as ImmutableSet, fromJS, List } from "immutable";

const TESTSTATICFILEPREFIX: string = "org-everywhere_internal_";
export const TESTFILEPATH: string = TESTSTATICFILEPREFIX + "fixtureTestFile.org";

export const TESTMAXSTARCOUNT: number = 15;
export const TESTUPPERALPHACHARACTERRANGE: [number, number] = [65, 90];
export const TESTLOWERALPHACHARACTERRANGE: [number, number] = [97, 122];
export const TESTNUMERICCHARACTERRANGE: [number, number] = [48, 57];
export const TESTNONSPACESCHARACTERRANGE: [number, number] = [33, 126];
export const TESTLOWERCASELETTERSRANGE: [number, number] = [97, 122];
export const TESTUPPERCASELETTERSRANGE: [number, number] = [65, 90];
export const DOUBLEBETWEENZEROAND1RANGE: [number, number] = [0.1, 0.99];

export const TESTSECONDSINAMINUTE: number = 60;
export const TESTSECONDSINANHOUR: number = 3600;
export const TESTSECONDSINADAY: number = 86400;
export const TESTMINHOURSDIFF: number = 2;
export const TESTMINDAYSDIFF: number = 2;

export const TESTORGCAPTURETEMPLATES: Array<string> = [
  "%t",
  "%T",
  "test",
  "%u",
  "%U",
  "test",
  "%r",
  "%R",
  "%y",
];

export const TESTORGCAPTURETEMPLATESWITHCURSOR = concat(
  TESTORGCAPTURETEMPLATES,
  ["%?"],
);

export const TESTORGCAPTURETEMPLATESWITHCURSORSET: Set<string> = new Set(
  TESTORGCAPTURETEMPLATESWITHCURSOR,
);

export const TESTMARKUPOPTIONS: Array<string> = ["*", "/", "_", "~", "+", ""];
export const TESTMARKUPTYPES: Array<string> = [
  "bold",
  "italic",
  "underline",
  "inline-code",
  "strikethrough",
  "none",
];

export const TESTENTRYTYPES: Array<string> = [
  "clock-entry",
  "log-repeat-entry",
  "log-done-note-entry",
  "rescheduled-entry",
  "redeadline-entry",
  "refile-entry",
];

export const TESTENTRYTYPESASSET = new Set(TESTENTRYTYPES);
export const TESTMARKUPOPTIONSMAPPING: Record<string, string> = zipObject(
  TESTMARKUPOPTIONS,
  TESTMARKUPTYPES,
);

export const INVERTEDTESTMARKUPOPTIONSMAPPING = zipObject(
  TESTMARKUPTYPES,
  TESTMARKUPOPTIONS,
);

export const TESTCHECKBOXOPTIONS: Array<[boolean, Option<string>]> = [
  [false, optionNone],
  [true, optionSome("-")],
  [true, optionSome("X")],
];

// #n = numeric-priority, a# = alphabetic priority, -1
export const TESTCHECKBOXSTYLEELEMENTS: Array<string> = [
  "/",
  "%",
  "n#",
  "a#",
  " ",
  "-",
  "X",
];
export const TESTCHECKBOXOPTIONSMAPPING: Record<string, string> = {
  "/": "fraction-cookie",
  "%": "percentage-cookie",
  "#": "priority-cookie",
  " ": "checkbox",
  "-": "checkbox",
  X: "checkbox",
};

export const TESTTODOSLINESTARTERS: Array<string> = [
  "#+TODO",
  "#+SEQ_TODO",
  "#+TYP_TODO",
];
export const TESTNUMERICPRIORITIESRANGE: [number, number] = [1, 64];
export const TESTPRIORITYOPTIONS: Array<string> = ["numeric", "alphabetic"];

export const TESTORGLINKTYPES: Array<string> = ["id", "file", "http", "https"];

export const TESTBULLETTYPES: Array<string> = ["-", "+", "*"];
export const TESTNUMERALSUFFIXES: Array<string> = [")", "."];
export const TESTTODOS: Array<string> = ["TODO", "DONE", "WAITING", "CANCELED"];
export const TESTDEFAULTODOSSEQUENCE: Array<string> = ["TODO", "DONE"];
export const TESTTODOSEQUENCES: Array<Array<string>> = [
  TESTDEFAULTODOSSEQUENCE,
  ["TODO", "FEEDBACK", "VERIFY", "|", "DONE", "DELEGATED"],
  ["TODO", "|", "DONE"],
  ["REPORT", "BUG", "KNOWNCAUSE", "|", "FIXED"],
  ["|", "CANCELED"],
  ["TODO(t)", "|", "DONE(d)"],
  ["REPORT(r)", "BUG(b)", "KNOWNCAUSE(k)", "|", "FIXED(f)"],
  ["|", "CANCELED(c)"],
  ["TODO", "FEEDBACK", "VERIFY", "|", "DONE", "CANCELED"],
  ["Fred", "Sara", "Lucy", "|", "DONE"],
];

export const TESTTODOSASSET: Set<string> = new Set(TESTTODOS);
export const TESTHEADINGS: Array<string> = unfold(
  pipe([add(1), partialRight(repeat, ["*"])]),
  12,
);

export const ACCEPTEDHEADINGSASSET: Set<string> = new Set(TESTHEADINGS);

export const TESTRANDOMMINUTESMAX: number = 59;
export const TESTRANDOMHOURSMAX: number = 23;
export const TESTRANDOMDAYSMAX: number = 51;
export const TESTRANDOMWEEKSMAX: number = 51;
export const TESTRANDOMMONTHSMAX: number = 11;
export const TESTRANDOMYEARSMAX: number = 10;

// ranges are inclusive
export const TESTRANDOMHOURSRANGE: [number, number] = [0, TESTRANDOMHOURSMAX];
export const TESTRANDOMMINUTESRANGE: [number, number] = [
  0,
  TESTRANDOMMINUTESMAX,
];
export const TESTRANDOMDAYRANGE: [number, number] = [0, TESTRANDOMDAYSMAX];
export const TESTRANDOMWEEKRANGE: [number, number] = [0, TESTRANDOMWEEKSMAX];
export const TESTRANDOMMONTHRANGE: [number, number] = [0, TESTRANDOMMONTHSMAX];
export const TESTRANDOMYEARRANGE: [number, number] = [2000, 3000];

export const ORGTIMESTAMPFORMATWITHOUTSTARTTIME: string = "yyyy-MM-dd EEE"; // '2025-06-16 Mon'
export const ORGTIMESTAMPFORMATWITHSTARTTIME: string = "yyyy-MM-dd EEE HH:mm"; // '2025-06-16 Mon 02:03'

export const TESTORGDURATIONUNITSWITHOUTHOURS: Array<string> = [
  "d",
  "w",
  "m",
  "y",
];
export const TESTORGDURATIONUNITS: Array<string> = ["h", "d", "w", "m", "y"];

export const TESTORGDURATIONUNITSSET: Set<string> = new Set([
  "h",
  "d",
  "w",
  "m",
  "y",
]);

export const TESTREPEATERTYPES: Array<string> = ["++", ".+", "+"];
export const TESTREPEATERTYPESSET: Set<string> = new Set(TESTREPEATERTYPES);

export const TESTREPEATERUNITS: Array<string> = ["h", "d", "w", "m", "y"];
export const TESTREPEATERUNITSWITHOUTHOURS: Array<string> = [
  "d",
  "w",
  "m",
  "y",
];
export const TESTREPEATERUNITSSET: Set<string> = new Set(TESTREPEATERUNITS);

export const TESTDEADLINEUNITS: Array<string> = TESTREPEATERUNITS;
export const TESTDEADLINEUNITSSET: Set<string> = TESTREPEATERUNITSSET;

export const TESTDELAYTYPES: Array<string> = ["-", "--"];
export const TESTDELAYTYPESSET: Set<string> = new Set(TESTDELAYTYPES);

export const TESTDELAYUNITS: Array<string> = TESTREPEATERUNITS;
export const TESTDELAYUNITSSET: Set<string> = TESTREPEATERUNITSSET;

export const TESTPLANNINGITEMTYPES: Array<string> = [
  "DEADLINE",
  "SCHEDULED",
  "CLOSED",
];

export const TESTTIMESTAMPFORMATS: Array<string> = [
  ORGTIMESTAMPFORMATWITHOUTSTARTTIME,
  ORGTIMESTAMPFORMATWITHSTARTTIME,
];

export const TESTTIMESTAMPBRACKETS: Array<[string, string]> = [
  ["[", "]"],
  ["<", ">"],
];

export const TESTTIMESTAMPBRACKETSMAPPING: Record<string, [string, string]> = {
  true: ["<", ">"],
  false: ["[", "]"],
};

export const TESTORGTIMESTAMPOBJECTISACTIVE = [true, false];
export const TESTORGTIMESTAMPOBJECTWITHSTARTTIME = [true, false];
export const TESTORGTIMESTAMPOBJECTWITHENDHOUR = [true, false];

export const TESTINBUFFERSETTINGS: Array<string> = [
  "#+ARCHIVE",
  "#+CATEGORY",
  "#+COLUMNS",
  "#+CONSTANTS",
  "#+FILETAGS",
  "#+LINK",
  "#+PRIORITIES",
  "#+PROPERTY",
  "#+SETUPFILE",
  "#+STARTUP",
  "#+TAGS",
  "#+TODO",
  "#+SEQ_TODO",
  "#+TYP_TODO",
];

export const TESTHEADLINEKEYS: Array<string> = [
  "headlineValue",
  "headlineLevel",
  "todo",
  "tags",
  "priority",
  "statisticsCookie",
  "planningItem",
  "logbook",
  "headlineProperties",
];

export const TESTINBUFFERSETTINGSOBJECT: Record<string, Array<string>> = {
  archiveLocation: ["#+ARCHIVE"],
  category: ["#+CATEGORY"],
  columnsViewSettings: ["#+COLUMNS"],
  fileConstants: ["#+CONSTANTS"],
  fileTags: ["#+FILETAGS"],
  linkAbbreviations: ["#+LINK"],
  filePrioritySettings: ["#+PRIORITIES"],
  fileProperties: ["#+PROPERTY"],
  setupFile: ["#+SETUPFILE"],
  startupSetting: ["#+STARTUP"],
  validTags: ["#+TAGS"],
  todoKeywords: ["#+TODO", "#+TYP_TODO", "#+SEQ_TODO"],
};

export const TESTSTARTUPSETTINGS: Array<string> = [
  "overview",
  "content",
  "showall",
  "show2levels",
  "show3levels",
  "show4levels",
  "show5levels",
  "showeverything",
  "indent",
  "noindent",
  "align",
  "noalign",
  "inlineimages",
  "noinlineimages",
  "descriptivelinks",
  "literallinks",
  "logdone",
  "lognotedone",
  "nologdone",
  "logrepeat",
  "lognoterepeat",
  "nologrepeat",
  "lognoteclock-out",
  "nolognoteclock-out",
  "logreschedule",
  "lognotereschedule",
  "nologreschedule",
  "logredeadline",
  "lognoteredeadline",
  "nologredeadline",
  "logrefile",
  "lognoterefile",
  "nologrefile",
  "hidestars",
  "showstars",
  "indent",
  "noindent",
  "odd",
  "oddeven",
  "customtime",
  "fninline",
  "fnnoinline",
  "fnlocal",
  "fnprompt",
  "fnauto",
  "fnconfirm",
  "fnadjust",
  "nofnadjust",
  "fnanon",
  "hideblocks",
  "nohideblocks",
  "hidedrawers",
  "nohidedrawers",
];

export const TESTPUNCTUATION: Array<string> = [
  ":",
  ";",
  ",",
  "?",
  "!",
  "&",
  "/",
  "\\",
  "%",
  ")",
  "(",
  "$",
  "#",
];

export const TESTFILEEXTENSIONS: Array<string> = [
  "ada",
  "adb",
  "ads",
  "applescript",
  "as",
  "asc",
  "ascii",
  "ascx",
  "asm",
  "asmx",
  "asp",
  "aspx",
  "atom",
  "au3",
  "awk",
  "bas",
  "bash",
  "bashrc",
  "bat",
  "bbcolors",
  "bcp",
  "bdsgroup",
  "bdsproj",
  "bib",
  "bowerrc",
  "c",
  "cbl",
  "cc",
  "cfc",
  "cfg",
  "cfm",
  "cfml",
  "cgi",
  "cjs",
  "clj",
  "cljs",
  "cls",
  "cmake",
  "cmd",
  "cnf",
  "cob",
  "code-snippets",
  "coffee",
  "coffeekup",
  "conf",
  "cp",
  "cpp",
  "cpt",
  "cpy",
  "crt",
  "cs",
  "csh",
  "cson",
  "csproj",
  "csr",
  "css",
  "csslintrc",
  "csv",
  "ctl",
  "cts",
  "curlrc",
  "cxx",
  "d",
  "dart",
  "dfm",
  "diff",
  "dof",
  "dpk",
  "dpr",
  "dproj",
  "dtd",
  "eco",
  "editorconfig",
  "ejs",
  "el",
  "elm",
  "emacs",
  "eml",
  "ent",
  "erb",
  "erl",
  "eslintignore",
  "eslintrc",
  "ex",
  "exs",
  "f",
  "f03",
  "f77",
  "f90",
  "f95",
  "fish",
  "for",
  "fpp",
  "frm",
  "fs",
  "fsproj",
  "fsx",
  "ftn",
  "gemrc",
  "gemspec",
  "gitattributes",
  "gitconfig",
  "gitignore",
  "gitkeep",
  "gitmodules",
  "go",
  "gpp",
  "gradle",
  "graphql",
  "groovy",
  "groupproj",
  "grunit",
  "gtmpl",
  "gvimrc",
  "h",
  "haml",
  "hbs",
  "hgignore",
  "hh",
  "hpp",
  "hrl",
  "hs",
  "hta",
  "htaccess",
  "htc",
  "htm",
  "html",
  "htpasswd",
  "hxx",
  "iced",
  "iml",
  "inc",
  "inf",
  "info",
  "ini",
  "ino",
  "int",
  "irbrc",
  "itcl",
  "itermcolors",
  "itk",
  "jade",
  "java",
  "jhtm",
  "jhtml",
  "js",
  "jscsrc",
  "jshintignore",
  "jshintrc",
  "json",
  "json5",
  "jsonld",
  "jsp",
  "jspx",
  "jsx",
  "ksh",
  "less",
  "lhs",
  "lisp",
  "log",
  "ls",
  "lsp",
  "lua",
  "m",
  "m4",
  "mak",
  "map",
  "markdown",
  "master",
  "md",
  "mdown",
  "mdwn",
  "mdx",
  "metadata",
  "mht",
  "mhtml",
  "mjs",
  "mk",
  "mkd",
  "mkdn",
  "mkdown",
  "ml",
  "mli",
  "mm",
  "mts",
  "mxml",
  "nfm",
  "nfo",
  "noon",
  "npmignore",
  "npmrc",
  "nuspec",
  "nvmrc",
  "ops",
  "pas",
  "pasm",
  "patch",
  "pbxproj",
  "pch",
  "pem",
  "pg",
  "php",
  "php3",
  "php4",
  "php5",
  "phpt",
  "phtml",
  "pir",
  "pl",
  "pm",
  "pmc",
  "pod",
  "pot",
  "prettierrc",
  "properties",
  "PROPS",
  "PT",
  "PUG",
  "PURS",
  "PY",
  "PYX",
  "R",
  "RAKE",
  "RB",
  "RBW",
  "RC",
  "RDOC",
  "RDOC_OPTIONS",
  "RESX",
  "REXX",
  "RHTML",
  "RJS",
  "RLIB",
  "RON",
  "RS",
  "RSS",
  "RST",
  "RTF",
  "RVMRC",
  "RXML",
  "S",
  "SASS",
  "SCALA",
  "SCM",
  "SCSS",
  "SEESTYLE",
  "SH",
  "SHTML",
  "SLN",
  "SLS",
  "SPEC",
  "SQL",
  "SQLITE",
  "SQLPROJ",
  "SRT",
  "SS",
  "SSS",
  "ST",
  "STRINGS",
  "sty",
  "styl",
  "stylus",
  "sub",
  "sublime-build",
  "sublime-commands",
  "sublime-completions",
  "sublime-keymap",
  "sublime-macro",
  "sublime-menu",
  "sublime-project",
  "sublime-settings",
  "sublime-workspace",
  "sv",
  "svc",
  "svg",
  "swift",
  "t",
  "tcl",
  "tcsh",
  "terminal",
  "tex",
  "text",
  "textile",
  "tg",
  "tk",
  "tmLanguage",
  "tmpl",
  "tmTheme",
  "tpl",
  "ts",
  "tsv",
  "tsx",
  "tt",
  "tt2",
  "ttml",
  "twig",
  "txt",
  "v",
  "vb",
  "vbproj",
  "vbs",
  "vcproj",
  "vcxproj",
  "vh",
  "vhd",
  "vhdl",
  "vim",
  "viminfo",
  "vimrc",
  "vm",
  "vue",
  "webapp",
  "webmanifest",
  "wsc",
  "x-php",
  "xaml",
  "xht",
  "xhtml",
  "xml",
  "xs",
  "xsd",
  "xsl",
  "xslt",
  "y",
  "yaml",
  "yml",
  "zsh",
  "zshrc",
];

export const TESTSLASHES = ["\\", "/"];

export const REGULARTIMESTAMPTESTCASES = [
  {
    isActive: true,
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
    withDeadline: true,
    withDelay: true,
  },
  {
    isActive: true,
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
    withDeadline: true,
  },
  {
    isActive: true,
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
    withDelay: true,
  },
  {
    isActive: true,
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
  },
  {
    isActive: true,
    withStartTime: true,
    withEndTime: true,
    withDelay: true,
  },
  { isActive: true, withStartTime: true, withEndTime: true },
  {
    isActive: true,
    withStartTime: true,
    withRepeater: true,
    withDeadline: true,
    withDelay: true,
  },
  {
    isActive: true,
    withStartTime: true,
    withRepeater: true,
    withDeadline: true,
  },
  {
    isActive: true,
    withStartTime: true,
    withRepeater: true,
    withDelay: true,
  },
  { isActive: true, withStartTime: true, withRepeater: true },
  { isActive: true, withStartTime: true, withDelay: true },
  { isActive: true, withStartTime: true },
  {
    isActive: true,
    withRepeater: true,
    withDeadline: true,
    withDelay: true,
  },
  { isActive: true, withRepeater: true, withDeadline: true },
  { isActive: true, withRepeater: true, withDelay: true },
  { isActive: true, withRepeater: true },
  { isActive: true, withDelay: true },
  {
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
    withDeadline: true,
    withDelay: true,
  },
  {
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
    withDeadline: true,
  },
  {
    withStartTime: true,
    withEndTime: true,
    withRepeater: true,
    withDelay: true,
  },
  { withStartTime: true, withEndTime: true, withRepeater: true },
  { withStartTime: true, withEndTime: true, withDelay: true },
  { withStartTime: true, withEndTime: true },
  {
    withStartTime: true,
    withRepeater: true,
    withDeadline: true,
    withDelay: true,
  },
  { withStartTime: true, withRepeater: true, withDeadline: true },
  { withStartTime: true, withRepeater: true, withDelay: true },
  { withStartTime: true, withRepeater: true },
  { withStartTime: true, withDelay: true },
  { withRepeater: true, withDeadline: true, withDelay: true },
  { withRepeater: true, withDeadline: true },
  { withRepeater: true, withDelay: true },
];

export const TIMESTAMPSWITHREPEATERTESTCASES = [
  { repeaterType: "+", withStartTime: true, withDeadline: true },
  { repeaterType: "+", withStartTime: true, withDeadline: false },
  { repeaterType: "+", withStartTime: false, withDeadline: false },
  { repeaterType: "++", withStartTime: true, withDeadline: true },
  { repeaterType: "++", withStartTime: true, withDeadline: false },
  { repeaterType: "++", withStartTime: false, withDeadline: false },
  { repeaterType: ".+", withStartTime: true, withDeadline: true },
  { repeaterType: ".+", withStartTime: true, withDeadline: false },
  { repeaterType: ".+", withStartTime: false, withDeadline: false },
];


export const TESTBASESTATE = {
  org: {
    past: [],
    present: Map({
      files: Map(),
      fileSettings: [],
      search: Map({
        searchFilter: "",
        searchFilterExpr: [],
      }),
      bookmarks: Map({
        search: List(),
        "task-list": List(),
        refile: List(),
      }),
    }),
    future: [],
  },
  syncBackend: Map({
    isAuthenticated: true,
  }),
  capture: Map({ captureTemplates: [] }),
  base: fromJS({
    customKeybindings: {},
    shouldTapTodoToAdvance: true,
    isLoading: ImmutableSet(),
    finderTab: "Search",
    agendaTimeframe: "Week",
    preferEditRawValues: false,
  }),
};
