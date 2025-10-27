export const IGNORED_DIRS = new Set([
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  "coverage",
  "public",
  "tmp",
  "temp",
  "cache",
  ".cache",
  ".vite",
  "logs",
  "log",
  "artifacts",
  "target",
  ".turbo",
  "node_modules",
  "vendor",
  "Pods",
  "__tests__",
  "__mocks__",
  "__snapshots__",
  "test",
  "tests",
  "spec",
  "assets",
  "images",
  "img",
  "fonts",
  "icons",
  "static",
  ".github",
  ".gitlab",
  ".circleci",
  ".vscode",
  ".idea",
  ".devcontainer",
  ".husky",
  "docker",
  ".azure-pipelines",
  ".github/workflows",
]);

export const IGNORED_FILES_EXACT = new Set([
  ".DS_Store",
  "Thumbs.db",
  ".env.local",
  ".env.production",
  ".env.development",
  ".env.test",
  ".env.example",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "bun.lockb",
  "Dockerfile",
  "docker-compose.yml",
  // config files…
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".prettierignore",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintignore",
  "tsconfig.node.json",
  "vite.config.ts",
  "vitest.config.ts",
  "jest.config.js",
  "jest.config.ts",
  "babel.config.js",
  "babel.config.cjs",
  "webpack.config.js",
  "rollup.config.js",
  "snowpack.config.js",
  "postcss.config.js",
  "tailwind.config.js",
  "next.config.js",
  "remix.config.js",
  "svelte.config.js",
  "angular.json",
  "vue.config.js",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.build.json",
  "tsconfig.spec.json",
]);

export const IGNORED_GLOBS = [
  // tests/mocks files
  "**/*.test.{ts,tsx,js,jsx}",
  "**/*.spec.{ts,tsx,js,jsx}",
  "**/*.mock.{ts,tsx,js,jsx}",
  // assets (extensions)
  "**/*.{png,jpg,jpeg,gif,svg,ico,webp,mp4,mp3,pdf,zip,tar.gz,mov,avi,mkv}",
];

export function shouldIgnore(filePath: string): boolean {
  const p = filePath.replace(/\\\\/g, "/");
  const segs = p.split("/");
  // 1) exact filenames
  const base = segs[segs.length - 1];
  if (IGNORED_FILES_EXACT.has(base)) return true;

  if (segs.some((s) => IGNORED_DIRS.has(s))) return true;

  for (const glob of IGNORED_GLOBS) {
    const re = globToRegex(glob);
    if (re.test(p)) return true;
  }
  return false;
}

function globToRegex(glob: string): RegExp {
  const esc = (s: string) => s.replace(/[.+^$()|[\]\\]/g, "\\$&");
  let pat = "";
  let i = 0;
  while (i < glob.length) {
    if (glob[i] === "*") {
      if (glob[i + 1] === "*") {
        pat += ".*";
        i += 2;
      } else {
        pat += "[^/]*";
        i += 1;
      }
    } else if (glob[i] === "{") {
      const j = glob.indexOf("}", i);
      const alts = glob
        .slice(i + 1, j)
        .split(",")
        .map(esc)
        .join("|");
      pat += `(?:${alts})`;
      i = j + 1;
    } else {
      pat += esc(glob[i++]);
    }
  }
  return new RegExp(`^${pat}$`);
}
