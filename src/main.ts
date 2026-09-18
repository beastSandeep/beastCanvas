// import test from "./test";
// test();

import "./style.css";

// 800 X 600
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const gl = canvas.getContext("webgl")!;

// setting color buffer
gl.clearColor(0.2, 0.4, 0.55, 1.0);
// Clear <canvas>
gl.clear(gl.COLOR_BUFFER_BIT);

const savedColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
console.log(savedColor); // Output: Float32Array [0.2, 0.4, 0.55, 1]

gl.clearColor(0.5, 0.7, 0.2, 1.0);

setTimeout(() => {
  const savedColor = gl.getParameter(gl.COLOR_CLEAR_VALUE);
  console.log(savedColor); // Output: Float32Array [0.2, 0.4, 0.55, 1]
  gl.clear(gl.COLOR_BUFFER_BIT);
}, 2000);
