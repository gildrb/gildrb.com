// Pinned spherical water caps on the virtual lens. They refract the rendered sky,
// carry a thin Fresnel edge and remain subtle enough not to read as bubbles.
struct Params { size: vec2f, time: f32, wetness: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1,311.7))) * 43758.5453); }
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let pixel = uv * params.size;
  let cell = floor(pixel / 72.0);
  let seed = hash(cell);
  let cycle = params.time * 0.038 + seed * 17.0;
  let age = fract(cycle);
  let generation = floor(cycle);
  let rnd = vec2f(hash(cell + generation + 2.3), hash(cell + generation + 8.2));
  let center = (cell + vec2f(0.16) + rnd * 0.68) * 72.0;
  let life = smoothstep(0.0, 0.018, age) * (1.0 - smoothstep(0.88, 1.0, age));
  let radius = mix(2.0, 8.5, pow(hash(cell + generation + 5.4), 2.4));
  let shape = vec2f(1.0, mix(0.84, 1.18, rnd.x));
  let local = (pixel - center) / (radius * shape);
  let r = length(local);
  let present = select(0.0, 1.0, seed < params.wetness);
  let mask = (1.0 - smoothstep(0.82, 1.0, r)) * life * present;
  let cap = sqrt(max(0.001, 1.0 - min(r * r, 0.999)));
  let normal = normalize(vec3f(local * 0.72, cap));
  let refractedRay = refract(vec3f(0.0,0.0,-1.0), normal, 1.0 / 1.333);
  let offset = refractedRay.xy / max(0.25, abs(refractedRay.z)) * radius * 1.75 / params.size;
  let dry = textureSampleLevel(scene, linearSampler, uv, 0.0).rgb;
  let wet = textureSampleLevel(scene, linearSampler, clamp(uv + offset, vec2f(0.001), vec2f(0.999)), 0.0).rgb;
  let reflection = textureSampleLevel(scene, linearSampler, clamp(uv - offset * 2.3, vec2f(0.001), vec2f(0.999)), 0.0).rgb;
  let fresnel = 0.0204 + 0.9796 * pow(1.0 - max(0.0, normal.z), 5.0);
  let rim = smoothstep(0.68, 0.9, r) * (1.0 - smoothstep(0.92, 1.02, r)) * mask;
  var optical = mix(wet, reflection, fresnel) * (1.0 - 0.035 * smoothstep(0.62, 0.96, r));
  optical += vec3f(0.78, 0.87, 0.96) * rim * 0.09;
  return vec4f(mix(dry, optical, mask), 1.0);
}
