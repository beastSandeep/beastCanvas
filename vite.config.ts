import { defineConfig } from "vite";
import { glsl } from "./plugins/glsl.ts";

export default defineConfig({
  // build: {
  //   lib: {
  //     entry: "src/index.ts",
  //     name: "MyWebGL",
  //     fileName: "my-webgl",
  //   },
  // },
  plugins: [glsl()],
  server: {
    port: 3000,
  },
});
