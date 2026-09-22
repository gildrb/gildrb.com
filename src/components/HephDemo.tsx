import { useEffect, useRef, useState } from "preact/hooks";
import { materials, overviewAnswers, followUpAnswers } from "../content/heph";
import "../styles/heph.css";

type Part = string | { evidenceId: string };
interface Line {
  parts: readonly Part[];
  className?: string;
}
const overview = overviewAnswers[0]!;
const sources = materials.map((item) => item.sourceLabel).join("; ");
const initial: readonly Line[] = [
  { parts: ["What are these materials about?"], className: "heph-demo-prompt" },
  {
    parts: ["armory: classics; materials: 4 enabled book files."],
    className: "muted materials-summary",
  },
  { parts: overview },
  { parts: [`materials: ${sources}. Details: /evidence.`], className: "sources" },
];
/** Deterministic, local demonstration. Its transcript/evidence state belongs to this component. */
export function HephDemo() {
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<readonly Line[]>(initial);
  const [selected, setSelected] = useState("E1");
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const transcript = useRef<HTMLDivElement>(null);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  useEffect(() => {
    const node = transcript.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines]);
  const append = (line: Line) => setLines((previous) => [...previous.slice(-80), line]);
  function evidence(id: string) {
    const item = materials.find((material) => material.id === id);
    if (!item) {
      append({ parts: ["Valid evidence ids: E1, E2, E3, E4."], className: "muted" });
      return;
    }
    setSelected(id);
    append({ parts: [`OPEN ${item.title}`], className: "heph-demo-response" });
    append({ parts: [item.detail], className: "heph-demo-response" });
  }
  function submit(event: Event) {
    event.preventDefault();
    const prompt = query.trim();
    if (!prompt || running) return;
    setQuery("");
    append({ parts: [prompt], className: "heph-demo-prompt" });
    if (/^\/evidence\b/i.test(prompt)) {
      evidence(prompt.match(/\bE[1-4]\b/i)?.[0].toUpperCase() ?? selected);
      return;
    }
    const item = materials.find((material) =>
      material.keywords.some((word) => prompt.toLowerCase().includes(word)),
    );
    const wantsSources = /sources?|citations?|files?|^\/materials\b/i.test(prompt);
    const chosen = item && !wantsSources ? [item] : materials;
    const answer: readonly Part[] = wantsSources
      ? chosen.flatMap((material) => [
          material.sourceLabel + " ",
          { evidenceId: material.id },
          ". ",
        ])
      : (item?.answers[0] ?? overview);
    const steps: Line[] = [
      { parts: ["Reading enabled materials from classics."], className: "muted" },
      ...chosen.map((material) => ({
        parts: [`Retrieved ${material.id} from ${material.sourceRef}: ${material.excerpt}`],
        className: "muted",
      })),
      { parts: answer, className: "heph-demo-response" },
      { parts: followUpAnswers[0]!, className: "heph-demo-response" },
      {
        parts: [
          `materials: ${chosen.map((material) => material.sourceLabel).join("; ")}. Details: /evidence.`,
        ],
        className: "sources",
      },
    ];
    clear();
    setRunning(true);
    const delay = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 150;
    steps.forEach((line, index) =>
      timers.current.push(
        setTimeout(
          () => {
            append(line);
            if (index === steps.length - 1) setRunning(false);
          },
          delay * (index + 1),
        ),
      ),
    );
  }
  return (
    <div
      class="heph-demo case-heph-demo"
      aria-label="Interactive Heph demonstration"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          clear();
          setRunning(false);
        }
        if (event.ctrlKey && event.key === "g") {
          event.preventDefault();
          evidence(selected);
        }
      }}
    >
      <div class="heph-demo-frame">
        <a class="heph-demo-close-link" href="/" aria-label="Return to the portfolio" />
        <div class="heph-demo-shell">
          <div class="heph-demo-titlebar" aria-hidden="true">
            <span class="heph-demo-window-controls">
              <span class="heph-demo-window-control close" />
              <span class="heph-demo-window-control minimize" />
              <span class="heph-demo-window-control zoom" />
            </span>
          </div>
          <div class="heph-demo-terminal">
            <div class="heph-demo-status">
              <strong>Heph</strong>
              <span>
                ARMORY <b>classics</b>
              </span>
              <span>
                MODEL <b>gpt-5.5</b>
              </span>
              <span data-heph-demo-status-optional>
                REASONING <b>low</b>
              </span>
            </div>
            <div class="heph-demo-body">
              <div class="heph-demo-transcript">
                <div
                  class="heph-demo-output"
                  ref={transcript}
                  role="log"
                  aria-label="Simulated transcript"
                >
                  <div class="heph-demo-output-rail">
                    {lines.map((line, index) => (
                      <p class={`heph-demo-line ${line.className ?? ""}`} key={index}>
                        {line.parts.map((part, partIndex) =>
                          typeof part === "string" ? (
                            part
                          ) : (
                            <button
                              key={partIndex}
                              type="button"
                              class="heph-demo-citation-button"
                              onClick={() => evidence(part.evidenceId)}
                            >
                              [{part.evidenceId}]
                            </button>
                          ),
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <aside class="heph-demo-evidence" aria-label="Demo scope and evidence materials">
                <p class="heph-demo-evidence-open">
                  EVIDENCE <b>ctrl+g</b>
                </p>
                <p class="heph-demo-scope-heading">
                  SCOPE <b>4/4</b>
                </p>
                <p class="heph-demo-evidence-meta">
                  EXCERPTS <b>4</b>
                </p>
                <div class="heph-demo-evidence-list">
                  {materials.map((item) => (
                    <button
                      class={`heph-demo-evidence-item ${selected === item.id ? "is-active" : ""}`}
                      key={item.id}
                      type="button"
                      aria-pressed={selected === item.id}
                      onClick={() => evidence(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </aside>
            </div>
            <form
              class={`heph-demo-composer ${query ? "" : "is-empty"} ${running ? "is-running" : ""}`}
              aria-label="Ask the simulated Heph demo"
              onSubmit={submit}
            >
              <span class="heph-demo-composer-label" aria-hidden="true">
                <span class="heph-demo-composer-arrow">→</span>
              </span>
              <input
                class="heph-demo-input"
                aria-label="Heph question"
                type="text"
                autoComplete="off"
                spellcheck={false}
                value={query}
                readOnly={running}
                onInput={(event) => setQuery(event.currentTarget.value)}
                placeholder="Ask Heph about these materials"
              />
              <button
                class="heph-demo-submit"
                type="submit"
                disabled={running}
                aria-label="Submit Heph prompt"
              >
                <span aria-hidden="true">↩</span>
              </button>
            </form>
            <div class="heph-demo-command-row" aria-hidden="true">
              <span>
                {running ? "STOP" : "ARMORY"} <b>{running ? "esc" : "ctrl+a"}</b>
              </span>
              <span>
                MATERIALS <b>ctrl+o</b>
              </span>
              <span data-heph-demo-command-optional>
                COMMANDS <b>ctrl+p</b>
              </span>
            </div>
          </div>
        </div>
      </div>
      <p class="sr-only">
        This demonstration uses local excerpts and scripted responses, not a live model.
      </p>
    </div>
  );
}
