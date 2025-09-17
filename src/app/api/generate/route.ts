import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { step, topic, wordCount, tone, seo, outline } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Missing topic" }, { status: 400 });
    }

    const prompt =
      step === "outline"
        ? `Generate a detailed blog outline on the topic: "${topic}". Tone: ${tone}. Word count target: ${wordCount}. ${
            seo ? "Optimize for SEO with headings." : ""
          }`
        : `Write a complete, well-formatted HTML blog article on the topic: "${topic}" using this outline: ${
            outline || ""
          }. Tone: ${tone}. Target length: ${wordCount} words. ${
            seo
              ? "Include SEO-friendly headings, meta description, and subheadings."
              : ""
          }`;

    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key provided, fallback to mock
    if (!apiKey) {
      console.warn("⚠️ No API key found. Using mock response.");
      return mockResponse(step, topic);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: step === "outline" ? 500 : 1500,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ OpenAI API Error:", errorData);

      // If quota is exceeded, return mock response
      if (errorData?.error?.code === "insufficient_quota") {
        console.warn("⚠️ Quota exhausted. Using mock response.");
        return mockResponse(step, topic);
      }

      return NextResponse.json(
        { error: "Failed to fetch from OpenAI", details: errorData },
        { status: 500 }
      );
    }

    // --- STREAMING ---
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          chunk
            .split("\n\n")
            .filter(Boolean)
            .forEach((line) => {
              if (line.startsWith("data: ")) {
                const jsonStr = line.replace("data: ", "").trim();
                if (jsonStr === "[DONE]") return;
                try {
                  const parsed = JSON.parse(jsonStr);
                  const token = parsed.choices?.[0]?.delta?.content || "";
                  controller.enqueue(encoder.encode(token));
                } catch (e) {
                  console.error("JSON Parse Error:", jsonStr);
                }
              }
            });
        }
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err: any) {
    console.error("🔥 API Exception:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * Returns a fake AI response (for local testing / no credits scenario)
 */
function mockResponse(step: string, topic: string) {
  const mockText =
    step === "outline"
      ? `Outline for "${topic}":\n\n1. Introduction\n2. Main Benefits\n   - Benefit 1\n   - Benefit 2\n3. Practical Tips\n4. Conclusion`
      : `<h2>${topic}</h2>
         <p>This is a mock article generated for testing purposes. In production, this would be AI-generated content based on the topic you provided.</p>
         <h3>Key Points</h3>
         <ul>
           <li>Benefit 1 – explained in detail</li>
           <li>Benefit 2 – explained in detail</li>
         </ul>
         <p><strong>Conclusion:</strong> Mock data helps you test UI without using real API credits.</p>`;

  return new NextResponse(mockText, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
