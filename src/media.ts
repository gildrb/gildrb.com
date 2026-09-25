/**
 * Images referenced from Markdown as `![Caption](media:<id>)`. Files live in
 * `public/images/optimized/gil-rodrigues-<id>[-<width>].<ext>`; the responsive
 * variants are discovered from the file names at build time.
 */
export type Media = {
  alt: string;
  width: number;
  height: number;
  /** Monochrome logo artwork: inset, square-cornered, inverted in light mode. */
  mark?: "center" | "start";
  /**
   * A silent looping recording, `public/videos/gil-rodrigues-<id>.mp4`; the image files of the
   * same id are its poster frame. It plays only while on screen (see `video.ts`).
   */
  video?: true;
};

export const media: Readonly<Record<string, Media>> = {
  "ben-davis-brandmark": {
    alt: "White db monogram with a central diagonal joining mirrored letterforms",
    width: 2000,
    height: 1112,
    mark: "center",
  },
  "ben-davis-site-tour": {
    alt: "Screen recording of davis7.sh: the db mark turning into the wordmark, hovering links, the Sponsors page and switching to light mode",
    width: 1080,
    height: 1036,
    video: true,
  },
  "heph-session": {
    alt: "Screen recording of Heph in the terminal answering questions about a folder of lecture notes, citing the files behind each answer",
    width: 1080,
    height: 614,
    video: true,
  },
  "local-studio-tour": {
    alt: "Screen recording of the Local Studio website: the hero, the app interface, the setup prompt for coding models and the phone screens",
    width: 1080,
    height: 1014,
    video: true,
  },
  "ben-davis-construction": {
    alt: "Ben Davis db monogram shown with construction points and the finished mark",
    width: 4096,
    height: 2304,
  },
  "ben-davis-original": {
    alt: "Ben Davis's previous db logo built from a slab-sided d and circular b",
    width: 700,
    height: 443,
    mark: "center",
  },
  "curves-letterforms": {
    alt: "Geometric CURVES glyphs arranged as a black and white letterform study",
    width: 2973,
    height: 2093,
  },
  "curves-numerals": {
    alt: "CURVES numerals with diagonal forms and a slashed zero",
    width: 2973,
    height: 2000,
  },
  "curves-punctuation": {
    alt: "CURVES punctuation math signs currency symbols and accented characters",
    width: 2973,
    height: 3100,
  },
  "curves-specimen": {
    alt: "CURVES type specimen showing the display face in a large editorial setting",
    width: 2973,
    height: 1583,
  },
  "curves-uppercase": {
    alt: "Full unicase CURVES alphabet showing repeated geometric letter construction",
    width: 2973,
    height: 4010,
  },
  "curves-wordmark": {
    alt: "CURVES wordmark set in the geometric display typeface",
    width: 2973,
    height: 850,
  },
  "filen-app-icon": {
    alt: "Filen app icon using a dimensional rendering of the identity mark",
    width: 3940,
    height: 2260,
  },
  "filen-brand-system-board": {
    alt: "Filen brand system board with logo, copy, icon, and typography",
    width: 1600,
    height: 999,
  },
  "filen-exploration-board": {
    alt: "Filen exploration board containing sketches, rejected symbols, wordmarks, and refined identity directions",
    width: 1280,
    height: 956,
  },
  "filen-identity-system-overview": {
    alt: "Filen red identity exploration showing the logo, typography, app icon, and campaign executions",
    width: 1600,
    height: 1444,
  },
  "filen-light-lockup": {
    alt: "Metallic Filen lockup across vertical light panels",
    width: 1600,
    height: 921,
  },
  "filen-light-study": {
    alt: "Monochrome Filen light study with soft beams emerging from the lower-left corner",
    width: 1600,
    height: 1600,
  },
  "filen-logo-scale": {
    alt: "Filen mark tested at four decreasing sizes",
    width: 3940,
    height: 2260,
  },
  "filen-logo-texture": {
    alt: "Filen mark over a streaked monochrome visual texture",
    width: 3940,
    height: 2260,
  },
  "filen-pangolin-exploration": {
    alt: "Filen identity exploration with pangolin and architectural references",
    width: 1600,
    height: 766,
  },
  "filen-pattern-exploration": {
    alt: "Filen pattern explorations built from repeated protective scales",
    width: 1600,
    height: 611,
  },
  "filen-storage-message": {
    alt: "Campaign graphic reading Storage that earns nothing from knowing you",
    width: 3940,
    height: 2260,
  },
  "filen-wordmark": {
    alt: "Final Filen mark and wordmark in white on black",
    width: 3940,
    height: 2260,
  },
  "filen-zero-knowledge-campaign": {
    alt: "Campaign graphic reading Zero knowledge. Total control.",
    width: 3940,
    height: 2260,
  },
  "heph-interface": {
    alt: "Heph terminal interface showing a cited answer, evidence panel, and command menu",
    width: 1600,
    height: 1004,
  },
  "heph-lockup": { alt: "Heph symbol and wordmark", width: 3023, height: 860, mark: "start" },
  "heph-typeface-early": {
    alt: "Early Heph typeface drawing in Glyphs with the lowercase g selected",
    width: 1600,
    height: 909,
  },
  "heph-typeface-refinement": {
    alt: "Continued Heph typeface drawing in Glyphs with lowercase o curves beside a large y",
    width: 1600,
    height: 909,
  },
  "ml7-logo-system": {
    alt: "mL7 logo with black lettering and an orange directional stroke on white",
    width: 3473,
    height: 2263,
  },
  "n0thing-export-folder": {
    alt: "Windows Explorer showing AI and PSD folders beside six n0thing wordmark PNG exports",
    width: 951,
    height: 304,
  },
  "n0thing-pixel-variations": {
    alt: "Black, white, and red n0thing pixel wordmark variations",
    width: 1600,
    height: 1007,
  },
  "n0thing-typewriter-direction": {
    alt: "Typewriter-inspired n0thing and Jordan Gilbert wordmark",
    width: 1600,
    height: 982,
  },
  "n0thing-wordmark-animation": {
    alt: "Animated medium-gray n0thing pixel wordmark on black with a blinking underscore",
    width: 1280,
    height: 720,
  },
  "t3-before-after": {
    alt: "T3 logomark before and after comparison showing the final refined joint and terminals",
    width: 3446,
    height: 2520,
  },
  "t3-canvas-color": {
    alt: "T3 logomark color passes arranged across the exploration canvas",
    width: 1200,
    height: 834,
  },
  "t3-canvas-overview": {
    alt: "Tall T3 exploration canvas filled with logomark studies and rejected directions",
    width: 540,
    height: 1199,
  },
  "t3-canvas-sketches": {
    alt: "T3 logomark sketch passes arranged across the exploration canvas",
    width: 1200,
    height: 834,
  },
  "t3-code-construction": {
    alt: "T3 Code wordmark with diagonal construction guides across the T3 and C",
    width: 1600,
    height: 900,
  },
  "t3-code-explorations": {
    alt: "Tall design canvas of T3 marks and T3 Code wordmark explorations",
    width: 1304,
    height: 1880,
  },
  "t3-code-outline": {
    alt: "T3 Code wordmark above a larger outlined version on black",
    width: 1600,
    height: 900,
  },
  "t3-code-scale": {
    alt: "White T3 Code wordmark shown at five decreasing sizes on black",
    width: 1600,
    height: 900,
  },
  "t3-color-tests": {
    alt: "T3 pink and monochrome colorway tests for the logomark",
    width: 1199,
    height: 899,
  },
  "t3-connected-mark": {
    alt: "White connected lowercase t and 3 logomark on a dark canvas",
    width: 1724,
    height: 1200,
  },
  "t3-feedback-angled-3": {
    alt: "Angled T3 3 and the verdict on its direction",
    width: 1200,
    height: 48,
  },
  "t3-feedback-board": {
    alt: "T3 application board posted for feedback in the T3 Discord",
    width: 1200,
    height: 886,
  },
  "t3-feedback-curves": {
    alt: "T3 curve comparison and feedback on the smoothed version",
    width: 1200,
    height: 1266,
  },
  "t3-feedback-frames": {
    alt: "Nine T3 logo frames and the Discord replies they drew",
    width: 1200,
    height: 1127,
  },
  "t3-feedback-repainted": {
    alt: "Repainted T3 board with feedback on its weight and direction",
    width: 1200,
    height: 815,
  },
  "t3-feedback-spacing": {
    alt: "T3 Discord feedback on the spacing between the logomark glyphs",
    width: 1200,
    height: 851,
  },
  "t3-feedback-thinner": {
    alt: "Thinner T3 mark test and feedback on the direction",
    width: 1200,
    height: 382,
  },
  "t3-ghost-grid": {
    alt: "Ghosted T3 comparison grid showing overlapping logomark proportions",
    width: 1200,
    height: 744,
  },
  "t3-mark": {
    alt: "T3 logomark exploration shown as a compact black and white symbol",
    width: 1200,
    height: 1200,
  },
  "t3-render": {
    alt: "T3 logomark rendered in a light application setting",
    width: 1200,
    height: 675,
  },
  "t3-system-board": {
    alt: "T3 identity system board with logotypes, icons, favicons, and clear-space lockup",
    width: 2048,
    height: 1853,
  },
  "t3-weight-tests": {
    alt: "T3 logomark weight and angle tests comparing heavier and lighter constructions",
    width: 1200,
    height: 642,
  },
};
