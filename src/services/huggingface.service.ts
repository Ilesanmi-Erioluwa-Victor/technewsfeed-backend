import axios from "axios";
import logger from "@/utils/logger";

const HUGGINGFACE_API_KEY = process.env.HUGGING_FACE_TOKEN;
if (!HUGGINGFACE_API_KEY) logger.warn("⚠️ Missing Hugging Face API key");

// -----------------------------
// Generic request helper
// -----------------------------
async function huggingFaceRequest(
  model: string,
  inputs: any,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        { inputs },
        {
          headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` },
          timeout: 45000,
        }
      );

      if (response.data?.error && response.data.estimated_time) {
        const waitTime = Math.min(
          response.data.estimated_time * 1000 + 5000,
          30000
        );
        logger.info(`⏳ Model ${model} loading, waiting ${waitTime / 1000}s`);
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      return response.data;
    } catch (err: any) {
      logger.warn(`Attempt ${attempt} failed for ${model}: ${err.message}`);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 3000 * attempt)); // exponential backoff
    }
  }
}

// -----------------------------
// Summarization
// -----------------------------
export async function summarizeText(text: string): Promise<string | null> {
  if (!text || text.trim().length === 0) return null;

  try {
    const data = await huggingFaceRequest(
      "facebook/bart-large-cnn",
      text.slice(0, 1024)
    );
    return data?.[0]?.summary_text || null;
  } catch (err: any) {
    logger.error(`🧠 Summarization failed: ${err.message}`);
    return null;
  }
}

// -----------------------------
// Sentiment analysis
// -----------------------------
export async function analyzeSentiment(
  text: string
): Promise<"positive" | "neutral" | "negative"> {
  if (!text || text.trim().length === 0) return "neutral";

  const model = "cardiffnlp/twitter-roberta-base-sentiment-latest";

  try {
    const data = await huggingFaceRequest(model, text.slice(0, 1024));

    logger.info(
      `😊 Raw response from ${model}: ${JSON.stringify(data).slice(0, 300)}...`
    );

    if (Array.isArray(data) && data.length > 0) {
      const predictions = data[0];

      if (!Array.isArray(predictions)) {
        logger.warn(`⚠️ Unexpected predictions format, returning "neutral"`);
        return "neutral";
      }

      const top = predictions.reduce((prev: any, curr: any) =>
        curr.score > prev.score ? curr : prev
      );

      const label = top.label.toLowerCase();
      logger.info(`😊 Top sentiment: ${label}, score: ${top.score}`);

      if (label.includes("positive")) return "positive";
      if (label.includes("negative")) return "negative";
    }

    return "neutral";
  } catch (err: any) {
    logger.error(`😊 Sentiment analysis failed: ${err.message}`);
    return "neutral";
  }
}

// -----------------------------
// Keyphrase extraction / Tags
// -----------------------------
export async function extractTags(text: string): Promise<string[]> {
  if (!text || text.trim().length === 0) return [];

  const model = "ml6team/keyphrase-extraction";

  try {
    const data = await huggingFaceRequest(model, text.slice(0, 1024));

    logger.info(
      `🏷️ Raw response from ${model}: ${JSON.stringify(data).slice(0, 300)}...`
    );

    if (!Array.isArray(data)) {
      logger.warn(
        `⚠️ Unexpected data format from ${model}, returning empty array`
      );
      return [];
    }

    const tags = Array.from(
      new Set(data.map((t: any) => t.toLowerCase().trim()))
    );
    logger.info(`🏷️ Extracted tags: ${tags.slice(0, 5)}`);
    return tags.slice(0, 5); // max 5 tags
  } catch (err: any) {
    logger.error(`🏷️ Tag extraction failed: ${err.message}`);
    return [];
  }
}

// -----------------------------
// Embeddings
// -----------------------------
export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) return [];

  const model = "sentence-transformers/all-MiniLM-L6-v2";

  try {
    const data = await huggingFaceRequest(model, {
      inputs: text.slice(0, 1024),
      options: { wait_for_model: true },
    });

    logger.info(
      `📊 Raw response from ${model}: ${JSON.stringify(data).slice(0, 300)}...`
    );

    if (Array.isArray(data) && Array.isArray(data[0])) {
      logger.info(`📊 Embedding length: ${data[0].length}`);
      return data[0];
    }

    logger.warn(
      `⚠️ Unexpected data format from ${model}, returning empty array`
    );
    return [];
  } catch (err: any) {
    logger.error(`📊 Embedding generation failed: ${err.message}`);
    return [];
  }
}
