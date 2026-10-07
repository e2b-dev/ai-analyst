import { Sandbox } from "@e2b/code-interpreter";

export const maxDuration = 60;

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);
  const code = formData?.get("code");
  if (!formData || typeof code !== "string" || !code.trim()) {
    return Response.json(
      { error: "Python code is required." },
      { status: 400 }
    );
  }
  if (!process.env.E2B_API_KEY) {
    return Response.json(
      { error: "Configure E2B_API_KEY on the server to execute Python." },
      { status: 503 }
    );
  }

  let sandbox: Sandbox | undefined;
  try {
    sandbox = await Sandbox.create({ timeoutMs: 60_000 });
    for (const value of formData.values()) {
      if (value instanceof File) {
        // Keep uploads inside the notebook directory, even for crafted filenames.
        const name = value.name.split(/[\\/]/).pop();
        if (!name) continue;
        await sandbox.files.write(
          `/home/user/${name}`,
          new Uint8Array(await value.arrayBuffer())
        );
      }
    }
    const { results, logs, error } = await sandbox.runCode(code, {
      timeoutMs: 45_000,
    });
    return Response.json({
      results: results.map((result) => ({
        ...result.toJSON(),
        chart: result.chart,
      })),
      logs,
      error,
    });
  } catch {
    return Response.json(
      {
        error:
          "Python execution could not complete. Check E2B credentials and try again.",
      },
      { status: 502 }
    );
  } finally {
    await sandbox?.kill().catch(() => console.error("Sandbox cleanup failed"));
  }
}
