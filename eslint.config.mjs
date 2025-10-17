import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// eslint-disable-next-line import/no-anonymous-default-export
export default [
  // 1) FLAT CONFIG IGNORES (this replaces .eslintignore)
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "coverage/**",
      ".out/**",
      ".vercel/**",
      ".turbo/**",
      // generated code
      "src/generated/**",
      "src/generated/prisma/**",
      "prisma/migrations/**",
      // any vendored/minified stuff
      "public/**/*.min.js",
    ],
  },

  // 2) Next’s recommended config + TS via compat
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 3) (Optional) if you *can’t* ignore a generated folder, neuter noisy rules there
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
