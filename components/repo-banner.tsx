import { GitHubIcon } from "./icons";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { StarFilledIcon } from "@radix-ui/react-icons";

const REPO_URL = "https://github.com/e2b-dev/ai-analyst";

export function RepoBanner() {
  return (
    <a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View AI Analyst repository on GitHub`}
      className={cn(
        "bg-background overflow-hidden font-light px-3 py-1.5 rounded-none",
        "gap-2 w-fit flex items-center shadow-sm ml-auto border",
        "transition-all duration-300 group relative",
        "hover:bg-accent"
      )}
    >
      <GitHubIcon className="w-4 h-4" aria-hidden="true" />
      <Separator
        orientation="vertical"
        className="h-6 bg-border"
        aria-hidden="true"
      />
      <p className="hidden sm:block text-sm font-medium text-foreground tracking-wide">
        Star on GitHub
      </p>
      <div
        className="flex items-center gap-1 text-foreground/80"
        role="status"
        aria-live="polite"
      >
        <StarFilledIcon
          className="w-4 h-4 transition-transform group-hover:text-[#e4b340] duration-200 ease-in-out"
          aria-label="GitHub stars"
        />
      </div>
    </a>
  );
}
