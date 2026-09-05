// triangle.vert.glsl
#include "./common/math.glsl"
#include "./common/constants.glsl"

attribute vec2 a_position;

void main() {
  vec2 position = rotate(a_position, PI * 0.5);

  gl_Position = vec4(position, 0.0, 1.0);
}