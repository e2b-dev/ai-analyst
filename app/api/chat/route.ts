import {
  getModelClient,
  getModelSettings,
  modelConfigSchema,
  providerKeyNames,
} from "@/lib/model";
import { providerErrorMessage } from "@/lib/api-error";
import modelsList from "@/lib/models.json";
import { toPrompt } from "@/lib/prompt";
import { z } from "zod";
import {
  APICallError,
  streamText,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
  validateUIMessages,
} from "ai";

export const maxDuration = 60;

const requestSchema = z.object({
  messages: z.array(z.unknown()).min(1),
  data: z.object({
    files: z.array(
      z.object({
        name: z.string(),
        contentType: z.string(),
        content: z.string(),
      })
    ),
    model: z.object({ id: z.string() }),
    config: modelConfigSchema,
  }),
});

export function GET() {
  const availableModels = modelsList.models.filter((model) =>
    Boolean(
      process.env[
        providerKeyNames[model.providerId as keyof typeof providerKeyNames]
      ]
    )
  );
  return Response.json({
    defaultModel: availableModels[0]?.id,
    configuredProviders: [
      ...new Set(availableModels.map((model) => model.providerId)),
    ],
  });
}

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return new Response("Invalid chat request or model settings.", {
      status: 400,
    });
  }
  const { messages, data } = body.data;
  const model = modelsList.models.find((entry) => entry.id === data.model.id);
  if (!model) return new Response("Select a supported model.", { status: 400 });
  if (data.config.baseURL && !data.config.apiKey) {
    return new Response(
      "A custom base URL requires your own API key in settings.",
      { status: 400 }
    );
  }
  const keyName =
    providerKeyNames[model.providerId as keyof typeof providerKeyNames];
  if (!data.config.apiKey && !process.env[keyName]) {
    return new Response(
      `Add an API key in settings or configure ${keyName} on the server.`,
      { status: 503 }
    );
  }

  let validatedMessages;
  try {
    validatedMessages = await validateUIMessages({ messages });
  } catch {
    return new Response("Invalid chat messages.", { status: 400 });
  }

  try {
    const result = streamText({
      instructions: toPrompt(data),
      model: getModelClient(model, data.config),
      messages: await convertToModelMessages(validatedMessages),
      ...getModelSettings(model, data.config),
      abortSignal: req.signal,
      onError: ({ error }) =>
        console.error("Model request failed", {
          provider: model.providerId,
          status: APICallError.isInstance(error) ? error.statusCode : undefined,
        }),
    });
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        sendReasoning: false,
        onError: providerErrorMessage,
      }),
    });
  } catch (error) {
    return new Response(providerErrorMessage(error), { status: 502 });
  }
}
