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
