import axios from "axios";
import logger from "@/utils/logger";

const HUGGINGFACE_API_KEY = process.env.HUGGING_FACE_TOKEN;

if (!HUGGINGFACE_API_KEY) {
  logger.warn("⚠️ Missing HF_API_KEY in environment variables");
}

// Enhanced helper function with proper error handling
async function huggingFaceRequest(model: string, inputs: any, maxRetries = 2) {
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
          timeout: 45000, // Increased timeout
        }
      );

      // Handle model loading
      if (response.data?.error && response.data.estimated_time) {
        const waitTime = Math.min(
          response.data.estimated_time * 1000 + 5000,
          30000
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
        `Attempt ${attempt + 1} failed for ${model}: ${
          error.response?.status || error.message
        }`
      );

      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Handle specific status codes
      if (error.response?.status === 503) {
        // Model is loading
        const estimatedTime = error.response.data?.estimated_time || 20;
        const waitTime = Math.min(estimatedTime * 1000 + 5000, 30000);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (error.response?.status === 429) {
        // Rate limit
        await new Promise((resolve) => setTimeout(resolve, 30000));
        continue;
      }

      if (error.response?.status === 400) {
        // Bad request - likely model-specific issue, try alternative models
        throw error;
      }

      // For network errors, wait and retry
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

export const summarizeText = async (text: string): Promise<string | null> => {
  try {
    if (!text || text.trim().length === 0) return null;

    const data = await huggingFaceRequest(
      "facebook/bart-large-cnn",
      text.slice(0, 1024)
    ); // Reduced length
    return data?.[0]?.summary_text || null;
  } catch (error: any) {
    logger.error(`🧠 Summarization failed: ${error.message}`);
    return null;
  }
};

export async function analyzeSentiment(text: string): Promise<string> {
  try {
    // Try multiple sentiment models
    const models = [
      "cardiffnlp/twitter-roberta-base-sentiment-latest",
      "nlptown/bert-base-multilingual-uncased-sentiment",
    ];

    for (const model of models) {
      try {
        const data = await huggingFaceRequest(model, text.slice(0, 512));

        if (Array.isArray(data) && data.length > 0) {
          if (model.includes("twitter-roberta")) {
            // Handle twitter-roberta format
            if (Array.isArray(data[0])) {
              const sentiments = data[0];
              const highest = sentiments.reduce((max, current) =>
                current.score > max.score ? current : max
              );
              const label = highest.label;
              if (label.includes("0")) return "negative";
              if (label.includes("2")) return "positive";
              return "neutral";
            }
          } else {
            // Handle other sentiment models
            const result = data[0];
            if (result.label) {
              const label = result.label.toLowerCase();
              if (label.includes("positive")) return "positive";
              if (label.includes("negative")) return "negative";
              if (label.includes("neutral")) return "neutral";
              return label;
            }
          }
        }
      } catch (error) {
        logger.warn(`Sentiment model ${model} failed, trying next...`);
        continue;
      }
    }

    return "neutral";
  } catch (error: any) {
    logger.error(`😊 Sentiment analysis failed: ${error.message}`);
    return "neutral";
  }
}

export async function extractTags(text: string): Promise<string[]> {
  try {
    const data = await huggingFaceRequest(
      "dslim/bert-base-NER",
      text.slice(0, 512)
    );

    const tags = new Set<string>();

    if (Array.isArray(data)) {
      for (const entity of data) {
        if (entity.entity_group === "ORG" || entity.entity_group === "MISC") {
          const cleanWord = entity.word
            .replace(/^##/, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          if (cleanWord.length > 1) {
            tags.add(cleanWord);
          }
        }
      }
    }

    return Array.from(tags).slice(0, 5); // Reduced limit
  } catch (error: any) {
    logger.error(`🏷️ Tag extraction failed: ${error.message}`);
    return [];
  }
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    // Use a more reliable embedding model
    const data = await huggingFaceRequest(
      "sentence-transformers/all-MiniLM-L6-v2",
      {
        inputs: text.slice(0, 256), // Reduced text length
        options: {
          wait_for_model: true,
        },
      }
    );

    if (Array.isArray(data)) {
      return data[0] || [];
    }

    return [];
  } catch (error: any) {
    logger.error(`📊 Embedding generation failed: ${error.message}`);
    return [];
  }
}
