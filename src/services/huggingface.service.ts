import axios from "axios";
import logger from "@/utils/logger";

const HUGGINGFACE_API_KEY = process.env.HUGGING_FACE_TOKEN;

if (!HUGGINGFACE_API_KEY) {
  logger.warn("⚠️ Missing HF_API_KEY in environment variables");
}

// Enhanced helper function with better error handling
async function huggingFaceRequest(model: string, inputs: any, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
        { inputs },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      // Handle model loading scenario
      if (
        response.data &&
        response.data.error &&
        response.data.estimated_time
      ) {
        const waitTime = Math.min(
          response.data.estimated_time * 1000 + 5000,
          60000
        );
        logger.info(
          `⏳ Model ${model} loading, waiting ${waitTime / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      return response.data;
    } catch (error: any) {
      logger.error(
        `Attempt ${attempt + 1} failed for ${model}: ${error.message}`
      );

      if (attempt === maxRetries - 1) {
        throw new Error(
          `HuggingFace API failed after ${maxRetries} attempts: ${error.message}`
        );
      }

      // Handle specific error cases
      if (error.response?.status === 503) {
        const estimatedTime = error.response.data?.estimated_time || 30;
        const waitTime = Math.min(estimatedTime * 1000 + 5000, 60000);
        logger.info(
          `⏳ Model ${model} is starting up, waiting ${waitTime / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (error.response?.status === 429) {
        // Rate limit - wait longer
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }

      // For other errors, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export const summarizeText = async (text: string): Promise<string | null> => {
  try {
    if (!text || text.trim().length === 0) return null;

    const data = await huggingFaceRequest(
      "facebook/bart-large-cnn",
      text.slice(0, 1500)
    );
    return data?.[0]?.summary_text || null;
  } catch (error: any) {
    logger.error(`🧠 Summarization failed: ${error.message}`);
    return null;
  }
};

export async function analyzeSentiment(
  text: string
): Promise<"positive" | "negative" | "neutral"> {
  try {
    const data = await huggingFaceRequest(
      "cardiffnlp/twitter-roberta-base-sentiment-latest",
      text
    );

    // Handle the response format for this specific model
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      const sentiments = data[0];

      // This model returns: LABEL_0 (negative), LABEL_1 (neutral), LABEL_2 (positive)
      const sentimentMap: {
        [key: string]: "positive" | "negative" | "neutral";
      } = {
        LABEL_0: "negative",
        LABEL_1: "neutral",
        LABEL_2: "positive",
      };

      // Find highest confidence score
      const highestScore = sentiments.reduce((max, current) =>
        current.score > max.score ? current : max
      );

      return sentimentMap[highestScore.label] || "neutral";
    }

    return "neutral";
  } catch (error: any) {
    logger.error(`😊 Sentiment analysis failed: ${error.message}`);
    return "neutral";
  }
}

export async function extractTags(text: string): Promise<string[]> {
  try {
    const data = await huggingFaceRequest("dslim/bert-base-NER", text);

    const tags = new Set<string>();

    if (Array.isArray(data)) {
      for (const entity of data) {
        // Extract organizations and other entities
        if (
          entity.entity_group === "ORG" ||
          entity.entity_group === "MISC" ||
          entity.entity_group === "PER"
        ) {
          const cleanWord = entity.word
            .replace(/^##/, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          if (cleanWord.length > 1 && !cleanWord.match(/^[^a-zA-Z0-9]+$/)) {
            tags.add(cleanWord);
          }
        }
      }
    }

    return Array.from(tags).slice(0, 10); // Limit to 10 tags
  } catch (error: any) {
    logger.error(`🏷️ Tag extraction failed: ${error.message}`);
    return [];
  }
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    const data = await huggingFaceRequest(
      "sentence-transformers/all-MiniLM-L6-v2",
      text
    );

    // Handle different response formats
    if (Array.isArray(data)) {
      return data[0] || [];
    } else if (data?.embeddings) {
      return data.embeddings[0] || [];
    }

    return [];
  } catch (error: any) {
    logger.error(`📊 Embedding generation failed: ${error.message}`);
    return [];
  }
}
