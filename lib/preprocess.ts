// preprocess data based on file extension
export async function preProcessFile(
  file: File,
  options?: { cutOff?: number }
) {
  const parsed = await file.text();

  // get first 5 lines of csv
  if (file.type === "text/csv" && options?.cutOff) {
    const lines = parsed.split("\n");
    const content = lines.slice(0, options.cutOff).join("\n");
    return content;
  }

  // return the raw content
  return parsed;
}
