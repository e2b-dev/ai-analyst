"use client";
import { useChat } from "ai/react";
import { MessageComponent } from "./components/message";
import { FileText, PlayIcon, PlusIcon, X } from "lucide-react";
import { extractCodeFromText } from "./lib/code";
import Logo from "./components/logo";
import { useEffect, useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const filesData = files.map(async (file) => {
    return {
      name: file.name,
      contentType: file.type,
      base64: await file
        .arrayBuffer()
        .then((buffer) => Buffer.from(buffer).toString("base64")),
    };
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    isLoading,
  } = useChat({
    // Fake tool call
    onFinish: async (message) => {
      const code = extractCodeFromText(message.content);
      if (!code) return;

      const res = await fetch("/api/sandbox", {
        method: "POST",
        body: JSON.stringify({ code, files: await Promise.all(filesData) }),
      });

      const result = await res.json();

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

      setFiles([]);
      setMessages((prev) => {
        // replace last message with the new message
        return [...prev.slice(0, -1), message];
      });
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
    handleSubmit(e, {
      data: {
        files: await Promise.all(filesData),
      },
    });
  }

  return (
    <div className="flex flex-col min-h-screen max-h-screen">
      <nav className="flex gap-0.5 justify-between items-center p-4 top-0 fixed left-0 right-0 bg-white/80 backdrop-blur-sm shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6" />
          <h1 className="text-md font-medium">
            Analyst by{" "}
            <a
              href="https://e2b.dev"
              target="_blank"
              className="underline decoration-[rgba(229,123,0,.3)] decoration-2 text-[#ff8800]"
            >
              E2B
            </a>
          </h1>
        </div>
        <div className="text-sm text-gray-500">
          Powered by Meta Llama 3.1 405B
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
          <form
            onSubmit={customSubmit}
            className="flex border p-1 border-1.5 border-orange-400 rounded-xl overflow-hidden shadow-md"
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
              className="bg-orange-500 text-white p-1.5 rounded-lg hover:bg-orange-500/80"
            >
              <PlayIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
