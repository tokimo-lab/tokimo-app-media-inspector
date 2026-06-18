// Tokimo monorepo dev-mode override.
const fs = require("node:fs");
const path = require("node:path");

function findMonorepoRoot(start) {
  let dir = start;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, "packages/tokimo-app-builder/package.json"))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

const root = findMonorepoRoot(__dirname);

function rel(target) {
  return path.relative(__dirname, target).split(path.sep).join("/");
}

const fileOverrides = root
  ? {
      "@tokimo/ui": `link:${rel(path.join(root, "packages/ui"))}`,
      "@tokimo/sdk": `link:${rel(path.join(root, "packages/tokimo-package-sdk"))}`,
      "@tokimo/app-builder": `link:${rel(path.join(root, "packages/tokimo-app-builder"))}`,
    }
  : null;

const githubRefs = {
  "@tokimo/ui":
    "github:tokimo-lab/tokimo-ui#67925b8147d21f7d5ac3db50a3601400b144b89d",
  "@tokimo/sdk":
    "github:tokimo-lab/tokimo-package-sdk#2632b1b675b012735d54f85fee00b71b7f27e0c4",
  "@tokimo/app-builder":
    "github:tokimo-lab/tokimo-app-builder#2232b1ba4fb9b7d61645c6588c579106bf6821dd",
};

if (fileOverrides) {
  console.log(
    `[tokimo .pnpmfile.cjs] monorepo detected at ${root}; overriding @tokimo/* to file: paths`,
  );
}

function rewriteSection(section) {
  if (!section) return;
  for (const [name, spec] of Object.entries(section)) {
    if (fileOverrides && Object.hasOwn(fileOverrides, name)) {
      section[name] = fileOverrides[name];
    } else if (
      !fileOverrides &&
      spec === "workspace:*" &&
      Object.hasOwn(githubRefs, name)
    ) {
      section[name] = githubRefs[name];
    }
  }
}

module.exports = {
  hooks: {
    readPackage(pkg) {
      rewriteSection(pkg.dependencies);
      rewriteSection(pkg.devDependencies);
      rewriteSection(pkg.peerDependencies);
      return pkg;
    },
  },
};
