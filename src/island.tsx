import * as stylex from "@stylexjs/stylex";
import type { FunctionComponent } from "preact";
import type { Converter } from "./islands/archetypon.tsx";
import type { Email } from "./islands/email.tsx";
import type { Terminal } from "./islands/heph.tsx";
import type { Portfolio } from "./islands/portfolio.tsx";
import type { ThemeToggle } from "./islands/theme.tsx";

/** Components that `client.ts` hydrates in the browser; everything else stays static HTML. */
export type Islands = {
  theme: typeof ThemeToggle;
  email: typeof Email;
  portfolio: typeof Portfolio;
  heph: typeof Terminal;
  archetypon: typeof Converter;
};

const styles = stylex.create({ island: { display: "contents" } });

/** Server-renders an island and records its props, so hydration renders exactly the same tree. */
export function Island<Props extends object>({
  name,
  component: Render,
  props,
}: {
  name: keyof Islands;
  component: FunctionComponent<Props>;
  props: Props;
}) {
  return (
    <div {...stylex.props(styles.island)} data-island={name} data-props={JSON.stringify(props)}>
      <Render {...props} />
    </div>
  );
}
