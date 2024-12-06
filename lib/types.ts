import { ToolInvocation } from "ai";
import { Result } from "@e2b/code-interpreter";

export type ToolResult = (ToolInvocation & {
  result: Result;
})[];

export type CustomFiles = {
  base64(base64: any): string | ArrayBuffer | Blob | ReadableStream<any>;
  name: string;
  contentType: string;
  content: string;
};
