import type { Execution, Result } from "@e2b/code-interpreter";

export type SandboxResult = Pick<Execution, "logs" | "error"> & {
  results: (ReturnType<Result["toJSON"]> & { chart?: Result["chart"] })[];
};

export type CustomFiles = {
  name: string;
  contentType: string;
  content: string;
};
