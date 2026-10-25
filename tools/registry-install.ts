import { readFile, writeFile } from "node:fs/promises";

const manifest = (await Bun.file("template.json").json()) as { registry: { items: string[] } };
const packageBefore = await readFile("package.json", "utf8");
const componentsBefore = await readFile("components.json", "utf8");
try {
  // The committed app resolves a snapshot. Only this explicit canary/install uses live.
  const components = JSON.parse(componentsBefore);
  components.registries["@mk"] = "https://superthread.mauricekleine.com/r/{name}.json";
  await writeFile("components.json", JSON.stringify(components, null, 2) + "\n");
  const command = Bun.spawn(["bun", "--bun", "shadcn", "add", ...manifest.registry.items, "--yes", "--overwrite"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await command.exited;
  if (code) throw new Error(`registry install exited ${code}`);
  // shadcn adds caret ranges. Preserve the template's tested shared pins while
  // retaining any newly introduced dependency so the canary can exercise it.
  const original = JSON.parse(packageBefore);
  const installed = await Bun.file("package.json").json();
  for (const group of ["dependencies", "devDependencies"]) {
    installed[group] = { ...installed[group], ...original[group] };
  }
  await writeFile("package.json", JSON.stringify(installed, null, 2) + "\n");
} finally {
  await writeFile("components.json", componentsBefore);
}
const install = Bun.spawn(["bun", "install"], { stdout: "inherit", stderr: "inherit" });
if (await install.exited) process.exit(1);
