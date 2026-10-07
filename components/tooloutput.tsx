import { useState } from "react";
import type { SandboxResult } from "../lib/types";
import { RenderResult } from "./charts";
import { AlertTriangle, ChartNoAxesCombined } from "lucide-react";

export function ToolOutput({ result }: { result: SandboxResult | undefined }) {
  const [viewMode, setViewMode] = useState<"static" | "interactive">(
    "interactive"
  );

  if (!result) return null;
  const toolResult = result;

  if (toolResult?.error) {
    return (
      <div className="text-destructive border border-destructive/30 rounded-none bg-error-muted text-sm">
        <div className="flex items-center gap-2 pt-4 px-4">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-semibold">Error: {toolResult.error.name}</span>
        </div>
        <pre className="overflow-auto p-4">{toolResult.error.traceback}</pre>
      </div>
    );
  }

  return (
    <>
      {toolResult.logs.stdout.length > 0 && (
        <pre className="overflow-auto text-sm">
          {toolResult.logs.stdout.join("")}
        </pre>
      )}
      {toolResult.results.map((result, index: number) => (
        <div
          key={index}
          className="flex flex-col border rounded-none shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 p-2">
            <div className="p-2 font-semibold text-foreground text-sm flex items-center gap-2">
              <ChartNoAxesCombined className="w-4 h-4" />
              {(result.chart ?? result.extra?.chart)?.title}
            </div>
            <div className="flex shrink-0 justify-end border rounded-none overflow-hidden">
              <button
                className={`px-3 py-2 font-semibold text-sm ${
                  viewMode === "static" ? "bg-brand-muted text-brand" : ""
                }`}
                onClick={() => setViewMode("static")}
              >
                Static
              </button>
              <button
                className={`px-3 py-2 font-semibold text-sm ${
                  viewMode === "interactive" ? "bg-brand-muted text-brand" : ""
                }`}
                onClick={() => setViewMode("interactive")}
              >
                Interactive
              </button>
            </div>
          </div>
          <div className="p-4">
            <RenderResult result={result} viewMode={viewMode} />
          </div>
        </div>
      ))}
    </>
  );
}
