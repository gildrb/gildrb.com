import {
  compute,
  draw,
  effect,
  frame,
  pingPong,
  sampler,
  storage,
  target,
  texture,
  uniforms,
  type Gpu,
  type Target,
  type Texture,
} from "vgpu";
import { cameraUniforms, sunDirection } from "../../atmosphere/camera";
import {
  ATMOSPHERE_PHYSICS,
  CLOUD_TUNING,
  LUT_SIZES,
  type AtmosphereState,
} from "../../atmosphere/tuning";
import transmittanceShader from "../../atmosphere/transmittance-lut.wgsl";
import multiScatterShader from "../../atmosphere/multiscatter-lut.wgsl";
import skyViewShader from "../../atmosphere/sky-view-lut.wgsl";
import shapeShader from "./shape-noise.wgsl";
import detailShader from "../../atmosphere/cloud-detail-noise.wgsl";
import weatherShader from "./weather-noise.wgsl";
import curlShader from "../../atmosphere/curl-noise.wgsl";
import marchShader from "../../atmosphere/clouds-march.wgsl";
import resolveShader from "../../atmosphere/clouds-resolve.wgsl";
import presentShader from "../../atmosphere/present.wgsl";
import aerialShader from "./aerial.wgsl";
import constantsShader from "./constants.wgsl";
import skyShader from "./sky.wgsl";
import rainShader from "./rain.wgsl";
import lensShader from "./lens.wgsl";
import copyShader from "./copy.wgsl";

export type Size = readonly [number, number];
const HDR = "rgba16float";
const JITTER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (i) => [((i % 4) + 0.5) / 4 - 0.5, (Math.floor(i / 4) + 0.5) / 4 - 0.5] as const,
);
const half = (size: Size): Size => [
  Math.max(1, Math.round(size[0] / 2)),
  Math.max(1, Math.round(size[1] / 2)),
];
export const GRAPH_RESOURCES = {
  terrainTextures: 0,
  shadowMaps: 0,
  hazeHistoryTargets: 0,
  cloudShapeSize: 64,
  weatherSize: 256,
  cloudDetailSize: 32,
} as const;

/** Original atmosphere/cloud kernels, a sky-only render graph. No terrain allocation or compilation. */
export async function createSkyGraph(gpu: Gpu, output: Target, initial: AtmosphereState) {
  const owned: Texture[] = [];
  const targets: Target[] = [];
  let disposed = false;
  const own = (value: Texture) => {
    owned.push(value);
    return value;
  };
  const makeTarget = (size: Size, format: GPUTextureFormat, label: string) => {
    const value = target(gpu, { size, format, label });
    targets.push(value);
    return value;
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const t of targets) for (const color of t.colors) color.destroy();
    for (const t of owned) t.destroy();
  };
  try {
    const linear = sampler(gpu, {
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge",
    });
    const repeat = sampler(gpu, {
      minFilter: "linear",
      magFilter: "linear",
      addressModeU: "repeat",
      addressModeV: "repeat",
      addressModeW: "repeat",
    });
    const { sunAngularRadius: _radius, ...physics } = ATMOSPHERE_PHYSICS;
    const atmosphere = uniforms(gpu, {
      ...physics,
      mieScattering: [...physics.mieScattering] as [number, number, number],
      mieAbsorption: [...physics.mieAbsorption] as [number, number, number],
      sunDirection: sunDirection(initial),
    });
    const camera = uniforms(gpu, cameraUniforms(initial, output.size));
    const clouds = uniforms(gpu, cloudValues(initial));
    const update = uniforms(gpu, {
      frame: 0,
      valid: 0,
      blend: 1,
      refreshPeriod: 1,
      jitter: [0, 0] as readonly [number, number],
      size: half(output.size),
      detail: 0,
      pad0: 0,
      pad1: 0,
      pad2: 0,
    });
    const transmittance = makeTarget(LUT_SIZES.transmittance, HDR, "sky-transmittance");
    const skyView = makeTarget(LUT_SIZES.skyView, HDR, "sky-view");
    const scene = makeTarget(output.size, HDR, "sky-scene");
    const march = makeTarget(half(output.size), HDR, "cloud-march");
    const history = pingPong(gpu, ...half(output.size), { format: HDR, label: "cloud-history" });
    targets.push(history.read, history.write);
    const sky = makeTarget(output.size, "rgba8unorm", "sky-tonemapped");
    const wet = makeTarget(output.size, "rgba8unorm", "rain-scene");
    const multi = own(
      texture(gpu, {
        kind: "2d",
        size: [32, 32],
        format: HDR,
        usage: ["texture_binding", "storage_binding"],
        label: "multi-scatter",
      }),
    );
    const aerial = own(
      texture(gpu, {
        kind: "3d",
        size: LUT_SIZES.aerial,
        format: HDR,
        usage: ["texture_binding", "storage_binding"],
        label: "sky-aerial",
      }),
    );
    const shape = own(
      texture(gpu, {
        kind: "3d",
        size: [
          GRAPH_RESOURCES.cloudShapeSize,
          GRAPH_RESOURCES.cloudShapeSize,
          GRAPH_RESOURCES.cloudShapeSize,
        ],
        format: "rgba8unorm",
        usage: ["texture_binding", "storage_binding"],
        label: "cloud-shape",
      }),
    );
    const detail = own(
      texture(gpu, {
        kind: "3d",
        size: [32, 32, 32],
        format: "rgba8unorm",
        usage: ["texture_binding", "storage_binding"],
        label: "cloud-detail",
      }),
    );
    const weather = own(
      texture(gpu, {
        kind: "2d",
        size: [GRAPH_RESOURCES.weatherSize, GRAPH_RESOURCES.weatherSize],
        format: "rgba8unorm",
        usage: ["texture_binding", "storage_binding"],
        label: "cloud-weather",
      }),
    );
    const curl = own(
      texture(gpu, {
        kind: "2d",
        size: [128, 128],
        format: "rgba8unorm",
        usage: ["texture_binding", "storage_binding"],
        label: "cloud-curl",
      }),
    );
    const frameConstants = storage(gpu, 64 + 64 * 16, "read-write");
    const transPass = effect(gpu, transmittanceShader, { set: { atmosphere } });
    const multiPass = compute(gpu, multiScatterShader, {
      set: {
        atmosphere,
        transmittanceLut: transmittance,
        lutSampler: linear,
        multiScatterLut: multi,
      },
    });
    const viewPass = effect(gpu, skyViewShader, {
      set: {
        atmosphere,
        camera,
        transmittanceLut: transmittance,
        multiScatterLut: multi,
        lutSampler: linear,
      },
    });
    const aerialPass = compute(gpu, aerialShader, {
      set: {
        atmosphere,
        camera,
        transmittanceLut: transmittance,
        multiScatterLut: multi,
        lutSampler: linear,
        aerialLut: aerial,
      },
    });
    const constants = compute(gpu, constantsShader, {
      set: {
        atmosphere,
        camera,
        transmittanceLut: transmittance,
        skyViewLut: skyView,
        lutSampler: linear,
        frameConstants,
      },
    });
    const scenePass = effect(gpu, skyShader, {
      set: {
        atmosphere,
        camera,
        skyViewLut: skyView,
        transmittanceLut: transmittance,
        lutSampler: linear,
        frame: frameConstants,
      },
    });
    const cloudPass = effect(gpu, marchShader, {
      set: {
        atmosphere,
        camera,
        clouds,
        transmittanceLut: transmittance,
        aerialLut: aerial,
        shapeNoise: shape,
        detailNoise: detail,
        weatherMap: weather,
        sceneHdr: scene,
        lutSampler: linear,
        noiseSampler: repeat,
        update,
        curlNoise: curl,
        frame: frameConstants,
      },
    });
    const resolve = effect(gpu, resolveShader, {
      set: { marchColor: march, history: history.read, lutSampler: linear, update },
    });
    const present = effect(gpu, presentShader, {
      set: {
        present: { exposure: 2 ** initial.exposureEv, tonemap: 0, dither: 1, pad: 0 },
        sceneHdr: scene,
        cloudsHdr: history.write,
        linearSampler: linear,
      },
    });
    const copy = effect(gpu, copyShader, { set: { scene: sky, linearSampler: linear } });
    const rain = draw(gpu, {
      shader: rainShader,
      vertices: 6,
      blend: "alpha",
      set: {
        scene: sky,
        linearSampler: linear,
        params: { size: output.size, time: initial.time, shutter: 1 / 45 },
      },
    });
    const lens = effect(gpu, lensShader, {
      set: {
        scene: wet,
        linearSampler: linear,
        params: { size: output.size, time: initial.time, wetness: 0.14 },
      },
    });
    await Promise.all([
      transPass.compile(transmittance),
      viewPass.compile(skyView),
      scenePass.compile(scene),
      cloudPass.compile(march),
      resolve.compile(history.write),
      present.compile(sky),
      copy.compile(wet),
      rain.compile(wet),
      lens.compile(output),
    ]);
    // Cloud noise is static. No per-frame procedural noise generation.
    const shapeGroups = GRAPH_RESOURCES.cloudShapeSize / 4;
    compute(gpu, shapeShader, { set: { shapeNoise: shape } }).dispatch(
      shapeGroups,
      shapeGroups,
      shapeGroups,
    );
    compute(gpu, detailShader, { set: { detailNoise: detail } }).dispatch(8, 8, 8);
    const weatherGroups = GRAPH_RESOURCES.weatherSize / 8;
    compute(gpu, weatherShader, { set: { weatherMap: weather } }).dispatch(
      weatherGroups,
      weatherGroups,
    );
    compute(gpu, curlShader, { set: { curlNoise: curl } }).dispatch(16, 16);
    let index = 0;
    let rest = 0;
    let valid = false;
    let lightKey = "";
    let haze = NaN;
    function prepare(state: AtmosphereState) {
      if (disposed) return;
      const key = [
        state.sunElevation,
        state.sunAzimuth,
        state.haze,
        state.pitch,
        state.yaw,
        state.cloudCoverage,
        state.cloudDetail,
        state.cloudType,
        state.cloudSeed,
        ...output.size,
      ].join(",");
      clouds.set(cloudValues(state));
      rain.set({ params: { time: state.time } });
      lens.set({ params: { time: state.time } });
      present.set({ present: { exposure: 2 ** state.exposureEv } });
      if (key === lightKey) return;
      atmosphere.set({
        sunDirection: sunDirection(state),
        mieScattering: ATMOSPHERE_PHYSICS.mieScattering.map((value) => value * state.haze) as [
          number,
          number,
          number,
        ],
        mieAbsorption: ATMOSPHERE_PHYSICS.mieAbsorption.map((value) => value * state.haze) as [
          number,
          number,
          number,
        ],
      });
      camera.set(cameraUniforms(state, output.size));
      if (haze !== state.haze) {
        frame(gpu, (f) => f.pass(transmittance, transPass));
        multiPass.dispatch(32, 32);
        haze = state.haze;
      }
      frame(gpu, (f) => f.pass(skyView, viewPass));
      aerialPass.dispatch(24, 16, 8);
      constants.dispatch(1);
      lightKey = key;
      valid = false;
      rest = 0;
    }
    function render(time: number) {
      if (disposed) return;
      const fast = !valid;
      const period = fast ? 1 : 16;
      const size = history.write.size;
      const blend = fast ? 1 : Math.max(1 / (Math.floor(rest / 16) + 1), 0.1);
      update.set({
        frame: index,
        valid: valid ? 1 : 0,
        blend,
        refreshPeriod: period,
        jitter: blend < 1 ? JITTER[Math.floor(index / 16) % 16]! : [0, 0],
        size,
        detail: fast ? 0 : 1,
      });
      clouds.set({ wind: time * CLOUD_TUNING.windSpeed });
      rain.set({ params: { time } });
      lens.set({ params: { time } });
      resolve.set({ history: history.read });
      present.set({ cloudsHdr: history.write });
      frame(gpu, (f) => {
        f.pass(scene, scenePass);
        f.pass(
          {
            target: march,
            viewport: {
              width: fast ? size[0] : Math.ceil(size[0] / 4),
              height: fast ? size[1] : Math.ceil(size[1] / 4),
            },
          },
          (p) => p.draw(cloudPass),
        );
        f.pass(history.write, resolve);
        f.pass(sky, present);
        f.pass(wet, (p) => {
          p.draw(copy);
          p.draw(rain, { instances: 4200 });
        });
        f.pass(output, lens);
      });
      history.swap();
      valid = true;
      index++;
      rest++;
    }
    function resize(size: Size) {
      for (const t of [scene, sky, wet]) t.resize(size);
      for (const t of [march, history.read, history.write]) t.resize(half(size));
      cloudPass.set({ sceneHdr: scene });
      present.set({ sceneHdr: scene });
      copy.set({ scene: sky });
      rain.set({ scene: sky, params: { size } });
      lens.set({ scene: wet, params: { size } });
      lightKey = "";
      valid = false;
    }
    prepare(initial);
    return { prepare, render, resize, dispose, sky, scene, resources: GRAPH_RESOURCES };
  } catch (error) {
    dispose();
    throw error;
  }
}
function cloudValues(state: AtmosphereState) {
  return {
    bottom: CLOUD_TUNING.bottom,
    top: CLOUD_TUNING.top,
    coverage: state.cloudCoverage,
    density: CLOUD_TUNING.density,
    shapeScale: CLOUD_TUNING.shapeScale,
    detailScale: CLOUD_TUNING.detailScale,
    weatherScale: CLOUD_TUNING.weatherScale,
    wind: state.time * CLOUD_TUNING.windSpeed,
    detailStrength: CLOUD_TUNING.detailStrength * state.cloudDetail,
    groundRadius: ATMOSPHERE_PHYSICS.groundRadius,
    curlStrength: CLOUD_TUNING.curlStrength * state.cloudDetail,
    detailLodDistance: CLOUD_TUNING.detailLodDistance,
    typeBias: state.cloudType * 0.5,
    seed: state.cloudSeed,
    shadows: 0,
    pad1: 0,
  };
}
