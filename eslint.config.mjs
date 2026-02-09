import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import angular from "angular-eslint";

export default tseslint.config(
    {
        files: ["**/*.ts"],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
            ...angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            "@angular-eslint/component-selector": [
                "error",
                {
                    type: "element",
                    prefix: "app",
                    style: "kebab-case",
                },
            ],
            "@angular-eslint/directive-selector": [
                "error",
                {
                    type: "attribute",
                    prefix: "app",
                    style: "camelCase",
                },
            ],
            "@angular-eslint/prefer-on-push-component-change-detection": "error",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "@typescript-eslint/no-explicit-any": "error",
            "no-restricted-syntax": [
                "error",
                {
                    "selector": "TSAnyKeyword",
                    "message": "يمنع استخدام النوع 'any'. يرجى استخدام أنواع محددة أو 'unknown' لضمان سلامة الكود."
                },
                {
                    "selector": "CallExpression[callee.name='setTimeout']",
                    "message": "يمنع استخدام setTimeout للتوقيت. يرجى استخدام RxJS operators أو queueMicrotask لضمان التزامن الصحيح."
                },
                {
                    "selector": "MemberExpression[object.name='localStorage']",
                    "message": "يمنع الوصول المباشر إلى localStorage خارج AuthService. يرجى استخدام الخدمات المخصصة لإدارة حالة النظام."
                }
            ]
        },
    },
    {
        files: ["**/*.html"],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
        rules: {
            "@angular-eslint/template/no-inline-styles": "error",
        },
    },
    {
        files: ["src/app/core/services/auth.service.ts"],
        rules: {
            "no-restricted-syntax": "off",
        },
    }
);
