#pragma once

vec2 rotate(vec2 p, float angle) {
  float c = cos(angle);
  float s = sin(angle);

  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}