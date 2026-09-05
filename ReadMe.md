# Vite + TypeScript + GLSL Include System

This document explains how to build a custom GLSL `#include` system for a Vite + TypeScript + WebGL project.

---

## 1. Project Structure

A simple project can look like this:

```text
webgl-demo/
│
├── .vscode/
│   └── settings.json
│
├── plugins/
│   └── glsl.ts
│
├── src/
│   ├── main.ts
│   ├── vite-env.d.ts
│   │
│   └── shaders/
│       ├── triangle.vert.glsl
│       ├── triangle.frag.glsl
│       │
│       └── common/
│           └── math.glsl
│
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

# 2. Why Use a GLSL Plugin?

WebGL does not natively understand:

```glsl
#include "./common/math.glsl"
```

If this source is sent directly to WebGL, the GLSL compiler will complain.

Therefore, we need to preprocess the shader **before** giving it to WebGL.

The pipeline becomes:

```text
triangle.vert.glsl
        │
        ▼
    Vite Plugin
        │
        │ process #include
        ▼
    Expanded GLSL
        │
        ▼
   TypeScript string
        │
        ▼
 gl.shaderSource()
        │
        ▼
      WebGL
```

The plugin is essentially a small GLSL preprocessor.

---

# 3. GLSL Source Files

For example:

## `math.glsl`

```glsl
vec2 rotate(vec2 p, float angle)
{
    float c = cos(angle);
    float s = sin(angle);

    return vec2(
        c * p.x - s * p.y,
        s * p.x + c * p.y
    );
}
```

## `triangle.vert.glsl`

```glsl
#include "./common/math.glsl"

attribute vec2 a_position;

void main()
{
    vec2 position = rotate(a_position, 0.5);

    gl_Position = vec4(position, 0.0, 1.0);
}
```

The `#include` line is **our custom syntax**.

It is not being processed by WebGL.

---

# 4. The Vite Plugin

Create:

```text
plugins/glsl.ts
```

```ts
import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

export function glsl(): Plugin {
  return {
    name: "vite-plugin-glsl",

    transform(code, id) {
      const filename = id.split("?")[0];

      if (!filename.endsWith(".glsl")) {
        return;
      }

      const dependencies = new Set<string>();

      const source = processIncludes(code, filename, dependencies);

      // Tell Vite about every included GLSL file
      for (const dependency of dependencies) {
        this.addWatchFile(dependency);
      }

      return {
        code: `export default ${JSON.stringify(source)};`,
        map: null,
      };
    },
  };
}

function processIncludes(
  source: string,
  filename: string,
  dependencies: Set<string>,
  stack = new Set<string>(),
): string {
  const normalizedFilename = path.normalize(filename);

  // Detect circular includes
  if (stack.has(normalizedFilename)) {
    throw new Error(`Circular GLSL include detected:\n${normalizedFilename}`);
  }

  stack.add(normalizedFilename);

  const directory = path.dirname(normalizedFilename);

  const result = source.replace(
    /^\s*#include\s+"([^"]+)"\s*$/gm,

    (_match, includePath: string) => {
      const includeFile = path.resolve(directory, includePath);

      if (!fs.existsSync(includeFile)) {
        throw new Error(
          `GLSL include not found:\n` +
            `  ${includePath}\n` +
            `  from: ${normalizedFilename}\n` +
            `  resolved: ${includeFile}`,
        );
      }

      dependencies.add(includeFile);

      const includedSource = fs.readFileSync(includeFile, "utf8");

      return processIncludes(includedSource, includeFile, dependencies, stack);
    },
  );

  stack.delete(normalizedFilename);

  return result;
}
```

---

# 5. How the Plugin Works

A Vite plugin is an object containing hooks.

The basic structure is:

```ts
export function glsl(): Plugin {
  return {
    name: "vite-plugin-glsl",

    transform(code, id) {
      // transform source
    },
  };
}
```

Vite calls the `transform()` hook whenever it processes a module.

The arguments are:

```ts
transform(code, id);
```

### `code`

The contents of the file.

For example:

```glsl
#include "./common/math.glsl"

void main()
{
    ...
}
```

### `id`

The file path.

For example:

```text
D:/Desktop/webgl-demo/src/shaders/triangle.vert.glsl
```

---

# 6. Detecting GLSL Files

We only want to process `.glsl` files:

```ts
if (!filename.endsWith(".glsl")) {
  return;
}
```

Returning `undefined` tells Vite:

> "I don't want to transform this file."

---

# 7. Finding `#include`

The plugin uses a regular expression:

```ts
/^\s*#include\s+"([^"]+)"\s*$/gm;
```

It matches:

```glsl
#include "./common/math.glsl"
```

The important part is:

```text
#include "..."
```

The path inside the quotes is captured as:

```ts
includePath;
```

For example:

```ts
includePath === "./common/math.glsl";
```

---

# 8. Resolving the Include

Suppose:

```text
src/shaders/triangle.vert.glsl
```

contains:

```glsl
#include "./common/math.glsl"
```

The plugin gets the directory:

```ts
const directory = path.dirname(filename);
```

which gives:

```text
src/shaders
```

Then:

```ts
const includeFile = path.resolve(directory, includePath);
```

produces:

```text
src/shaders/common/math.glsl
```

This means include paths are **relative to the GLSL file containing the include**.

---

# 9. Reading the GLSL File

Node.js reads the included file:

```ts
const includedSource = fs.readFileSync(includeFile, "utf8");
```

For example:

```glsl
vec2 rotate(vec2 p, float angle)
{
    ...
}
```

---

# 10. Replacing `#include`

The original:

```glsl
#include "./common/math.glsl"

attribute vec2 a_position;
```

becomes:

```glsl
vec2 rotate(vec2 p, float angle)
{
    ...
}

attribute vec2 a_position;
```

The `#include` directive is completely removed before WebGL sees the shader.

---

# 11. Recursive Includes

The plugin calls itself recursively:

```ts
return processIncludes(includedSource, includeFile, dependencies, stack);
```

This allows:

```text
triangle.vert.glsl
        │
        ├── math.glsl
        │      │
        │      └── constants.glsl
        │
        └── camera.glsl
```

For example:

```glsl
// triangle.vert.glsl

#include "./common/math.glsl"
```

and:

```glsl
// math.glsl

#include "./constants.glsl"
```

Both files are expanded.

---

# 12. Circular Include Detection

Without protection, this would cause infinite recursion:

```text
a.glsl
  ↓
b.glsl
  ↓
a.glsl
  ↓
b.glsl
  ↓
...
```

The plugin maintains a `Set`:

```ts
const stack = new Set<string>();
```

Before processing a file:

```ts
if (stack.has(normalizedFilename)) {
  throw new Error(`Circular GLSL include detected`);
}
```

This produces a useful error instead of an infinite loop.

---

# 13. Watching Included Files

There is an important Vite-specific part:

```ts
const dependencies = new Set<string>();
```

Every included file is recorded:

```ts
dependencies.add(includeFile);
```

Then:

```ts
for (const dependency of dependencies) {
  this.addWatchFile(dependency);
}
```

This tells Vite:

> "The main shader depends on these files too."

Without this, editing:

```text
math.glsl
```

may not correctly trigger a rebuild/reload of:

```text
triangle.vert.glsl
```

The dependency graph becomes:

```text
triangle.vert.glsl
        │
        └──────► math.glsl
```

---

# 14. Returning JavaScript

Vite expects the transformed module to contain JavaScript.

Therefore the plugin converts the GLSL string into:

```ts
export default "...";
```

using:

```ts
return {
  code: `export default ${JSON.stringify(source)};`,
  map: null,
};
```

So this:

```glsl
void main()
{
    gl_Position = vec4(0.0);
}
```

effectively becomes:

```ts
export default "void main()\n{\n    gl_Position = vec4(0.0);\n}";
```

---

# 15. Importing GLSL From TypeScript

Now TypeScript can do:

```ts
import vertexShaderSource from "./shaders/triangle.vert.glsl";
```

The result is:

```ts
vertexShaderSource: string;
```

Then:

```ts
gl.shaderSource(shader, vertexShaderSource);
```

sends the processed shader to WebGL.

---

# 16. TypeScript Declaration for `.glsl`

TypeScript normally doesn't know what this is:

```ts
import shader from "./shader.glsl";
```

Create:

```text
src/vite-env.d.ts
```

with:

```ts
/// <reference types="vite/client" />

declare module "*.glsl" {
  const source: string;
  export default source;
}
```

This tells TypeScript:

> Any `.glsl` import is a string.

---

# 17. Vite Configuration

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { glsl } from "./plugins/glsl.ts";

export default defineConfig({
  plugins: [glsl()],

  server: {
    port: 3000,
  },
});
```

The important part is:

```ts
plugins: [glsl()];
```

This registers the custom GLSL plugin with Vite.

---

# 18. Development

Run:

```bash
npm run dev
```

Vite starts the development server.

The process is:

```text
TypeScript
     │
     ▼
import shader.glsl
     │
     ▼
Vite
     │
     ▼
GLSL Plugin
     │
     ├── find #include
     ├── read included file
     ├── recursively expand includes
     └── register dependencies
     │
     ▼
JavaScript module
     │
     ▼
TypeScript
     │
     ▼
WebGL
```

---

# 19. Production Build

Run:

```bash
npm run build
```

Vite processes the project and creates:

```text
dist/
```

To test the production build:

```bash
npm run preview
```

Do not open `dist/index.html` directly with VS Code Live Server.

Use Vite Preview instead:

```bash
npm run preview
```

---

# 20. VS Code Settings

Create:

```text
.vscode/settings.json
```

```json
{
  "files.associations": {
    "*.glsl": "glsl"
  },

  "webgl-glsl-editor.diagnostics": false,

  "editor.tokenColorCustomizations": {
    "textMateRules": [
      {
        "scope": "keyword.control.include.glsl",
        "settings": {
          "foreground": "#C586C0"
        }
      },
      {
        "scope": "string.quoted.double.include.glsl",
        "settings": {
          "foreground": "#CE9178"
        }
      }
    ]
  }
}
```

---

# 21. Why Disable GLSL Diagnostics?

The source shader contains:

```glsl
#include "./common/math.glsl"
```

However, normal GLSL compilers don't necessarily understand this custom preprocessing syntax.

Your Vite plugin processes it first.

Therefore:

```text
VS Code
   │
   └── sees #include
          │
          └── may report an error
```

while the actual build does:

```text
GLSL source
    │
    ▼
Vite GLSL plugin
    │
    ▼
#includes expanded
    │
    ▼
valid GLSL
    │
    ▼
WebGL
```

The WebGL GLSL Editor's diagnostics are therefore disabled:

```json
"webgl-glsl-editor.diagnostics": false
```

This does **not** disable syntax highlighting.

---

# 22. Custom Coloring

The settings contain:

```json
"editor.tokenColorCustomizations": {
    "textMateRules": [
        {
            "scope": "keyword.control.include.glsl",
            "settings": {
                "foreground": "#C586C0"
            }
        }
    ]
}
```

This tells VS Code:

> If a token has the `keyword.control.include.glsl` scope, use this color.

However, defining the color does **not** create the scope.

A grammar/injection must assign that scope.

The intended result is:

```text
#include "./common/math.glsl"
^^^^^^^  ^^^^^^^^^^^^^^^^^^^
   │              │
   │              └── string.quoted.double.include.glsl
   │
   └── keyword.control.include.glsl
```

A custom VS Code grammar can provide these scopes.

---

# 23. Important Difference: Vite Plugin vs VS Code Extension

These are two separate systems.

## Vite plugin

Responsible for:

```text
Building
Preprocessing
Resolving includes
Watching dependencies
```

Pipeline:

```text
GLSL
 ↓
Vite
 ↓
GLSL plugin
 ↓
expanded GLSL
 ↓
WebGL
```

## VS Code extension/grammar

Responsible for:

```text
Syntax highlighting
Editor scopes
Editor behavior
```

Pipeline:

```text
GLSL source
 ↓
VS Code grammar
 ↓
syntax highlighting
```

The VS Code grammar does **not** replace the Vite plugin.

---

# 24. Current Architecture

The complete system looks like:

```text
                         VS Code
                            │
                    GLSL highlighting
                            │
                            ▼
                     GLSL source files
                            │
                            │
                            ▼
                         Vite
                            │
                     ┌──────┴──────┐
                     │             │
                TypeScript      GLSL Plugin
                                    │
                              process #include
                                    │
                              resolve files
                                    │
                              recursive expand
                                    │
                              watch dependencies
                                    │
                                    ▼
                              Final GLSL
                                    │
                                    ▼
                               TypeScript
                                    │
                                    ▼
                                  WebGL
                                    │
                                    ▼
                                   GPU
```

---

# 25. Example

Source:

```glsl
#include "./common/math.glsl"

attribute vec2 a_position;

void main()
{
    vec2 position =
        rotate(a_position, 0.5);

    gl_Position =
        vec4(position, 0.0, 1.0);
}
```

After preprocessing:

```glsl
vec2 rotate(vec2 p, float angle)
{
    float c = cos(angle);
    float s = sin(angle);

    return vec2(
        c * p.x - s * p.y,
        s * p.x + c * p.y
    );
}

attribute vec2 a_position;

void main()
{
    vec2 position =
        rotate(a_position, 0.5);

    gl_Position =
        vec4(position, 0.0, 1.0);
}
```

That final shader is what gets sent to:

```ts
gl.shaderSource(vertexShader, vertexShaderSource);
```

---

# 26. Why This Approach Is Useful

This lets you keep shaders modular:

```text
shaders/
├── common/
│   ├── math.glsl
│   ├── noise.glsl
│   ├── camera.glsl
│   └── lighting.glsl
│
├── basic/
│   ├── basic.vert.glsl
│   └── basic.frag.glsl
│
├── particles/
│   ├── particle.vert.glsl
│   └── particle.frag.glsl
│
└── terrain/
    ├── terrain.vert.glsl
    └── terrain.frag.glsl
```

Instead of putting everything into one huge shader.

For example:

```glsl
#include "../common/math.glsl"
#include "../common/camera.glsl"
#include "../common/lighting.glsl"
```

This makes a larger WebGL library much easier to maintain.

---

# 27. Possible Future Improvements

The current plugin is intentionally small.

It can later be extended with:

- `<name>` style includes
- include directories
- duplicate include prevention
- `#pragma once`
- better error locations
- GLSL source maps
- shader minification
- shader validation
- shader hot reload
- shader variants
- `#define` injection
- WebGL 1 / WebGL 2 shader handling
- VS Code `Ctrl+Click` include navigation
- GLSL dependency graphs

For example, a future syntax could be:

```glsl
#include <common/math>
#include <common/camera>
#include <lighting/basic>
```

with the plugin resolving these to:

```text
src/shaders/common/math.glsl
src/shaders/common/camera.glsl
src/shaders/lighting/basic.glsl
```

This would give the WebGL library its own small shader module system.
