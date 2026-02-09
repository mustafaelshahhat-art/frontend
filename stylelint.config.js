module.exports = {
    extends: ["stylelint-config-standard-scss"],
    rules: {
        // 1️⃣ DESIGN SYSTEM INTEGRITY (Tokens Enforcement)

        // Disallow hex and named colors to force token usage
        "color-no-hex": [
            true,
            {
                "message": "يمنع استخدام الألوان الست عشرية (Hex). يرجى استخدام متغيرات التصميم var(--color-...) لضمان اتساق الهوية البصرية.",
                "ignore": ["url"]
            }
        ],
        "color-named": [
            "never",
            { "message": "يمنع استخدام أسماء الألوان الثابتة. يرجى استخدام متغيرات التصميم var(--color-...)." }
        ],

        // Disallow hardcoded pixels in spacing, fonts, and gaps (Force token scale)
        "declaration-property-unit-disallowed-list": {
            "margin": ["px"],
            "margin-top": ["px"],
            "margin-bottom": ["px"],
            "margin-left": ["px"],
            "margin-right": ["px"],
            "padding": ["px"],
            "padding-top": ["px"],
            "padding-bottom": ["px"],
            "padding-left": ["px"],
            "padding-right": ["px"],
            "font-size": ["px"],
            "gap": ["px"]
        },

        // Enforce variables for specific UI properties
        "declaration-property-value-disallowed-list": {
            "box-shadow": ["/^[^v]/"],
            "border-radius": ["/px$/"]
        },

        // 2️⃣ SCSS BEST PRACTICES

        // Warn on !important usage (allow in utility layers via override comment)
        "declaration-no-important": [true, { "severity": "warning" }],

        // Prevent deep nesting (Maintains maintainability)
        "max-nesting-depth": [3, {
            "ignore": ["blockless-at-rules", "pseudo-classes"],
            "message": "يمنع التداخل (nesting) لأكثر من 3 مستويات لضمان سهولة صيانة الكود."
        }],

        // Enforce BEM-compliant naming for classes
        "selector-class-pattern": [
            "^[a-z]([a-z0-9-]+)?(__[a-z0-9-]+)?(--[a-z0-9-]+)?$",
            {
                "message": "يجب اتباع منهجية BEM في تسمية الكلاسات (المكعب__العنصر--المعدل) وباستخدام kebab-case."
            }
        ],
        "keyframes-name-pattern": null, // Allow camelCase for keyframes
        "selector-pseudo-element-no-unknown": [
            true,
            {
                "ignorePseudoElements": ["ng-deep"]
            }
        ],

        // Prevent style leakage and enforce @use
        "no-descending-specificity": null, // Too many legacy violations
        "scss/at-rule-no-unknown": true,

        // Do NOT enforce cosmetic-only formatting rules to avoid unnecessary noise
    },

    // 3️⃣ EXCEPTIONS (Infrastructure & Design System Definitions)
    ignoreFiles: [
        "dist/**/*",
        "node_modules/**/*",
        "src/styles/_tokens.scss", // Variable definitions are allowed here
        "src/styles/_base.scss",   // Global resets are allowed here
        "src/styles/_theme.scss",
        "src/styles/_layout.scss"
    ]
};
