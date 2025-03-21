// import { z } from "zod";
// import { Sandbox } from "@e2b/code-interpreter";
import { getModelClient, LLMModel, LLMModelConfig } from "@/lib/model";
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
  const contentType = req.headers.get("content-type") || "";

  let messages: Message[];
  let data: { files: CustomFiles[]; model: LLMModel; config: LLMModelConfig };

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();

    messages = JSON.parse(formData.get("messages") as string);
    const modelData = JSON.parse(formData.get("data") as string);

    const files: CustomFiles[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const content = await value.text();
        files.push({
          name: value.name,
          content: content,
          contentType: value.type,
        });
      }
    }

    data = {
      ...modelData,
      files: files,
    };
  } else {
    const jsonData = await req.json();
    messages = jsonData.messages;
    data = jsonData.data;
  }

  const filteredMessages = messages.map((message) => {
    if (message.toolInvocations) {
      return {
        ...message,
        toolInvocations: undefined,
      };
    }
    return message;
  });

  const { model, apiKey, ...modelParams } = data.config;
  const modelClient = getModelClient(data.model, data.config);

  const result = await streamText({
    system: toPrompt(data),
    model: modelClient as LanguageModelV1,
    messages: convertToCoreMessages(filteredMessages),
    ...modelParams,
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
