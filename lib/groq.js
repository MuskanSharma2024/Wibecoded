import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Call Groq and return parsed JSON with retry logic
export async function generateJson(prompt, model = "llama-3.3-70b-versatile", maxRetries = 2) {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: model,
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content || "{}";
      return JSON.parse(responseText);
    } catch (error) {
      attempt++;
      console.error(`Attempt ${attempt} failed to parse JSON from Groq. Retrying...`);
      if (attempt > maxRetries) {
        console.error("Max retries reached. Aborting.", error);
        return null;
      }
      // Wait for a second before retrying
      await new Promise(res => setTimeout(res, 1000));
    }
  }
  return null;
}
