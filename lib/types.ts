// import { ToolInvocation } from "ai";
// import { Result } from "@e2b/code-interpreter";

// export type ToolResult = (ToolInvocation & {
//   result: Result;
// })[];

// export type CustomFiles = {
//   base64(base64: any): string | ArrayBuffer | Blob | ReadableStream<any>;
//   name: string;
//   contentType: string;
//   content: string;
// };

import { ToolInvocation } from "ai";
import { Result } from "@e2b/code-interpreter";

// Define a more specific type for the base64 method parameter
export type ToolResult = (ToolInvocation & {
  result: Result;
})[];

export type CustomFiles = {
  base64(base64: string): string | ArrayBuffer | Blob | ReadableStream<Uint8Array>;
  name: string;
  contentType: string;
  content: string;
};
