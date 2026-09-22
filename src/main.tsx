import { hydrate, render } from "preact";
import { App } from "./app";
import { loadPage } from "./lib/page";
import "./styles/site.css";
const root = document.getElementById("app");
if (!root) throw new Error("Missing application root");
void loadPage(location.pathname)
  .then((page) => {
    if (root.hasChildNodes()) hydrate(<App {...page} />, root);
    else render(<App {...page} />, root);
  })
  .catch((error) => console.error("Could not initialize portfolio", error));
