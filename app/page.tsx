"use client";

import { RepoBanner } from "@/components/repo-banner";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { SandboxResult } from "@/lib/types";
import { MessageComponent } from "@/components/message";
import { FileText, PlayIcon, PlusIcon, X } from "lucide-react";
import { extractCodeFromText } from "@/lib/code";
import Logo from "@/components/logo";
import { useEffect, useState } from "react";
import modelsList from "@/lib/models.json";
import { migrateModelConfig } from "@/lib/model-selection";
import { LLMModelConfig } from "@/lib/model";
import { LLMPicker } from "@/components/llm-picker";
import { LLMSettings } from "@/components/llm-settings";
import { useLocalStorage } from "usehooks-ts";
import { toUploadableFile } from "@/lib/utils";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);

  const exampleMessages = [
    "Person's age born in 2001 as line",
    "Analyze letters in word strawberry",
    "Plot a chart of the last 10 years of the S&P 500",
  ];

  const [input, setInput] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string>();
  const [results, setResults] = useState<Record<string, SandboxResult>>({});
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    "languageModel",
    {
      model: "accounts/fireworks/models/deepseek-v4p1-flash",
    }
  );

  const currentModel =
    modelsList.models.find((model) => model.id === languageModel.model) ??
    modelsList.models[0];

  useEffect(() => {
    void fetch("/api/chat")
      .then((response) => response.json())
      .then((setup) => {
        if (!setup.defaultModel) return;
        setLanguageModel((previous) => {
          const selected = modelsList.models.find(
            (model) => model.id === previous.model
          );
          if (
            previous.apiKey ||
            (selected &&
              setup.configuredProviders.includes(selected.providerId))
          )
            return previous;
          return { model: setup.defaultModel, maxTokens: previous.maxTokens };
        });
      })
      .catch(() => {});
  }, [setLanguageModel]);

  useEffect(() => {
    if (!modelsList.models.some((model) => model.id === languageModel.model)) {
      setLanguageModel((previous) =>
        migrateModelConfig(modelsList.models, previous)
      );
    }
  }, [languageModel.model, setLanguageModel]);

  function handleLanguageModelChange(e: LLMModelConfig) {
    const selected = modelsList.models.find((model) => model.id === e.model);
    if (selected && selected.providerId !== currentModel.providerId) {
      setLanguageModel({
        model: selected.id,
        maxTokens: languageModel.maxTokens,
      });
      return;
    }
    setLanguageModel({ ...languageModel, ...e });
  }

  const { messages, sendMessage, regenerate, status, error, stop } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: async ({ message, isAbort, isDisconnect, isError }) => {
      if (isAbort || isDisconnect || isError) return;
      const content = message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
      const code = extractCodeFromText(content);
      if (!code) {
        setExecutionError(
          "The model did not return a Python code block. Try again."
        );
        return;
      }
      setIsExecuting(true);
      try {
        const formData = new FormData();
        formData.append("code", code);
        for (const file of files) formData.append("files", file);
        const response = await fetch("/api/sandbox", {
          method: "POST",
          body: formData,
        });
        const result = await response
          .json()
          .catch(() => ({
            error: "Python execution failed. Please try again.",
          }));
        if (!response.ok || !Array.isArray(result.results))
          throw new Error(result.error || "Python execution failed.");
        setResults((previous) => ({ ...previous, [message.id]: result }));
      } catch (error) {
        setExecutionError(
          error instanceof Error ? error.message : "Python execution failed."
        );
      } finally {
        setIsExecuting(false);
      }
    },
  });
  const isLoading =
    isPreparing ||
    isExecuting ||
    status === "submitted" ||
    status === "streaming";

  useEffect(() => {
    const messagesElement = document.getElementById("messages");
    if (messagesElement) {
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }
  }, [messages, results]);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
  }

  function handleFileRemove(file: File) {
    setFiles((prev) => prev.filter((f) => f !== file));
  }

  async function submit(retry = false) {
    if (isLoading) return;
    setExecutionError(undefined);
    setIsPreparing(true);
    try {
      const data = {
        files: await Promise.all(
          files.map((file) => toUploadableFile(file, { cutOff: 5 }))
        ),
        model: currentModel,
        config: languageModel,
      };
      if (retry) {
        await regenerate({ body: { data } });
      } else {
        const text = input;
        setInput("");
        await sendMessage({ text }, { body: { data } });
      }
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : "The request failed."
      );
    } finally {
      setIsPreparing(false);
    }
  }

  function customSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (input.trim()) void submit();
  }

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <nav className="flex gap-0.5 justify-between items-center px-4 py-3 top-0 fixed left-0 right-0 bg-background border-b z-10">
        <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
          <a
            href="https://e2b.dev"
            target="_blank"
            rel="noreferrer"
            aria-label="E2B"
          >
            <Logo className="h-5 w-auto" />
          </a>
          <h1 className="text-sm font-medium border-l pl-2">AI Analyst</h1>
          <RepoBanner />
        </div>
      </nav>

      <div className="flex-1 overflow-y-auto pt-16" id="messages">
        {messages.map((m) => (
          <MessageComponent key={m.id} message={m} result={results[m.id]} />
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
                    className="flex items-center gap-2 p-1.5 border rounded-none text-foreground"
                    disabled={isLoading}
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
                className="flex items-center gap-2 p-1.5 border rounded-none bg-secondary text-foreground"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
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
                models={modelsList.models}
                languageModel={{ ...languageModel, model: currentModel.id }}
                disabled={isLoading}
                onLanguageModelChange={handleLanguageModelChange}
              />
              <LLMSettings
                providerId={currentModel.providerId}
                disabled={isLoading}
                apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
                baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
                languageModel={languageModel}
                onLanguageModelChange={handleLanguageModelChange}
              />
            </div>
            {isLoading && (
              <span role="status" className="text-xs text-muted-foreground">
                {isExecuting ? "Running Python…" : "Generating…"}
              </span>
            )}
            {(status === "submitted" || status === "streaming") && (
              <button type="button" onClick={() => stop()}>
                Stop
              </button>
            )}
          </div>
          {(error || executionError) && (
            <div role="alert" className="text-sm text-destructive">
              {executionError || error?.message}
              <button
                type="button"
                className="ml-2 underline"
                disabled={isLoading}
                onClick={() => void submit(true)}
              >
                Retry
              </button>
            </div>
          )}
          <form
            onSubmit={customSubmit}
            className="flex border p-2 border-1.5 border-border rounded-none overflow-hidden shadow-sm"
          >
            <input
              type="file"
              id="multimodal"
              name="multimodal"
              accept=".txt,.csv,.json,.md,.py"
              multiple={true}
              className="hidden"
              disabled={isLoading}
              onChange={handleFileInput}
            />
            <button
              type="button"
              aria-label="Attach files"
              disabled={isLoading}
              className="border p-1.5 rounded-none hover:bg-accent text-foreground"
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
              className="w-full px-2 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={input}
              placeholder="Enter your prompt..."
              aria-label="Analysis prompt"
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Run analysis"
              disabled={isLoading || !input.trim()}
              className="bg-primary text-primary-foreground p-1.5 rounded-none hover:bg-primary/80"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
