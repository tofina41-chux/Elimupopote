// ============================================================================
// AI generation service.
// ----------------------------------------------------------------------------
// If OPENAI_API_KEY is set, we call the real OpenAI API and ask for strict
// JSON output matching our course shape. If it is NOT set (e.g. local dev,
// CI, or judges running this MVP without a key), we fall back to
// generateMockCourse(), which returns realistic, deterministic content so
// the whole instructor flow can be demoed end-to-end with zero external
// dependencies.
//
// Language handling: detectLanguage() is a tiny heuristic (looks for common
// Swahili function words). It is intentionally simple — swap for a real
// detector (e.g. franc, or let the OpenAI prompt do detection) when you
// move past MVP.
// ============================================================================
import OpenAI from "openai";

export type GeneratedCourse = {
  title: string;
  description: string;
  learningObjectives: string[];
  lessons: {
    title: string;
    content: string;
    quiz: { question: string; options: string[]; correctIndex: number }[];
  }[];
};

const SWAHILI_HINTS = ["ya", "na", "wa", "ni", "kwa", "kujifunza", "kozi", "somo"];

export function detectLanguage(prompt: string): "en" | "sw" {
  const words = prompt.toLowerCase().split(/\s+/);
  const hits = words.filter((w) => SWAHILI_HINTS.includes(w)).length;
  return hits >= 2 ? "sw" : "en";
}

export async function generateCourse(prompt: string): Promise<GeneratedCourse> {
  const language = detectLanguage(prompt);

  if (!process.env.OPENAI_API_KEY) {
    return generateMockCourse(prompt, language);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = `You are an instructional designer creating corporate training content for Kenyan workplaces.
Respond to the user's topic with ONLY a JSON object (no markdown fences, no preamble) matching exactly this TypeScript shape:
{
  "title": string,
  "description": string,
  "learningObjectives": string[],
  "lessons": [
    {
      "title": string,
      "content": string, // 150-300 words, plain text micro-lesson
      "quiz": [ { "question": string, "options": string[4], "correctIndex": number } ] // 2-3 questions per lesson
    }
  ] // 3-5 lessons
}
Respond in ${language === "sw" ? "Swahili" : "English"}, matching the language of the user's prompt.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned an empty response");

  return JSON.parse(raw) as GeneratedCourse;
}

// ----------------------------------------------------------------------------
// Mock generator — deterministic, no external calls, bilingual.
// ----------------------------------------------------------------------------
function generateMockCourse(prompt: string, language: "en" | "sw"): GeneratedCourse {
  const topic = prompt.trim() || (language === "sw" ? "Mada Mpya" : "New Topic");

  if (language === "sw") {
    return {
      title: `${topic}: Kozi ya Mafunzo`,
      description: `Kozi hii inawapa wafanyakazi uelewa wa kimsingi wa "${topic}" na jinsi ya kuutumia mahali pa kazi.`,
      learningObjectives: [
        `Kueleza dhana kuu za ${topic}`,
        `Kutumia kanuni za ${topic} kazini`,
        `Kutathmini matokeo ya ${topic} kwa timu yako`,
      ],
      lessons: buildMockLessons(topic, language),
    };
  }

  return {
    title: `${topic}: A Practical Training Course`,
    description: `This course gives employees a working understanding of "${topic}" and how to apply it on the job.`,
    learningObjectives: [
      `Explain the core concepts of ${topic}`,
      `Apply ${topic} principles in daily work`,
      `Evaluate the impact of ${topic} on team outcomes`,
    ],
    lessons: buildMockLessons(topic, language),
  };
}

function buildMockLessons(topic: string, language: "en" | "sw") {
  const lessonTitles =
    language === "sw"
      ? [`Utangulizi wa ${topic}`, `Kanuni Muhimu za ${topic}`, `Matumizi ya ${topic} Kazini`]
      : [`Introduction to ${topic}`, `Key Principles of ${topic}`, `Applying ${topic} at Work`];

  return lessonTitles.map((title) => ({
    title,
    content:
      language === "sw"
        ? `Somo hili linaeleza ${title.toLowerCase()} kwa njia rahisi, likitumia mifano halisi ya mahali pa kazi nchini Kenya. Mwanafunzi atapata maarifa ya msingi na hatua za kufuata.`
        : `This lesson covers ${title.toLowerCase()} using simple, real-world Kenyan workplace examples. Learners walk away with practical takeaways they can apply immediately.`,
    quiz: [
      {
        question:
          language === "sw" ? `Lengo kuu la ${title} ni nini?` : `What is the main goal of ${title}?`,
        options:
          language === "sw"
            ? ["Kuongeza ufahamu", "Kupunguza muda wa kazi", "Kuongeza gharama", "Hakuna lengo"]
            : ["To build awareness", "To reduce work hours", "To increase costs", "There is no goal"],
        correctIndex: 0,
      },
      {
        question:
          language === "sw"
            ? `Ni hatua gani ya kwanza unapotumia ${topic}?`
            : `What is the first step when applying ${topic}?`,
        options:
          language === "sw"
            ? ["Kuelewa muktadha", "Kuruka hatua", "Kungoja idhini", "Kufunga mradi"]
            : ["Understand the context", "Skip the basics", "Wait for approval", "Close the project"],
        correctIndex: 0,
      },
    ],
  }));
}
