import { defineConfig } from "deepsec/config";

export default defineConfig({
  projects: [
    { id: "urm", root: ".." },
    // <deepsec:projects-insert-above>
  ],
});
