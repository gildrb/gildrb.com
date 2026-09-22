import { Atmosphere, Camera, FrameConstants, PI, sampleTransmittance, skyViewUv } from "../../atmosphere/atmosphere-common.wgsl";
@group(0) @binding(0) var<uniform> atmosphere: Atmosphere;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var transmittanceLut: texture_2d<f32>;
@group(0) @binding(3) var skyViewLut: texture_2d<f32>;
@group(0) @binding(4) var lutSampler: sampler;
@group(0) @binding(5) var<storage, read_write> frameConstants: FrameConstants;
@compute @workgroup_size(1)
fn main() {
  let p = atmosphere;
  let viewHeight = length(camera.position);
  let up = camera.position / viewHeight;
  let horizon = sqrt(max(0.0, viewHeight * viewHeight - p.groundRadius * p.groundRadius));
  let beta = acos(clamp(horizon / viewHeight, -1.0, 1.0));
  let horizontal = p.sunDirection - up * dot(p.sunDirection, up);
  let radius = camera.sunAngularRadius;
  frameConstants.skyAmbient = textureSampleLevel(skyViewLut, lutSampler, skyViewUv(p, viewHeight, 0.5, 0.0, false), 0.0).rgb;
  frameConstants.groundBounce = 0.15 * p.sunIlluminance * sampleTransmittance(p, transmittanceLut, lutSampler, p.groundRadius, p.sunDirection.y) * max(p.sunDirection.y, 0.0) / PI;
  frameConstants.sunCosRadius = cos(radius);
  frameConstants.sunSinRadius = sin(radius);
  frameConstants.sunHorizontal = horizontal;
  frameConstants.sunHorizontalLength = length(horizontal);
  frameConstants.beta = beta;
  frameConstants.zenithHorizonAngle = PI - beta;
  frameConstants.sunSolidAngle = PI * sin(radius) * sin(radius);
  frameConstants.sunTerrainVisibility = 1.0;
}
