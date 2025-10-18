export const cleanContent = (content: string): string => {
  if (!content || typeof content !== "string") return "";

  return content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .trim();
};
