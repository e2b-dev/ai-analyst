"use client";

import { RepoBanner } from "@/components/repo-banner";
import { useChat } from "ai/react";
import { MessageComponent } from "@/components/message";
import { FileText, PlayIcon, PlusIcon, X } from "lucide-react";
import { extractCodeFromText } from "@/lib/code";
import Logo from "@/components/logo";
import { useEffect, useState } from "react";
import {
  getRequestModelConfig,
  migrateStoredModelSettings,
  type LLMModel,
  type LLMModelConfig,
  type LLMModelSettings,
} from "@/lib/model-config";
import { LLMPicker } from "@/components/llm-picker";
import { LLMSettings } from "@/components/llm-settings";
import { useLocalStorage } from "usehooks-ts";
import { toUploadableFile } from "@/lib/utils";

export default function Analyst({ models }: { models: LLMModel[] }) {
  const [files, setFiles] = useState<File[]>([]);

  const exampleMessages = [
    "Person's age born in 2001 as line",
    "Analyze letters in word strawberry",
    "Plot a chart of the last 10 years of the S&P 500",
  ];

  const [isLoading, setIsLoading] = useState(false);
  const defaultModelId = "claude-sonnet-4-5-20250929";
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelSettings>(
    "languageModel",
    {
      model: defaultModelId,
    },
    {
      initializeWithValue: false,
      deserializer: (value) => migrateStoredModelSettings(JSON.parse(value)),
    }
  );

  // A model removed from models.json can still be saved in localStorage. Fall
  // back to the default only without a saved key, which may belong to the
  // removed model's provider.
  const currentModel =
    models.find((model) => model.id === languageModel.model) ??
    (languageModel.apiKey === undefined
      ? models.find((model) => model.id === defaultModelId)
      : undefined);

  function handleLanguageModelChange(e: LLMModelConfig) {
    setLanguageModel({
      ...languageModel,
      ...e,
      needsCredentialReview: e.apiKey?.trim()
        ? undefined
        : languageModel.needsCredentialReview,
    });
  }

  useEffect(() => {
    // Remove the obsolete endpoint and key from storage, preserving the pause.
    setLanguageModel(migrateStoredModelSettings);
  }, [setLanguageModel]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    setInput,
  } = useChat({
    // Fake tool call
    onFinish: async (message) => {
      const code = extractCodeFromText(message.content);
      if (code) {
        const formData = new FormData();
        formData.append("code", code);

        for (const file of files) {
          formData.append(`file_${file.name}`, file);
        }

        const response = await fetch("/api/sandbox", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        // add tool call result to the last message
        message.toolInvocations = [
          {
            state: "result",
            toolCallId: message.id,
            toolName: "runCode",
            args: code,
            result,
          },
        ];

        console.log("Result:", result);
        setFiles([]);
        setMessages((prev) => {
          // replace last message with the new message
          return [...prev.slice(0, -1), message];
        });
      }

      setIsLoading(false);
    },
  });

  useEffect(() => {
    const messagesElement = document.getElementById("messages");
    if (messagesElement) {
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }
  }, [messages]);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
  }

  function handleFileRemove(file: File) {
    setFiles((prev) => prev.filter((f) => f !== file));
  }

  async function customSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!currentModel) throw Error("No model is selected.");
    const config = getRequestModelConfig({
      ...languageModel,
      model: currentModel.id,
    });
    if (!config) return;
    setIsLoading(true);
    handleSubmit(e, {
      data: {
        files: await Promise.all(
          files.map((f) => toUploadableFile(f, { cutOff: 5 }))
        ),
        model: currentModel,
        config,
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <nav className="flex gap-0.5 justify-between items-center px-4 py-3 top-0 fixed left-0 right-0 bg-white/80 backdrop-blur-sm shadow-sm z-10">
        <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
          <Logo className="h-[15px] w-auto shrink-0" />
          <h1 className="text-md font-medium whitespace-nowrap">
            Analyst by{" "}
            <a
              href="https://e2b.dev"
              target="_blank"
              className="underline decoration-[rgba(229,123,0,.3)] decoration-2 text-[#ff8800]"
            >
              E2B
            </a>
          </h1>
          <RepoBanner />
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto pt-14" id="messages">
        {messages.map((m) => (
          <MessageComponent key={m.id} message={m} />
        ))}
      </div>

      <div className="mb-4 mx-4">
        <div className="mx-auto w-full max-w-2xl flex flex-col gap-2">
          <div className="flex gap-2 overflow-x-auto">
            {messages.length === 0 && files.length === 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 pr-4 [mask-image:linear-gradient(to_right,transparent,black_0%,black_95%,transparent)]">
                {exampleMessages.map((msg) => (
                  <button
                    key={msg}
                    className="flex items-center gap-2 p-1.5 border rounded-lg text-gray-800"
                    onClick={() => setInput(msg)}
                  >
                    <span className="text-sm truncate">{msg}</span>
                  </button>
                ))}
              </div>
            )}
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-2 p-1.5 border rounded-lg bg-slate-100 text-gray-800"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleFileRemove(file)}
                  className="cursor-pointer"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-between items-end">
            <div className="flex gap-2">
              <LLMPicker
                models={models}
                languageModel={{ ...languageModel, model: currentModel?.id }}
                onLanguageModelChange={handleLanguageModelChange}
              />
              <LLMSettings
                apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
                languageModel={languageModel}
                onLanguageModelChange={handleLanguageModelChange}
              />
            </div>
            {isLoading && (
              <span className="text-xs text-gray-700">Loading…</span>
            )}
          </div>
          {languageModel.needsCredentialReview && (
            <div role="alert" className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-gray-800">
              <p>Your saved custom endpoint and its API key were removed.</p>
              <p className="mt-1">
                {!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT
                  ? "Enter a new key for the selected provider in settings, or choose the app’s default credentials."
                  : "Choose the app’s default credentials to continue."}
              </p>
              <button
                type="button"
                className="mt-2 rounded-md border border-orange-300 bg-white px-3 py-1.5 font-medium"
                onClick={() =>
                  setLanguageModel({
                    ...languageModel,
                    apiKey: undefined,
                    needsCredentialReview: undefined,
                  })
                }
              >
                Use app credentials
              </button>
            </div>
          )}
          <form
            onSubmit={customSubmit}
            className="flex border p-2 border-1.5 border-border rounded-xl overflow-hidden shadow-sm"
          >
            <input
              type="file"
              id="multimodal"
              name="multimodal"
              accept=".txt,.csv,.json,.md,.py"
              multiple={true}
              className="hidden"
              onChange={handleFileInput}
            />
            <button
              type="button"
              className="border p-1.5 rounded-lg hover:bg-slate-200 text-slate-800"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("multimodal")?.click();
              }}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            <input
              autoFocus
              required
              className="w-full px-2 outline-none"
              value={input}
              placeholder="Enter your prompt..."
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={languageModel.needsCredentialReview || !currentModel}
              aria-label="Send message"
              className="bg-orange-500 text-white p-1.5 rounded-lg hover:bg-orange-500/80 disabled:opacity-50"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
