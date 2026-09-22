/** Clock-based art direction, not local weather or astronomical sunrise data. */
export function localSkyState(preset, now = new Date(), time = 0) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('A valid local date is required.');
  }
  // Minute-sized steps let the original cloud history converge between changes.
  const hour = now.getHours() + now.getMinutes() / 60;
  const sun = Math.sin((hour - 6) * Math.PI / 12);
  const daylight = Math.max(0, sun);
  return {
    ...preset,
    sunElevation: Math.max(-18, 55 * sun),
    sunAzimuth: (hour / 24 * 360 + 90) % 360,
    altitudeKm: 0.08,
    yaw: 0,
    // Near the zenith, avoiding a degenerate right vector at exactly 90 degrees.
    pitch: 89.9,
    exposureEv: 4.3 + (1 - daylight) * 2.0,
    haze: 2.64,
    cloudCoverage: 0.96,
    cloudDetail: 0.8,
    cloudType: -0.3,
    cloudSeed: 50,
    cloudShadows: false,
    time,
    tonemap: 'agx',
  };
}
