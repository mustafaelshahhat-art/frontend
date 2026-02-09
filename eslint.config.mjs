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
            // 1️⃣ COMPONENT & DIRECTIVE STANDARDS
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
            "@angular-eslint/no-empty-lifecycle-method": "error",

            // 2️⃣ ARCHITECTURE & SAFETY (Custom Arabic Error Messages)
            "no-console": ["warn", { allow: ["warn", "error"] }],
            "@typescript-eslint/no-explicit-any": "error",
            "no-restricted-syntax": [
                "error",
                {
                    "selector": "TSAnyKeyword",
                    "message": "يمنع استخدام النوع 'any'. يرجى استخدام أنواع محددة أو 'unknown' لضمان سلامة الكود."
                },
                {
                    "selector": "CallExpression[callee.name=/^(setTimeout|setInterval)$/]",
                    "message": "يمنع استخدام الموقتات اليدوية (setTimeout/setInterval). يرجى استخدام RxJS (timer, interval) أو Signals."
                },
                {
                    "selector": "MemberExpression[object.name=/(localStorage|sessionStorage)/]",
                    "message": "يمنع الوصول المباشر إلى localStorage/sessionStorage خارج AuthService. يرجى استخدام الخدمات المخصصة لإدارة حالة النظام."
                },
                {
                    "selector": "MemberExpression[object.name='window']",
                    "message": "يمنع الوصول المباشر إلى window. يرجى استخدام الخدمات المخصصة أو inject(DOCUMENT) لضمان قابلية الاختبار."
                },
                {
                    "selector": "MethodDefinition[kind='constructor'] CallExpression[callee.property.name='subscribe']",
                    "message": "يمنع تنفيذ عمليات جانبية (مثل subscribe) داخل المشيد (constructor). يرجى استخدام ngOnInit بدلاً من ذلك."
                },
                {
                    "selector": "NewExpression[callee.name='HubConnectionBuilder']",
                    "message": "يمنع استخدام SignalR مباشرة خارج الخدمات المخصصة في core/services/signalr.service.ts."
                }
            ],

            // Restrict HttpClient usage to services only
            "no-restricted-imports": [
                "error",
                {
                    "paths": [{
                        "name": "@angular/common/http",
                        "importNames": ["HttpClient"],
                        "message": "يمنع استخدام HttpClient مباشرة خارج خدمات الـ API في core/services."
                    }]
                }
            ],

            // 3️⃣ CORRECTNESS & MAINTAINABILITY
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", {
                "args": "all",
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "ignoreRestSiblings": true
            }],
            "no-unsafe-optional-chaining": "error",
            "no-empty-function": "off",
            "@typescript-eslint/no-empty-function": ["warn", { "allow": ["constructors"] }]
        },
    },

    // INFRASTRUCTURE OVERRIDES (Allowed to access low-level APIs)
    {
        files: [
            "src/app/core/services/auth.service.ts",
            "src/app/core/services/signalr.service.ts"
        ],
        rules: {
            "no-restricted-syntax": "off"
        }
    },

    // API SERVICES OVERRIDES (Allowed to use HttpClient)
    {
        files: ["src/app/core/services/**/*.ts"],
        rules: {
            "no-restricted-imports": "off"
        }
    },

    // LAYOUTS OVERRIDES (Allowed to monitor window for responsive design)
    {
        files: ["src/app/layouts/**/*.ts"],
        rules: {
            "no-restricted-syntax": [
                "error",
                { "selector": "TSAnyKeyword", "message": "يمنع استخدام النوع 'any'." }
            ]
        }
    },

    // HTML TEMPLATE RULES
    {
        files: ["**/*.html"],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
        ],
        rules: {
            "@angular-eslint/template/no-inline-styles": "error",
            "@angular-eslint/template/prefer-self-closing-tags": "error",
            "@angular-eslint/template/no-any": "error",
            "@angular-eslint/template/prefer-control-flow": "error"
        },
    }
);
