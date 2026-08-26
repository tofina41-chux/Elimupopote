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
import { IconArrowLeft, IconInfoCircle, IconSparkles } from "@tabler/icons-react";
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
  lessons: DraftLesson[];
}

interface ExistingCourse {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  language: string;
  lessons: {
    id: string;
    title: string;
    content: string;
    quiz?: { questions: DraftQuizQuestion[] } | null;
  }[];
}

// Handles two routes:
//   /courses/new             -> AI-generate a draft, let the instructor
//                                review it, then POST /api/courses to save.
//   /courses/:courseId/edit  -> the API has no update-course endpoint yet
//                                (only create + publish), so this shows the
//                                saved course read-only rather than pretending
//                                edits would persist. Publishing still works.
export function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEditingExisting = Boolean(courseId);

  // --- "new course" (AI generation) state ---
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // --- "existing course" (read-only) state ---
  const [existing, setExisting] = useState<ExistingCourse | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditingExisting);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    apiClient
      .get(`/api/courses/${courseId}`)
      .then((res) => setExisting(res.data))
      .catch(() => setExisting(null))
      .finally(() => setLoadingExisting(false));
  }, [courseId]);

  async function handleGenerate() {
    setGenError(null);
    setGenerating(true);
    try {
      const { data } = await apiClient.post("/api/courses/generate", { prompt: prompt.trim() });
      setDraft(data.draft);
    } catch (err: any) {
      setGenError(err?.response?.data?.error || t("common.error"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(publishAfter: boolean) {
    if (!draft) return;
    setSaving(true);
    try {
      const { data } = await apiClient.post("/api/courses", draft);
      if (publishAfter) {
        await apiClient.patch(`/api/courses/${data.id}/publish`);
      }
      navigate("/instructor");
    } catch {
      setGenError(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishExisting() {
    if (!existing) return;
    setPublishing(true);
    try {
      await apiClient.patch(`/api/courses/${existing.id}/publish`);
      navigate("/instructor");
    } finally {
      setPublishing(false);
    }
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

  // ---------------------------------------------------------------- editing
  if (isEditingExisting) {
    if (loadingExisting) {
      return (
        <Group justify="center" p="xl">
          <Loader />
        </Group>
      );
    }
    if (!existing) {
      return (
        <Stack p="md" maw={800}>
          {backButton}
          <Alert color="red">Couldn't load that course.</Alert>
        </Stack>
      );
    }
    return (
      <Stack p="md" maw={800}>
        {backButton}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={2}>{existing.title}</Title>
            <Text c="dimmed">{existing.description}</Text>
          </div>
          <Badge color={existing.status === "PUBLISHED" ? "green" : "gray"}>
            {existing.status}
          </Badge>
        </Group>

        <Alert icon={<IconInfoCircle size={16} />} color="jua" variant="light">
          Editing course content isn't available yet — this is a read-only view. You can still
          publish it below.
        </Alert>

        <Accordion variant="separated">
          {existing.lessons.map((lesson, idx) => (
            <Accordion.Item key={lesson.id} value={lesson.id}>
              <Accordion.Control>
                {idx + 1}. {lesson.title}
              </Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {lesson.content}
                </Text>
                {lesson.quiz?.questions?.length ? (
                  <Text size="xs" c="dimmed" mt="sm">
                    {lesson.quiz.questions.length} quiz question
                    {lesson.quiz.questions.length === 1 ? "" : "s"}
                  </Text>
                ) : null}
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        {existing.status === "DRAFT" && (
          <Button onClick={handlePublishExisting} loading={publishing} w="fit-content">
            {t("instructor.publish")}
          </Button>
        )}
      </Stack>
    );
  }

  // ------------------------------------------------------------- new course
  return (
    <Stack p="md" maw={800}>
      {backButton}
      <Title order={2}>{t("instructor.title")}</Title>

      {!draft && (
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
            {genError && (
              <Alert color="red" variant="light">
                {genError}
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
      )}

      {draft && (
        <Stack gap="md">
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

          <Accordion variant="separated" defaultValue={draft.lessons[0]?.title}>
            {draft.lessons.map((lesson, lessonIdx) => (
              <Accordion.Item key={lessonIdx} value={lesson.title || `lesson-${lessonIdx}`}>
                <Accordion.Control>
                  {lessonIdx + 1}. {lesson.title}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md">
                    <TextInput
                      label="Lesson title"
                      value={lesson.title}
                      onChange={(e) => {
                        const lessons = [...draft.lessons];
                        lessons[lessonIdx] = { ...lesson, title: e.currentTarget.value };
                        setDraft({ ...draft, lessons });
                      }}
                    />
                    <Textarea
                      label="Content"
                      value={lesson.content}
                      onChange={(e) => {
                        const lessons = [...draft.lessons];
                        lessons[lessonIdx] = { ...lesson, content: e.currentTarget.value };
                        setDraft({ ...draft, lessons });
                      }}
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
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>

          {genError && (
            <Alert color="red" variant="light">
              {genError}
            </Alert>
          )}

          <Group>
            <Button variant="light" onClick={() => setDraft(null)}>
              Discard &amp; regenerate
            </Button>
            <Button variant="default" onClick={() => handleSave(false)} loading={saving}>
              {t("instructor.save")}
            </Button>
            <Button onClick={() => handleSave(true)} loading={saving}>
              {t("instructor.publish")}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
