import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: [
            "dist/",
            "node_modules/",
            "src/grammar/*.js",
            "src/grammar/*.d.ts",
        ],
    },
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            indent: ["error", "tab"],
            "no-tabs": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },
    {
        files: ["tests/**/*.ts", "*.config.ts"],
        languageOptions: {
            parserOptions: {
                projectService: false,
            },
        },
        rules: {
            indent: ["error", "tab"],
            "no-tabs": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    }
);
