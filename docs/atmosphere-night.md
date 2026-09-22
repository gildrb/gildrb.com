# After-dark lighting

The original example is a solar atmosphere, not a lunar illumination or airglow model. A first full-day regression run correctly rejected all-black evening pixels with the sun far below the horizon.

The adapter therefore holds a dim, minus-two-degree twilight lighting floor after dusk. This is deliberate art direction for an imagined night sky, not an astronomical claim. Exposure and azimuth still follow local time. Upstream shader files and the nonblank render assertion were not modified to hide the problem.

The native WebGPU checks render noon, evening and midnight separately. Real browser/device validation remains separate from those native pixel tests.
