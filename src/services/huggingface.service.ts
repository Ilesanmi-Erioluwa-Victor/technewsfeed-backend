import axios from "axios";
import logger from "@/utils/logger";

const HUGGINGFACE_API_KEY = process.env.HUGGING_FACE_TOKEN;

if (!HUGGINGFACE_API_KEY) {
  logger.warn("⚠️ Missing HF_API_KEY in environment variables");
}

export const summarizeText = async (text: string): Promise<string | null> => {
  try {
    if (!text || text.trim().length === 0) return null;

    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/bart-large-cnn",
      { inputs: text.slice(0, 1500) },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const summary = response.data?.[0]?.summary_text || null;
    return summary;
  } catch (error: any) {
    logger.error(`🧠 HuggingFace Summarization failed: ${error.message}`);
    return null;
  }
};

export async function analyzeSentiment(text: string) {
  try {
    const { data } = await axios.post(
      "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
      { inputs: text },
      { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` } }
    );
    return data[0]?.label?.toLowerCase();
  } catch (e) {
    return "neutral";
  }
}

export async function extractTags(text: string): Promise<string[]> {
  try {
    const { data } = await axios.post(
      "https://api-inference.huggingface.co/models/dbmdz/bert-large-cased-finetuned-conll03-english",
      { inputs: text },
      { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` } }
    );
    const tags = new Set<string>();
    for (const token of data[0]) {
      if (token.entity_group === "ORG" || token.entity_group === "MISC") {
        tags.add(token.word.toLowerCase());
      }
    }
    return Array.from(tags);
  } catch {
    return [];
  }
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const { data } = await axios.post(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      { inputs: text },
      { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` } }
    );
    return data[0] || [];
  } catch {
    return [];
  }
}
