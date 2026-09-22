// Instanced, world-space drops falling toward a stationary upward-facing camera.
// A geometric optics / shutter approximation, not a fluid simulation.
struct Params { size: vec2f, time: f32, shutter: f32 }
@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var scene: texture_2d<f32>;
@group(0) @binding(2) var linearSampler: sampler;

fn hash(n: f32) -> f32 { return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
struct Out {
  @builtin(position) clip: vec4f,
  @location(0) local: vec2f,
  @location(1) radius: f32,
  @location(2) density: f32,
}
@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> Out {
  let id = f32(instance);
  let speed = mix(5.5, 8.8, hash(id + 23.0));
  let cycle = hash(id + 17.0) + params.time * speed / 24.0;
  let phase = fract(cycle);
  let generation = floor(cycle);
  let height = 0.8 + (1.0 - phase) * 24.0;
  let world = (vec2f(hash(id * 5.7 + generation * 3.1), hash(id * 9.3 + generation * 5.7)) - 0.5) * 28.0;
  let focal = params.size.y * 0.8660254;
  let head = params.size * 0.5 + world / height * focal;
  let tail = params.size * 0.5 + (world + vec2f(0.003, 0.001)) / (height + speed * params.shutter) * focal;
  let delta = tail - head;
  let lengthPx = length(delta);
  let direction = normalize(delta + vec2f(0.00001, 0.00001));
  let physicalRadius = mix(0.00065, 0.0027, pow(hash(id + 91.0), 2.0));
  let radiusPx = physicalRadius * focal / height;
  let rasterRadius = max(0.55, radiusPx);
  var corners = array<vec2f, 6>(vec2f(-1.0,0.0), vec2f(1.0,0.0), vec2f(-1.0,1.0), vec2f(-1.0,1.0), vec2f(1.0,0.0), vec2f(1.0,1.0));
  let p = corners[vertex];
  let end = mix(head, tail, p.y) + direction * (p.y - 0.5) * rasterRadius * 2.0;
  let pixel = end + vec2f(-direction.y, direction.x) * p.x * rasterRadius;
  let uv = pixel / params.size;
  var out: Out;
  out.clip = vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
  out.local = p;
  out.radius = rasterRadius;
  out.density = min(1.0, radiusPx / rasterRadius) * smoothstep(0.0, 0.08, phase)
    * (1.0 - smoothstep(0.98, 1.0, phase)) / (1.0 + lengthPx * 0.025);
  return out;
}
@fragment fn fs_main(v: Out) -> @location(0) vec4f {
  let uv = v.clip.xy / params.size;
  let width = max(0.0, 1.0 - v.local.x * v.local.x);
  let along = smoothstep(0.0, 0.15, v.local.y) * (1.0 - smoothstep(0.72, 1.0, v.local.y));
  let normal = normalize(vec3f(v.local.x * 0.65, (v.local.y - 0.5) * 0.6, sqrt(width) + 0.05));
  let ray = refract(vec3f(0.0,0.0,-1.0), normal, 1.0 / 1.333);
  let offset = ray.xy * v.radius * 1.8 / params.size;
  let transmitted = textureSampleLevel(scene, linearSampler, clamp(uv + offset, vec2f(0.001), vec2f(0.999)), 0.0).rgb;
  let fresnel = 0.0204 + 0.9796 * pow(1.0 - normal.z, 5.0);
  let reflected = textureSampleLevel(scene, linearSampler, clamp(uv - offset * 3.0, vec2f(0.001), vec2f(0.999)), 0.0).rgb;
  // A drop is a tiny spherical lens, not a luminous streak. Its lower hemisphere
  // also refracts the darker off-screen environment, leaving a dark core and sky rim.
  let groundTransmission = transmitted * (0.40 + 0.5 * abs(v.local.x));
  let color = mix(groundTransmission, reflected * 1.10, clamp(fresnel + pow(abs(v.local.x), 3.0) * 0.45, 0.0, 1.0));
  return vec4f(color, clamp(width * along * v.density * 0.9, 0.0, 0.7));
}
