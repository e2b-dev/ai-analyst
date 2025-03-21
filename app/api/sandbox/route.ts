import { CustomFiles } from "@/lib/types";
import Sandbox from "@e2b/code-interpreter";

const sandboxTimeout = 10 * 60 * 1000; // 10 minute in ms

export const maxDuration = 60;

export async function POST(req: Request) {
  const formData = await req.formData();
  const code = formData.get("code") as string;

  const files: CustomFiles[] = [];
  for (const [key, value] of formData.entries()) {
    if (key === "code") continue;

    if (value instanceof File) {
      const content = await value.text();
      files.push({
        name: value.name,
        content: content,
        contentType: value.type,
      });
    }
  }

  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: sandboxTimeout,
  });

  // Upload files
  for (const file of files) {
    await sandbox.files.write(file.name, file.content);
  }

  const { text, results, logs, error } = await sandbox.runCode(code);

  return new Response(
    JSON.stringify({
      text,
      results,
      logs,
      error,
    })
  );
}
