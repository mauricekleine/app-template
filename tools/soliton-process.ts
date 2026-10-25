// Shared lifecycle for HTTP acceptance and browser checks, using the real entrypoint.
export async function startSoliton() {
  const child = Bun.spawn(["bun", "src/serve.ts"], {
    env: { ...process.env, PORT: "0", NODE_ENV: "production" },
    stdout: "pipe",
    stderr: "inherit",
  });
  const reader = child.stdout.getReader();
  let output = "";
  const deadline = setTimeout(() => child.kill("SIGTERM"), 15_000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) throw new Error(`server exited before readiness: ${output}`);
      output += new TextDecoder().decode(value);
      const url = output.match(/app listening on (http:\/\/[^\s]+)/)?.[1];
      if (url)
        return {
          url,
          stop: async () => {
            child.kill("SIGTERM");
            await child.exited;
          },
        };
    }
  } catch (error) {
    child.kill("SIGTERM");
    await child.exited;
    throw error;
  } finally {
    clearTimeout(deadline);
    reader.releaseLock();
  }
}
