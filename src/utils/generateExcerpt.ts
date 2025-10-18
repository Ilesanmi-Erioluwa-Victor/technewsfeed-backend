export const generateExcerpt = (
  content: string,
  length: number = 150
): string => {
  if (!content || typeof content !== "string") return "";

  const cleanText = content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .trim();

  return cleanText.length > length
    ? cleanText.substring(0, length) + "..."
    : cleanText;
};
