import { useState } from "react";
import { Button, Card, Radio, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { recordLessonAttempt } from "../db/db";
import type { OfflineQuizQuestion } from "../db/db";

interface LessonQuizProps {
  lessonId: string;
  courseId: string;
  questions: OfflineQuizQuestion[];
  onComplete: (score: number) => void;
}

// Renders a lesson's quiz and, on submit, ALWAYS writes the result locally
// first via recordLessonAttempt() (Dexie) — regardless of connectivity.
// That local write also enqueues a syncQueue entry, so the actual network
// sync happens transparently later via syncManager.ts. The learner never
// has to think about "online" vs "offline" while taking a quiz.
export function LessonQuiz({ lessonId, courseId, questions, onComplete }: LessonQuizProps) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  async function handleSubmit() {
    const correctCount = questions.filter((q) => answers[q.id] === q.correctIndex).length;
    const pct = questions.length === 0 ? 100 : Math.round((correctCount / questions.length) * 100);

    await recordLessonAttempt({
      lessonId,
      courseId,
      completed: true,
      score: pct,
    });

    setScore(pct);
    setSubmitted(true);
    onComplete(pct);
  }

  if (submitted) {
    return (
      <Card withBorder padding="lg">
        <Title order={4}>{t("learner.lessonComplete")}</Title>
        <Text size="lg" mt="sm">
          {t("learner.score")}: {score}%
        </Text>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      {questions.map((q, qIndex) => (
        <Card key={q.id} withBorder padding="md">
          <Text fw={600} mb="sm">
            {qIndex + 1}. {q.question}
          </Text>
          <Radio.Group
            value={answers[q.id]?.toString() ?? ""}
            onChange={(val) => setAnswers((prev) => ({ ...prev, [q.id]: Number(val) }))}
          >
            <Stack gap="xs">
              {q.options
                .sort((a, b) => a.order - b.order)
                .map((opt, oIndex) => (
                  <Radio key={opt.id} value={oIndex.toString()} label={opt.text} />
                ))}
            </Stack>
          </Radio.Group>
        </Card>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={Object.keys(answers).length < questions.length}
        size="md"
      >
        {t("learner.submitQuiz")}
      </Button>
    </Stack>
  );
}
