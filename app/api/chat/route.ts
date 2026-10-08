import {
  getModelClient,
  ProviderConfigurationError,
  resolveModel,
} from "@/lib/model";
import { getModelParams } from "@/lib/model-config";
import { chatRequestSchema } from "@/lib/chat-request";
import { toPrompt } from "@/lib/prompt";
import { streamText, type LanguageModelV1 } from "ai";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => undefined);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Invalid chat request", { status: 400 });
  }
  const { messages, data } = parsed.data;
  const model = resolveModel(data.model.id);
  if (
    !model || model.providerId !== data.model.providerId ||
    (data.config.model !== undefined && data.config.model !== model.id)
  ) {
    return new Response("Unsupported model", { status: 400 });
  }

  try {
    const modelClient = getModelClient(model, data.config);
    const result = await streamText({
      system: toPrompt(data),
      model: modelClient as LanguageModelV1,
      // Sandbox results are rendered in the UI, not sent back to the model.
      messages: messages.map(({ role, content }) => ({ role, content })),
      ...getModelParams(data.config),
    });
    return result.toDataStreamResponse();
  } catch (error) {
    if (error instanceof ProviderConfigurationError) {
      return new Response(error.message, { status: 503 });
    }
    return new Response("Unable to complete chat request", { status: 500 });
  }
}
