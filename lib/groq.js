import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Call Groq and return parsed JSON with retry logic
 * Supports optional system message for better prompt structuring
 */
export async function generateJson(prompt, { model = "llama-3.3-70b-versatile", maxRetries = 2, systemMessage = null } = {}) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const messages = [];

      if (systemMessage) {
        messages.push({ role: "system", content: systemMessage });
      }

      messages.push({ role: "user", content: prompt });

      const completion = await groq.chat.completions.create({
        messages,
        model: model,
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const responseText = completion.choices[0]?.message?.content || "{}";

      // Try to parse, with cleanup for common issues
      let cleaned = responseText.trim();

      // Remove markdown code fences if present
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      try {
        return JSON.parse(cleaned);
      } catch (parseError) {
        console.error(`JSON parse failed. Raw LLM response: ${responseText}`);
        throw parseError;
      }
    } catch (error) {
      attempt++;
      const isRateLimit = error?.status === 429;
      const waitMs = isRateLimit ? 3000 : 1000;

      console.error(`Groq attempt ${attempt}/${maxRetries + 1} failed: ${error.message || 'Unknown error'}`);

      if (attempt > maxRetries) {
        console.error("Max retries reached. Returning null.", error.message);
        return null;
      }

      await new Promise(res => setTimeout(res, waitMs));
    }
  }

  return null;
}
