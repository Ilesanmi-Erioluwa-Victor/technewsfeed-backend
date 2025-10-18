export const generateExcerpt = (
  content: string,
  length: number = 150
): string => {
  const cleanText = content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanText.length > length
    ? cleanText.substring(0, length) + "..."
    : cleanText;
};
