// import { z } from "zod";
// import { Sandbox } from "@e2b/code-interpreter";
import {
  getModelClient,
  getModelParams,
  LLMModel,
  LLMModelConfig,
  resolveModel,
} from "@/lib/model";
import { toPrompt } from "@/lib/prompt";
import { CustomFiles } from "@/lib/types";
import {
  streamText,
  convertToCoreMessages,
  Message,
  LanguageModelV1,
} from "ai";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const {
    messages,
    data,
  }: {
    messages: Message[];
    data: { files: CustomFiles[]; model: LLMModel; config: LLMModelConfig };
  } = await req.json();

  const llm = resolveModel(data?.model?.id);
  if (!llm) {
    return new Response("Unsupported model", { status: 400 });
  }

  // Filter out tool invocations
  const filteredMessages = messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: undefined,
      };
    }
    return message;
  });

  const modelClient = getModelClient(llm, data.config);

  const result = await streamText({
    system: toPrompt(data),
    model: modelClient as LanguageModelV1,
    messages: convertToCoreMessages(filteredMessages),
    ...getModelParams(data.config),
    // If the provider supports tooling, uncomment below
    // tools: {
    // runCode: {
    //   description:
    //     "Execute python code in a Jupyter notebook cell and return result",
    //   parameters: z.object({
    //     code: z
    //       .string()
    //       .describe("The python code to execute in a single cell"),
    //   }),
    //   execute: async ({ code }) => {
    //     // Create a sandbox, execute LLM-generated code, and return the result
    //     console.log("Executing code", code);
    //     const sandbox = await Sandbox.create();

    //     // Upload files
    //     for (const file of data.files) {
    //       await sandbox.files.write(file.name, atob(file.base64));
    //     }
    //     const { text, results, logs, error } = await sandbox.runCode(code);
    //     console.log(text, results, logs, error);

    //     return {
    //       text,
    //       results,
    //       logs,
    //       error,
    //     };
    //   },
    // },
    // },
  });

  return result.toDataStreamResponse();
}
