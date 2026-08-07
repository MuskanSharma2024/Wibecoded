import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Call Groq and return parsed JSON
export async function generateJson(prompt, model = "llama-3.3-70b-versatile") {
  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: model,
    response_format: { type: "json_object" },
  });

  const responseText = completion.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error("Failed to parse JSON from Groq:", responseText);
    return null;
  }
}
