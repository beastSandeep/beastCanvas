import "./style.css";
import vertexShaderSource from "./shaders/triangle.vert.glsl";

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;

const gl = canvas.getContext("webgl")!;

// -------------------------
// Vertex shader
// -------------------------

// const vertexShaderSource = `
//     attribute vec2 a_position;

//     void main() {
//         gl_Position = vec4(a_position, 0.0, 1.0);
//     }
// `;

// -------------------------
// Fragment shader
// -------------------------

const fragmentShaderSource = `
    precision mediump float;

    void main() {
        gl_FragColor = vec4(1.0, 0.2, 0.2, 1.0);
    }
`;

// -------------------------
// Compile shader
// -------------------------

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Shader compilation failed");
  }

  return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);

const fragmentShader = createShader(
  gl,
  gl.FRAGMENT_SHADER,
  fragmentShaderSource,
);

// -------------------------
// Create program
// -------------------------

const program = gl.createProgram()!;

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program) ?? "Program linking failed");
}

gl.useProgram(program);

// -------------------------
// Triangle vertices
// -------------------------

const vertices = new Float32Array([0.0, 0.7, -0.7, -0.7, 0.7, -0.7]);

// -------------------------
// Create GPU buffer
// -------------------------

const buffer = gl.createBuffer()!;

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

// -------------------------
// Connect buffer to shader
// -------------------------

const positionLocation = gl.getAttribLocation(program, "a_position");

gl.enableVertexAttribArray(positionLocation);

gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// -------------------------
// Draw
// -------------------------

gl.clearColor(0.05, 0.05, 0.05, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

gl.drawArrays(gl.TRIANGLES, 0, 3);
