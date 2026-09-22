import type { AtmosphereState } from "../../atmosphere/tuning";
/** Clock-based art direction, not local weather or astronomical sunrise data. */
export function localSkyState(
  preset: Partial<AtmosphereState> = {},
  now = new Date(),
  time = 0,
): AtmosphereState {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError("A valid local date is required.");
  }
  // Minute-sized steps let the original cloud history converge between changes.
  // Keep the official physically based atmosphere, but art-direct a readable
  // rainy sky: enough cloud separation to see volume, without exposing terrain.
  const hour = now.getHours() + now.getMinutes() / 60;
  const sun = Math.sin(((hour - 6) * Math.PI) / 12);
  const daylight = Math.max(0, sun);
  return {
    ...preset,
    sunElevation: Math.max(-3.5, 55 * sun),
    sunAzimuth: ((hour / 24) * 360 + 90) % 360,
    altitudeKm: 0.08,
    yaw: 0,
    // A fixed upward view with enough angle to preserve visible cloud depth; no horizon or terrain enters the frame.
    pitch: 78,
    exposureEv: 3.2 + (1 - daylight) * 1.2 + Math.max(0, -sun) * 2.0,
    haze: 3.0,
    cloudCoverage: 0.58,
    cloudDetail: 1.2,
    cloudType: 0.75,
    cloudSeed: 0,
    cloudShadows: false,
    time,
    tonemap: "agx",
  };
}
