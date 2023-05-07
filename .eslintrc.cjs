const OFF = "off";
const WARN = "warn";
const ERROR = "error";

module.exports = {
    root: true,
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaFeatures: {
            jsx: true,
        },
        ecmaVersion: 12,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint", "simple-import-sort"],
    rules: {
        "linebreak-style": [ERROR, "unix"],
        "@typescript-eslint/explicit-module-boundary-types": OFF,
        "eol-last": WARN,
        "simple-import-sort/imports": [
            ERROR,
            {
                groups: [
                    ["^\\u0000.*(?<!\\.s?css)$"], // Side effect imports (but not css)
                    ["^\\w"], // node builtins and external packages
                    ["^(?!(\\.|@\\/))"], // anything that's not a relative import
                    ["^@\\/"], // absolute imports
                    ["^\\."], // relative imports
                    ["\\.s?css$"], // style imports
                ],
            },
        ],
        "simple-import-sort/exports": ERROR,
        "object-curly-spacing": [ERROR, "always"],
        "@typescript-eslint/member-delimiter-style": ERROR,
        "@typescript-eslint/no-unused-vars": [
            WARN,
            {
                args: "after-used",
            },
        ],
        "@typescript-eslint/no-non-null-assertion": OFF,
        "@typescript-eslint/no-namespace": OFF,
        "@typescript-eslint/no-explicit-any": OFF,
        "prefer-const": [
            ERROR,
            {
                destructuring: "all",
            },
        ],
        "@typescript-eslint/no-empty-interface": OFF,
        "@typescript-eslint/no-empty-function": OFF,
        "@typescript-eslint/naming-convention": [
            ERROR,
            {
                selector: "default",
                format: ["camelCase"],
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: "enumMember",
                format: ["PascalCase", "UPPER_CASE"],
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: "variable",
                format: null,
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: "parameter",
                format: ["camelCase", "PascalCase"],
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: ["typeAlias", "enum", "interface", "class", "typeParameter"],
                format: ["PascalCase"],
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: ["property", "typeProperty"],
                format: null,
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
        ],
        "no-inner-declarations": OFF,
        "@typescript-eslint/no-non-null-asserted-optional-chain": OFF,
        "no-constant-condition": OFF,
        "no-async-promise-executor": OFF,
    },
    overrides: [
        {
            files: [".*.js", "*.json"],
            rules: {
                "@typescript-eslint/naming-convention": OFF,
            },
        },
    ],
};
