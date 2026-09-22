// Sky-only aerial perspective, using the example's same scattering integrator.
// Terrain and cloud-shadow cascades are absent because the camera sees only sky.
import { AERIAL_KM_PER_SLICE, AERIAL_LUT_DEPTH, AERIAL_LUT_HEIGHT, AERIAL_LUT_WIDTH, Atmosphere, Camera, cameraRay, meanTransmittance, integrateScattering } from "../../atmosphere/atmosphere-common.wgsl";
@group(0) @binding(0) var<uniform> atmosphere: Atmosphere;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var transmittanceLut: texture_2d<f32>;
@group(0) @binding(3) var multiScatterLut: texture_2d<f32>;
@group(0) @binding(4) var lutSampler: sampler;
@group(0) @binding(5) var aerialLut: texture_storage_3d<rgba16float, write>;
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let uv = (vec2f(id.xy) + 0.5) / vec2f(AERIAL_LUT_WIDTH, AERIAL_LUT_HEIGHT);
  let dir = cameraRay(camera, vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0));
  let slice = (f32(id.z) + 0.5) / AERIAL_LUT_DEPTH;
  let distance = slice * slice * AERIAL_LUT_DEPTH * AERIAL_KM_PER_SLICE;
  let result = integrateScattering(atmosphere, camera.position, dir, atmosphere.sunDirection, distance, max(1.0, f32(id.z + 1u) * 2.0), false, false, true, transmittanceLut, multiScatterLut, lutSampler);
  textureStore(aerialLut, id, vec4f(result.luminance, 1.0 - meanTransmittance(result.transmittance)));
}
