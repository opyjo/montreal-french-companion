import { NextRequest, NextResponse } from "next/server";

/**
 * Optional fallback when Firebase AI Logic is unavailable: forwards a prompt
 * to Gemini or OpenAI using an API key the user supplied in Settings.
 * The key is used for this request only and never stored server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, provider, apiKey } = await req.json();
    if (typeof prompt !== "string" || !prompt || prompt.length > 20000) {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }
    if (typeof apiKey !== "string" || !apiKey) {
      return NextResponse.json({ error: "Missing API key" }, { status: 400 });
    }

    let text: string;
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        }),
      });
      if (!res.ok) {
        return NextResponse.json({ error: await res.text() }, { status: res.status });
      }
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || "{}";
    } else {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
          }),
        }
      );
      if (!res.ok) {
        return NextResponse.json({ error: await res.text() }, { status: res.status });
      }
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    }

    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    return NextResponse.json(JSON.parse(cleaned));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
