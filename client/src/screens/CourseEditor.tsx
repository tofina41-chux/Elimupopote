import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Accordion,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconPlus, IconSparkles, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";

interface DraftQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface DraftLesson {
  title: string;
  content: string;
  quiz: DraftQuizQuestion[];
}

interface Draft {
  title: string;
  description: string;
  learningObjectives: string[];
  language?: string;
  lessons: DraftLesson[];
}

interface CourseResponse {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  language: string;
  learningObjectives: string[];
  lessons: {
    id: string;
    title: string;
    content: string;
    quiz?: { questions: { question: string; correctIndex: number; options: { text: string }[] }[] } | null;
  }[];
}

function emptyLesson(): DraftLesson {
  return { title: "New lesson", content: "", quiz: [] };
}

// Handles two routes:
//   /courses/new             -> AI-generate a draft, review/edit it, then
//                                POST /api/courses to save.
//   /courses/:courseId/edit  -> loads the saved course into the same
//                                editable Draft shape and PATCHes it back
//                                on save (full lesson replacement — see
//                                updateCourse in aiCourseGenerator.controller.ts).
// Both routes share one editable form below so instructors get the same
// editing experience whether they're starting from AI output or refining
// something they saved earlier.
export function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEditingExisting = Boolean(courseId);

  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditingExisting);

  useEffect(() => {
    if (!courseId) return;
    apiClient
      .get<CourseResponse>(`/api/courses/${courseId}`)
      .then((res) => {
        const c = res.data;
        setStatus(c.status);
        setDraft({
          title: c.title,
          description: c.description,
          learningObjectives: c.learningObjectives ?? [],
          language: c.language,
          lessons: c.lessons.map((l) => ({
            title: l.title,
            content: l.content,
            quiz: (l.quiz?.questions ?? []).map((q) => ({
              question: q.question,
              correctIndex: q.correctIndex,
              options: q.options.map((o) => o.text),
            })),
          })),
        });
      })
      .catch(() => setError("Couldn't load that course."))
      .finally(() => setLoadingExisting(false));
  }, [courseId]);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const { data } = await apiClient.post("/api/courses/generate", { prompt: prompt.trim() });
      setDraft(data.draft);
      setStatus("DRAFT");
    } catch (err: any) {
      setError(err?.response?.data?.error || t("common.error"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publishAfter: boolean) {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const { data } = isEditingExisting
        ? await apiClient.patch(`/api/courses/${courseId}`, draft)
        : await apiClient.post("/api/courses", draft);

      if (publishAfter && data.status !== "PUBLISHED") {
        setPublishing(true);
        await apiClient.patch(`/api/courses/${data.id}/publish`);
      }
      navigate("/instructor");
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  function updateLesson(idx: number, patch: Partial<DraftLesson>) {
    if (!draft) return;
    const lessons = [...draft.lessons];
    lessons[idx] = { ...lessons[idx], ...patch };
    setDraft({ ...draft, lessons });
  }

  function addLesson() {
    if (!draft) return;
    setDraft({ ...draft, lessons: [...draft.lessons, emptyLesson()] });
  }

  function removeLesson(idx: number) {
    if (!draft) return;
    setDraft({ ...draft, lessons: draft.lessons.filter((_, i) => i !== idx) });
  }

  const backButton = (
    <Button
      variant="subtle"
      leftSection={<IconArrowLeft size={16} />}
      onClick={() => navigate("/instructor")}
      w="fit-content"
      px={0}
    >
      My Courses
    </Button>
  );

  if (loadingExisting) {
    return (
      <Group justify="center" p="xl">
        <Loader />
      </Group>
    );
  }

  return (
    <Stack p="md" maw={800}>
      {backButton}

      {!isEditingExisting && !draft && (
        <>
          <Title order={2}>{t("instructor.title")}</Title>
          <Card withBorder padding="lg">
            <Stack gap="sm">
              <Textarea
                label={t("instructor.promptLabel")}
                placeholder={t("instructor.promptPlaceholder")}
                value={prompt}
                onChange={(e) => setPrompt(e.currentTarget.value)}
                autosize
                minRows={2}
              />
              {error && (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              )}
              <Button
                leftSection={<IconSparkles size={16} />}
                onClick={handleGenerate}
                loading={generating}
                disabled={prompt.trim().length < 3}
                w="fit-content"
              >
                {generating ? t("instructor.generating") : t("instructor.generate")}
              </Button>
            </Stack>
          </Card>
        </>
      )}

      {draft && (
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Title order={2}>{isEditingExisting ? draft.title || "Edit course" : "Review draft"}</Title>
            {status && (
              <Badge color={status === "PUBLISHED" ? "green" : "gray"}>{status}</Badge>
            )}
          </Group>

          <Card withBorder padding="lg">
            <Stack gap="sm">
              <TextInput
                label="Course title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.currentTarget.value })}
              />
              <Textarea
                label="Description"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.currentTarget.value })}
                autosize
                minRows={2}
              />
            </Stack>
          </Card>

          <Accordion variant="separated">
            {draft.lessons.map((lesson, lessonIdx) => (
              <Accordion.Item key={lessonIdx} value={`lesson-${lessonIdx}`}>
                <Accordion.Control>
                  {lessonIdx + 1}. {lesson.title || "Untitled lesson"}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <TextInput
                      label="Lesson title"
                      value={lesson.title}
                      onChange={(e) => updateLesson(lessonIdx, { title: e.currentTarget.value })}
                    />
                    <Textarea
                      label="Content"
                      value={lesson.content}
                      onChange={(e) => updateLesson(lessonIdx, { content: e.currentTarget.value })}
                      autosize
                      minRows={4}
                    />

                    {lesson.quiz.length > 0 && (
                      <Stack gap="xs">
                        <Text size="sm" fw={600}>
                          Quiz
                        </Text>
                        {lesson.quiz.map((q, qIdx) => (
                          <Card key={qIdx} withBorder padding="sm">
                            <Text size="sm" fw={500} mb={4}>
                              {q.question}
                            </Text>
                            <Radio.Group value={q.correctIndex.toString()}>
                              <Stack gap={4}>
                                {q.options.map((opt, oIdx) => (
                                  <Radio
                                    key={oIdx}
                                    value={oIdx.toString()}
                                    label={opt}
                                    readOnly
                                    size="xs"
                                  />
                                ))}
                              </Stack>
                            </Radio.Group>
                          </Card>
                        ))}
                      </Stack>
                    )}

                    <Button
                      size="xs"
                      color="red"
                      variant="subtle"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => removeLesson(lessonIdx)}
                      w="fit-content"
                    >
                      {t("instructor.removeLesson")}
                    </Button>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>

          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={addLesson}
            w="fit-content"
          >
            {t("instructor.addLesson")}
          </Button>

          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <Group>
            {!isEditingExisting && (
              <Button variant="light" color="red" onClick={() => setDraft(null)}>
                Discard &amp; regenerate
              </Button>
            )}
            <Button variant="default" onClick={() => handleSave(false)} loading={saving && !publishing}>
              {t("instructor.save")}
            </Button>
            {status !== "PUBLISHED" && (
              <Button onClick={() => handleSave(true)} loading={saving && publishing}>
                {t("instructor.publish")}
              </Button>
            )}
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
