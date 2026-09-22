// import test from "./test";
// test();

import "./style.css";

// 800 X 600
const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const gl: WebGLRenderingContext = canvas.getContext("webgl")!;

gl.clearColor(0, 0, 0, 1);
gl.clear(gl.COLOR_BUFFER_BIT);


const vertexShaderSource = `
  attribute vec4 att_Position; // getting attribute from JS
  
  void main() {
    gl_Position = att_Position;
    gl_PointSize = 20.0;
  }
`
const fragmentShaderSource = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`

const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;
gl.shaderSource(vertexShader, vertexShaderSource);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;
gl.shaderSource(fragmentShader, fragmentShaderSource);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);
gl.useProgram(program);

// Get the storage location of attribute variable
const a_Position = gl.getAttribLocation(program, 'att_Position')

// Pass vertex position to attribute variable
gl.vertexAttrib3f(a_Position, 0.0, 0.0, 0.0);


gl.drawArrays(gl.POINTS, 0, 1)


