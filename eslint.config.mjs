// eslint.config.mjs
import next from "eslint-config-next";

const config = [
  // 1) Flat ignores (replaces .eslintignore)
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".out/**",
      ".vercel/**",
      ".turbo/**",
      "src/generated/**",
      "src/generated/prisma/**",
      "prisma/migrations/**",
      "public/**/*.min.js",
    ],
  },

  // 2) Next.js flat config (includes TS + core-web-vitals rules)
  ...next,

  // 3) Optional: relax rules for generated folders
  {
    files: ["src/generated/**/*", "src/generated/prisma/**/*"],
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default config;
