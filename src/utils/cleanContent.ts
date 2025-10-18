export const cleanContent = (content: string): string => {
  return content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .trim();
};
