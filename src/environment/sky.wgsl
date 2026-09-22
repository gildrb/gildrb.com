import { Atmosphere, Camera, FrameConstants, cameraRay, skyViewUvFast, sampleTransmittance, PI } from "../../atmosphere/atmosphere-common.wgsl";
@group(0) @binding(0) var<uniform> atmosphere: Atmosphere;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var skyViewLut: texture_2d<f32>;
@group(0) @binding(3) var transmittanceLut: texture_2d<f32>;
@group(0) @binding(4) var lutSampler: sampler;
@group(0) @binding(5) var<storage, read> frame: FrameConstants;
@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dir = cameraRay(camera, vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0));
  let up = normalize(camera.position);
  let vertical = dot(dir, up);
  let horizontal = dir - up * vertical;
  var lightViewCos = 1.0;
  if (frame.sunHorizontalLength > 1e-5 && length(horizontal) > 1e-5) { lightViewCos = dot(frame.sunHorizontal / frame.sunHorizontalLength, normalize(horizontal)); }
  let sky = textureSampleLevel(skyViewLut, lutSampler, skyViewUvFast(frame, vertical, lightViewCos, false), 0.0).rgb;
  let angle = acos(clamp(dot(dir, atmosphere.sunDirection), -1.0, 1.0));
  let edge = frame.sunSinRadius * camera.pixelAngle;
  let disc = smoothstep(frame.sunCosRadius - edge, frame.sunCosRadius + edge, dot(dir, atmosphere.sunDirection));
  let sun = atmosphere.sunIlluminance * disc / frame.sunSolidAngle;
  let glare = atmosphere.sunIlluminance * (2e-3 / (2.0 * PI * 0.0436 * 0.0436)) * exp(-0.5 * angle * angle / (0.0436 * 0.0436));
  let transmission = sampleTransmittance(atmosphere, transmittanceLut, lutSampler, length(camera.position), vertical);
  return vec4f(sky + (sun + glare) * transmission, -1.0);
}
