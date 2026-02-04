module.exports = {
    extends: ["stylelint-config-standard-scss"],
    rules: {
        // ENFORCE DESIGN TOKENS
        // Disallow hex colors (except in _tokens.scss itself, effectively)
        "color-no-hex": [
            true,
            {
                message: "Do not use hex colors. Use design tokens var(--color-...) instead.",
                ignore: ["url"], // Allow inside url() (e.g., SVG data URIs)
            },
        ],
        // Disallow named colors
        "color-named": [
            "never",
            {
                message: "Do not use named colors. Use design tokens var(--color-...) instead.",
            },
        ],
        // Disallow pixels for spacing (heuristic)
        "declaration-property-unit-disallowed-list": {
            "/^margin/": ["px"],
            "/^padding/": ["px"],
        },
        "selector-class-pattern": [
            "^[a-z][a-z0-9-]*$",
            {
                message: "Expected class selector to be kebab-case",
            },
        ],
    },
    ignoreFiles: ["dist/**/*", "node_modules/**/*", "src/styles/_tokens.scss"],
};
