import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";

export function glsl(): Plugin {
  return {
    name: "vite-plugin-glsl",

    transform(code, id) {
      // Remove Vite query parameters such as ?raw
      const filename = id.split("?")[0];

      // Only process GLSL files
      if (!filename.endsWith(".glsl")) {
        return;
      }

      const dependencies = new Set<string>();
      const included = new Set<string>();

      const source = processIncludes(code, filename, dependencies, included);

      // Tell Vite to watch all included files
      for (const dependency of dependencies) {
        this.addWatchFile(dependency);
      }

      // Turn GLSL into a JavaScript module
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
  included: Set<string>,
  stack = new Set<string>(),
): string {
  const normalizedFilename = path.normalize(filename);

  // --------------------------------------------------
  // Circular include detection
  // --------------------------------------------------

  if (stack.has(normalizedFilename)) {
    const chain = [...stack, normalizedFilename].join("\n  → ");

    throw new Error(`Circular GLSL include detected:\n\n  → ${chain}`);
  }

  stack.add(normalizedFilename);

  // --------------------------------------------------
  // Check for #pragma once
  // --------------------------------------------------

  const hasPragmaOnce = /^\s*#pragma\s+once\s*$/m.test(source);

  /*
   * If this file has #pragma once and has already
   * been included, don't include it again.
   */
  if (hasPragmaOnce && included.has(normalizedFilename)) {
    stack.delete(normalizedFilename);
    return "";
  }

  // Mark the file as included
  if (hasPragmaOnce) {
    included.add(normalizedFilename);
  }

  // --------------------------------------------------
  // Remove #pragma once
  // --------------------------------------------------

  const cleanSource = source.replace(/^\s*#pragma\s+once\s*$/gm, "");

  const directory = path.dirname(normalizedFilename);

  // --------------------------------------------------
  // Process #include directives
  // --------------------------------------------------

  const result = cleanSource.replace(
    /^\s*#include\s+"([^"]+)"\s*$/gm,
    (_match, includePath: string) => {
      const includeFile = path.resolve(directory, includePath);

      const normalizedIncludeFile = path.normalize(includeFile);

      // ------------------------------------------------
      // Check file exists
      // ------------------------------------------------

      if (!fs.existsSync(normalizedIncludeFile)) {
        throw new Error(
          `GLSL include not found:\n\n` +
            `  Include: ${includePath}\n` +
            `  From:    ${normalizedFilename}\n` +
            `  Resolved: ${normalizedIncludeFile}`,
        );
      }

      // ------------------------------------------------
      // Add dependency for Vite watching
      // ------------------------------------------------

      dependencies.add(normalizedIncludeFile);

      // ------------------------------------------------
      // Read included file
      // ------------------------------------------------

      const includedSource = fs.readFileSync(normalizedIncludeFile, "utf8");

      // ------------------------------------------------
      // Recursively process included file
      // ------------------------------------------------

      return processIncludes(
        includedSource,
        normalizedIncludeFile,
        dependencies,
        included,
        stack,
      );
    },
  );

  // Remove current file from circular include stack
  stack.delete(normalizedFilename);

  return result;
}
