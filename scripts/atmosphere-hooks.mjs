export const STYLE = '        <link rel="stylesheet" href="/atmosphere-background.css" data-atmosphere-background />\n';
export const SCRIPT = '        <script type="module" src="/atmosphere-background.js" data-atmosphere-background></script>\n';
export const IMPORT = 'import { buildAtmosphereBackground } from "./build-atmosphere-background.mjs";\n';
export const BUILD = '    if (write) await buildAtmosphereBackground(output);\n\n';
function once(text, needle, replacement) {
  if (text.split(needle).length !== 2) throw new Error(`Expected exactly one integration anchor: ${needle.trim()}`);
  return text.replace(needle, replacement);
}
/** Pure, reversible transforms: never regenerate or restyle the portfolio UI. */
export function addAtmosphereHooks(template, builder) {
  if (template.includes('data-atmosphere-background') || builder.includes(IMPORT)) {
    throw new Error('Atmosphere hooks already exist. Refusing to insert duplicates.');
  }
  const html = once(once(template, '    </head>', STYLE + '    </head>'), '    </body>', SCRIPT + '    </body>');
  const js = IMPORT + once(builder, '    return {\n        allPage,', BUILD + '    return {\n        allPage,');
  if (html.replace(STYLE, '').replace(SCRIPT, '') !== template || js.replace(IMPORT, '').replace(BUILD, '') !== builder) {
    throw new Error('Integration unexpectedly changed existing source.');
  }
  return { template: html, builder: js };
}
