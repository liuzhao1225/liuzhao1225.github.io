/*
 * "Path to the colorful infinity" by Benoit Marini, 2020.
 * Adapted from https://www.shadertoy.com/view/WtjyzR
 * Licensed under CC BY-NC-SA 3.0:
 * https://creativecommons.org/licenses/by-nc-sa/3.0/
 */

(() => {
  const canvas = document.querySelector("#shader-background");
  const gl = canvas?.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
  });

  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;

    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;

    uniform vec2 iResolution;
    uniform float iTime;

    #define NUM_LAYERS 16.0
    #define ITER 23

    vec4 tex(vec3 p) {
      float t = iTime + 78.0;
      vec4 o = vec4(p.xyz, 3.0 * sin(t * 0.1));
      vec4 dec = vec4(1.0, 0.9, 0.1, 0.15) + vec4(0.06 * cos(t * 0.1), 0.0, 0.0, 0.14 * cos(t * 0.23));

      for (int i = 0; i < ITER; i++) {
        o.xzyw = abs(o / dot(o, o) - dec);
      }

      return o;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
      vec3 col = vec3(0.0);
      float t = iTime * 0.3;

      for (float i = 0.0; i <= 1.0; i += 1.0 / NUM_LAYERS) {
        float d = fract(i + t);
        float s = mix(5.0, 0.5, d);
        float f = d * smoothstep(1.0, 0.9, d);
        col += tex(vec3(uv * s, i * 4.0)).xyz * f;
      }

      col /= NUM_LAYERS;
      col *= vec3(2.0, 1.0, 2.0);
      col = pow(col, vec3(0.5));
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  gl.useProgram(program);

  const position = gl.getAttribLocation(program, "position");
  const resolution = gl.getUniformLocation(program, "iResolution");
  const time = gl.getUniformLocation(program, "iTime");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resize = () => {
    const density = Math.min(window.devicePixelRatio || 1, 1);
    const renderScale = window.innerWidth < 720 ? 0.82 : 0.72;
    const width = Math.round(window.innerWidth * density * renderScale);
    const height = Math.round(window.innerHeight * density * renderScale);

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startedAt = performance.now();
  const animationSpeed = 0.6;
  let needsResize = true;

  window.addEventListener(
    "resize",
    () => {
      needsResize = true;
    },
    { passive: true },
  );

  const render = (now) => {
    if (needsResize) {
      resize();
      needsResize = false;
    }
    gl.uniform2f(resolution, canvas.width, canvas.height);
    gl.uniform1f(time, reduceMotion ? 0 : ((now - startedAt) / 1000) * animationSpeed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!reduceMotion) requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
})();
