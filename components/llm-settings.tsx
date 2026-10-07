import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Settings2 } from "lucide-react";
import { LLMModelConfig } from "@/lib/model";

export function LLMSettings({
  providerId,
  disabled,
  apiKeyConfigurable,
  baseURLConfigurable,
  languageModel,
  onLanguageModelChange,
}: {
  providerId: string;
  disabled?: boolean;
  apiKeyConfigurable: boolean;
  baseURLConfigurable: boolean;
  languageModel: LLMModelConfig;
  onLanguageModelChange: (model: LLMModelConfig) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Model settings"
          disabled={disabled}
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-6 w-6 rounded-sm"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {apiKeyConfigurable && (
          <>
            <div className="flex flex-col gap-2 px-2 py-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="Auto"
                required={true}
                value={languageModel.apiKey ?? ""}
                onChange={(e) =>
                  onLanguageModelChange({
                    apiKey:
                      e.target.value.length > 0 ? e.target.value : undefined,
                  })
                }
                className="text-sm"
              />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {baseURLConfigurable && (
          <>
            <div className="flex flex-col gap-2 px-2 py-2">
              <Label htmlFor="baseURL">Base URL</Label>
              <Input
                id="baseURL"
                name="baseURL"
                type="text"
                placeholder="Auto"
                required={true}
                value={languageModel.baseURL ?? ""}
                onChange={(e) =>
                  onLanguageModelChange({
                    baseURL:
                      e.target.value.length > 0 ? e.target.value : undefined,
                  })
                }
                className="text-sm"
              />
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <div className="flex flex-col gap-1.5 px-2 py-2">
          <span className="text-sm font-medium">Parameters</span>
          <div className="flex space-x-4 items-center">
            <span className="text-sm flex-1 text-muted-foreground">
              Output tokens
            </span>
            <Input
              type="number"
              defaultValue={languageModel.maxTokens}
              min={50}
              max={32768}
              step={1}
              className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
              placeholder="Auto"
              onChange={(e) =>
                onLanguageModelChange({
                  maxTokens:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          {providerId !== "openai" && providerId !== "anthropic" && (
            <>
              <div className="flex space-x-4 items-center">
                <span className="text-sm flex-1 text-muted-foreground">
                  Temperature
                </span>
                <Input
                  type="number"
                  defaultValue={languageModel.temperature}
                  min={0}
                  max={2}
                  step={0.01}
                  className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
                  placeholder="Auto"
                  onChange={(e) =>
                    onLanguageModelChange({
                      temperature:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="flex space-x-4 items-center">
                <span className="text-sm flex-1 text-muted-foreground">
                  Top P
                </span>
                <Input
                  type="number"
                  defaultValue={languageModel.topP}
                  min={0}
                  max={1}
                  step={0.01}
                  className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
                  placeholder="Auto"
                  onChange={(e) =>
                    onLanguageModelChange({
                      topP:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </div>
              {providerId === "google" && (
                <div className="flex space-x-4 items-center">
                  <span className="text-sm flex-1 text-muted-foreground">
                    Top K
                  </span>
                  <Input
                    type="number"
                    defaultValue={languageModel.topK}
                    min={0}
                    max={500}
                    step={1}
                    className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
                    placeholder="Auto"
                    onChange={(e) =>
                      onLanguageModelChange({
                        topK:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}
              {providerId === "fireworks" && (
                <>
                  <div className="flex space-x-4 items-center">
                    <span className="text-sm flex-1 text-muted-foreground">
                      Frequency penalty
                    </span>
                    <Input
                      type="number"
                      defaultValue={languageModel.frequencyPenalty}
                      min={0}
                      max={2}
                      step={0.01}
                      className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
                      placeholder="Auto"
                      onChange={(e) =>
                        onLanguageModelChange({
                          frequencyPenalty:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="flex space-x-4 items-center">
                    <span className="text-sm flex-1 text-muted-foreground">
                      Presence penalty
                    </span>
                    <Input
                      type="number"
                      defaultValue={languageModel.presencePenalty}
                      min={0}
                      max={2}
                      step={0.01}
                      className="h-6 rounded-sm w-[84px] text-xs text-center tabular-nums"
                      placeholder="Auto"
                      onChange={(e) =>
                        onLanguageModelChange({
                          presencePenalty:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
