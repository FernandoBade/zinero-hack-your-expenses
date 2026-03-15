import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new globalThis.URL(".", import.meta.url));

const userVisibleAttributeNames = [
    "label",
    "placeholder",
    "title",
    "alt",
    "caption",
    "text",
    "message",
    "description",
    "helperText",
    "hint",
    "emptyText",
    "errorText",
    "successText",
    "subtitle",
    "headline",
    "aria-label",
    "aria-description",
    "aria-placeholder",
    "aria-roledescription",
    "aria-valuetext",
];

const userVisibleAttributeSelector = userVisibleAttributeNames.join("|");

export default [
    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ["src/**/*.{ts,tsx}", "frontend/src/**/*.{ts,tsx}"],
        languageOptions: {
            parserOptions: {
                project: ["./tsconfig.app.json"],
                tsconfigRootDir: __dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "error",
            "no-restricted-properties": [
                "error",
                {
                    object: "window",
                    property: "location",
                    message:
                        "Do not use window.location. Use routes/navigation.ts instead.",
                },
            ],
        },
    },

    {
        files: ["src/services/**/*.{ts,tsx}"],
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "MemberExpression[object.name='Intl']",
                    message:
                        "Do not use Intl directly in pages/services. Use src/utils/intl instead.",
                },
                {
                    selector: "CallExpression[callee.property.name='toLocaleString']",
                    message:
                        "Do not use toLocaleString directly in pages/services. Use src/utils/intl instead.",
                },
                {
                    selector: "CallExpression[callee.property.name='toLocaleDateString']",
                    message:
                        "Do not use toLocaleDateString directly in pages/services. Use src/utils/intl instead.",
                },
                {
                    selector: "CallExpression[callee.property.name='toLocaleTimeString']",
                    message:
                        "Do not use toLocaleTimeString directly in pages/services. Use src/utils/intl instead.",
                },
            ],
        },
    },

    {
        files: ["src/pages/**/*.tsx", "src/components/**/*.tsx"],
        rules: {
            "no-restricted-syntax": [
                "error",
                {
                    selector: "JSXText[value=/\\S+/]",
                    message: "Do not hardcode user-visible UI text. Use i18n keys and translate().",
                },
                {
                    selector: `JSXElement > JSXExpressionContainer > Literal[raw=/^["']/][value=/\\S+/]`,
                    message: "Do not hardcode user-visible UI text in JSX expressions. Use i18n keys.",
                },
                {
                    selector: "JSXElement > JSXExpressionContainer > TemplateLiteral[expressions.length=0]",
                    message: "Do not hardcode user-visible UI text in template literals. Use i18n keys.",
                },
                {
                    selector: `JSXElement > JSXExpressionContainer > ConditionalExpression > Literal[raw=/^["']/][value=/\\S+/]`,
                    message: "Do not hardcode conditional UI text in JSX expressions. Use i18n keys.",
                },
                {
                    selector: "JSXElement > JSXExpressionContainer > ConditionalExpression > TemplateLiteral[expressions.length=0]",
                    message: "Do not hardcode conditional UI template text in JSX expressions. Use i18n keys.",
                },
                {
                    selector:
                        `JSXAttribute[name.name=/^(${userVisibleAttributeSelector})$/][value.type='Literal'][value.value=/\\S+/]`,
                    message: "Do not hardcode user-visible attribute text. Use i18n keys.",
                },
                {
                    selector:
                        `JSXAttribute[name.name=/^(${userVisibleAttributeSelector})$/] > JSXExpressionContainer > Literal[raw=/^["']/][value=/\\S+/]`,
                    message: "Do not hardcode user-visible attribute text in JSX expressions. Use i18n keys.",
                },
                {
                    selector:
                        `JSXAttribute[name.name=/^(${userVisibleAttributeSelector})$/] > JSXExpressionContainer > TemplateLiteral[expressions.length=0]`,
                    message: "Do not hardcode user-visible attribute template text. Use i18n keys.",
                },
                {
                    selector:
                        `JSXAttribute[name.name=/^(${userVisibleAttributeSelector})$/] > JSXExpressionContainer > ConditionalExpression > Literal[raw=/^["']/][value=/\\S+/]`,
                    message: "Do not hardcode conditional user-visible attribute text in JSX expressions. Use i18n keys.",
                },
                {
                    selector:
                        `JSXAttribute[name.name=/^(${userVisibleAttributeSelector})$/] > JSXExpressionContainer > ConditionalExpression > TemplateLiteral[expressions.length=0]`,
                    message: "Do not hardcode conditional user-visible attribute template text. Use i18n keys.",
                },
            ],
        },
    },

    {
        files: [
            "*.config.{js,cjs,mjs}",
            "tailwind.config.cjs",
            "frontend/*.config.{js,cjs,mjs}",
            "frontend/tailwind.config.cjs",
        ],
        languageOptions: {
            globals: {
                module: "readonly",
                require: "readonly",
                process: "readonly",
            },
        },
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },

    {
        ignores: ["**/dist/**", "**/node_modules/**"],
    },
];