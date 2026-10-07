import type { UIMessage } from "ai";
import { BotIcon, UserIcon } from "lucide-react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  oneDark,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useMediaQuery } from "usehooks-ts";
import { ToolOutput } from "./tooloutput";
import type { SandboxResult } from "../lib/types";

export function MessageComponent({
  message,
  result,
}: {
  message: UIMessage;
  result?: SandboxResult;
}) {
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  return (
    <div
      key={message.id}
      className={`px-4 ${message.role === "user" ? "bg-secondary" : ""}`}
    >
      <div
        className={`flex gap-4 mx-auto w-full max-w-2xl py-4 ${
          message.role === "user" ? "items-center" : ""
        }`}
      >
        <div className="h-fit rounded-none flex items-center justify-center">
          {message.role === "user" ? (
            <UserIcon className="mt-1 w-6 h-6 text-brand" />
          ) : (
            <BotIcon className="mt-1 w-6 h-6 text-brand" />
          )}
        </div>
        <div className="overflow-hidden flex-1 flex flex-col gap-2">
          <Markdown
            components={{
              code(props) {
                const { children, className, ...rest } = props;
                const match = /language-(\w+)/.exec(className || "");
                return match ? (
                  <SyntaxHighlighter
                    PreTag="div"
                    className="border text-sm !rounded-none"
                    language={match[1]}
                    style={dark ? oneDark : oneLight}
                    customStyle={{ fontFamily: "var(--font-ibm-plex-mono)" }}
                    codeTagProps={{
                      style: { fontFamily: "var(--font-ibm-plex-mono)" },
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                ) : (
                  <code {...rest} className={className}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {message.parts
              .filter((part) => part.type === "text")
              .map((part) => part.text)
              .join("")}
          </Markdown>
          <ToolOutput result={result} />
        </div>
      </div>
    </div>
  );
}
