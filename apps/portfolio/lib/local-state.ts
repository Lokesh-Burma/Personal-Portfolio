import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
export function localDemoEnabled() {
  return process.env.PLATFORM_LOCAL_DEMO === "true" && !process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_HTTP_ENDPOINT;
}
let sequence = Promise.resolve();
export async function localState<T>(action: (state: Record<string, any>) => T | Promise<T>): Promise<T> {
  if (!localDemoEnabled()) throw new Error("Local demo storage is unavailable.");
  const run = sequence.then(async () => {
    const directory = process.env.PLATFORM_DATA_DIR || ".local-platform";
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const path = join(directory, "state.json");
    let state: Record<string, any> = {};
    try { state = JSON.parse(await readFile(path, "utf8")); } catch (error: any) { if (error.code !== "ENOENT") throw error; }
    const result = await action(state);
    await writeFile(path + ".tmp", JSON.stringify(state), { mode: 0o600 });
    await rename(path + ".tmp", path);
    return structuredClone(result);
  });
  sequence = run.then(() => undefined, () => undefined);
  return run;
}
