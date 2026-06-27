import { useState } from "react";
import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";

interface DraftQuiz {
  question: string;
  options: string[];
  correctIndex: number;
}
interface DraftLesson {
  title: string;
  content: string;
  quiz: DraftQuiz[];
}
interface Draft {
  title: string;
  description: string;
  learningObjectives: string[];
  lessons: DraftLesson[];
}

// Instructor flow:
//   1) Describe the course in free text (English or Swahili).
//   2) POST /api/courses/generate -> AI (or mock) returns a structured draft.
//   3) Instructor edits titles/content/lessons inline (full CRUD on the
//      in-memory draft before anything is persisted).
//   4) "Save as draft" -> POST /api/courses persists it with status=DRAFT.
//   5) "Publish" -> PATCH /api/courses/:id/publish makes it visible to
//      enrolled learners.
export function CourseBuilder() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [language, setLanguage] = useState<string>("en");
  const [generating, setGenerating] = useState(false);
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const { data } = await apiClient.post("/api/courses/generate", { prompt });
      setDraft(data.draft);
      setLanguage(data.language);
      setSavedCourseId(null);
    } catch {
      // In a production build, surface this via a notification component.
      console.error("AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function updateLesson(index: number, patch: Partial<DraftLesson>) {
    if (!draft) return;
    const lessons = [...draft.lessons];
    lessons[index] = { ...lessons[index], ...patch };
    setDraft({ ...draft, lessons });
  }

  function removeLesson(index: number) {
    if (!draft) return;
    setDraft({ ...draft, lessons: draft.lessons.filter((_, i) => i !== index) });
  }

  function addLesson() {
    if (!draft) return;
    setDraft({
      ...draft,
      lessons: [...draft.lessons, { title: "", content: "", quiz: [] }],
    });
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const { data } = await apiClient.post("/api/courses", { ...draft, language });
      setSavedCourseId(data.id);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!savedCourseId) return;
    await apiClient.patch(`/api/courses/${savedCourseId}/publish`);
  }

  return (
    <Stack p="md" maw={760}>
      <Title order={2}>{t("courseBuilder.title")}</Title>

      <Textarea
        label={t("courseBuilder.promptLabel")}
        placeholder={t("courseBuilder.promptPlaceholder")}
        value={prompt}
        onChange={(e) => setPrompt(e.currentTarget.value)}
        minRows={3}
      />
      <Group>
        <Button onClick={handleGenerate} loading={generating} disabled={prompt.trim().length < 3}>
          {generating ? t("courseBuilder.generating") : t("courseBuilder.generate")}
        </Button>
      </Group>

      {draft && (
        <>
          <Divider my="sm" />
          <TextInput
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.currentTarget.value })}
          />
          <Textarea
            label="Description"
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.currentTarget.value })}
          />

          {draft.lessons.map((lesson, i) => (
            <Card key={i} withBorder padding="md">
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Lesson {i + 1}</Text>
                <ActionIcon color="red" variant="subtle" onClick={() => removeLesson(i)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              <TextInput
                label="Lesson title"
                value={lesson.title}
                onChange={(e) => updateLesson(i, { title: e.currentTarget.value })}
                mb="sm"
              />
              <Textarea
                label="Lesson content"
                value={lesson.content}
                onChange={(e) => updateLesson(i, { content: e.currentTarget.value })}
                minRows={3}
              />
              <Text size="sm" c="dimmed" mt="xs">
                {lesson.quiz.length} quiz question(s)
              </Text>
            </Card>
          ))}

          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={addLesson}>
            {t("courseBuilder.addLesson")}
          </Button>

          <Group mt="md">
            <Button onClick={handleSave} loading={saving}>
              {t("courseBuilder.save")}
            </Button>
            <Button onClick={handlePublish} disabled={!savedCourseId} variant="outline">
              {t("courseBuilder.publish")}
            </Button>
          </Group>
        </>
      )}
    </Stack>
  );
}
