import { Xyzen } from "@/app/App";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/markdown.css";
import "@/styles/markdown.dark.css";
import "@/styles/markdown.quote.css";
import "@/styles/markdown.abstract.css";
import "@/styles/code-block.css";
import "@/styles/prose.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Xyzen />
  </StrictMode>,
);
