import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { preProcessFile } from "./preprocess";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function toUploadableFile(file: File, options?: { cutOff?: number }) {
  return {
    name: file.name,
    contentType: file.type,
    content: await preProcessFile(file, options),
  };
}
