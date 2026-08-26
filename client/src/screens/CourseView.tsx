import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft, IconCheck, IconCircleCheck, IconWifiOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";
import { LessonQuiz } from "../components/LessonQuiz";
import { cacheCourseForOffline, db } from "../db/db";
import type { OfflineCourse, OfflineLesson, OfflineProgress } from "../db/db";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

// Learner-facing course screen. Tries the network first (and refreshes the
// offline cache on success); if the request fails — e.g. no connectivity —
// falls back to whatever was previously cached in Dexie, so a learner who
// opened this course before can keep studying with zero network. Lesson
// completion always writes to Dexie first (see LessonQuiz -> db.ts), which
// is what makes this work offline in both directions.
export function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const online = useOnlineStatus();

  const [course, setCourse] = useState<OfflineCourse | null>(null);
  const [lessons, setLessons] = useState<OfflineLesson[]>([]);
  const [progress, setProgress] = useState<Record<string, OfflineProgress>>({});
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineFallback, setOfflineFallback] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    const id = courseId;
    let cancelled = false;

    async function load() {
      try {
        const { data } = await apiClient.get(`/api/courses/${id}`);
        if (cancelled) return;
        await cacheCourseForOffline(data);
        setCourse({
          id: data.id,
          title: data.title,
          description: data.description,
          language: data.language,
          status: data.status,
          cachedAt: new Date().toISOString(),
        });
        setLessons(
          [...data.lessons]
            .sort((a: any, b: any) => a.order - b.order)
            .map((l: any) => ({
              id: l.id,
              courseId: data.id,
              title: l.title,
              content: l.content,
              order: l.order,
              quiz: l.quiz?.questions ?? [],
            }))
        );
      } catch {
        // Offline, or the request otherwise failed — fall back to cache.
        if (cancelled) return;
        setOfflineFallback(true);
        const cachedCourse = await db.courses.get(id);
        const cachedLessons = await db.lessons.where("courseId").equals(id).sortBy("order");
        setCourse(cachedCourse ?? null);
        setLessons(cachedLessons);
      } finally {
        if (!cancelled) setLoading(false);
      }

      const progressRows = await db.progress.where("courseId").equals(id).toArray();
      if (!cancelled) {
        setProgress(Object.fromEntries(progressRows.map((p) => [p.lessonId, p])));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (loading) {
    return (
      <Group justify="center" p="xl">
        <Loader />
      </Group>
    );
  }

  if (!course) {
    return (
      <Stack p="md" maw={800}>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate(-1)}
          w="fit-content"
        >
          Back
        </Button>
        <Alert color="red">
          This course isn't available offline yet. Connect to the internet and open it once
          first.
        </Alert>
      </Stack>
    );
  }

  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? null;
  const completedCount = lessons.filter((l) => progress[l.id]?.completed).length;

  return (
    <Stack p="md" maw={800}>
      <Group justify="space-between" align="flex-start">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => (activeLesson ? setActiveLessonId(null) : navigate(-1))}
          w="fit-content"
          px={0}
        >
          {activeLesson ? t("learner.myCourses") : "Back"}
        </Button>
        {offlineFallback && (
          <Badge color="gray" variant="light" leftSection={<IconWifiOff size={12} />}>
            Showing cached content
          </Badge>
        )}
      </Group>

      {!activeLesson && (
        <>
          <div>
            <Title order={2}>{course.title}</Title>
            <Text c="dimmed" mt={4}>
              {course.description}
            </Text>
            <Text size="sm" c="kilele.7" fw={600} mt="xs">
              {completedCount}/{lessons.length} lessons complete
            </Text>
          </div>

          <Stack gap="sm">
            {lessons.map((lesson, idx) => {
              const done = progress[lesson.id]?.completed;
              return (
                <Card
                  key={lesson.id}
                  withBorder
                  padding="md"
                  style={{ cursor: "pointer" }}
                  onClick={() => setActiveLessonId(lesson.id)}
                >
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Box
                        w={32}
                        h={32}
                        style={{
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: done ? "var(--mantine-color-kilele-1)" : "var(--mantine-color-gray-1)",
                          color: done ? "var(--mantine-color-kilele-8)" : "var(--mantine-color-gray-6)",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {done ? <IconCheck size={16} /> : idx + 1}
                      </Box>
                      <div>
                        <Text fw={600}>{lesson.title}</Text>
                        {lesson.quiz.length > 0 && (
                          <Text size="xs" c="dimmed">
                            {lesson.quiz.length} question{lesson.quiz.length === 1 ? "" : "s"}
                            {done && progress[lesson.id]?.score != null
                              ? ` · scored ${progress[lesson.id].score}%`
                              : ""}
                          </Text>
                        )}
                      </div>
                    </Group>
                    <Button size="xs" variant={done ? "light" : "filled"}>
                      {done ? "Review" : t("learner.startQuiz")}
                    </Button>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        </>
      )}

      {activeLesson && (
        <Stack gap="lg">
          <div>
            <Title order={3}>{activeLesson.title}</Title>
          </div>
          <Text style={{ whiteSpace: "pre-wrap" }}>{activeLesson.content}</Text>

          {activeLesson.quiz.length > 0 ? (
            progress[activeLesson.id]?.completed ? (
              <Card withBorder padding="lg">
                <Group gap="xs">
                  <IconCircleCheck size={20} color="var(--mantine-color-kilele-6)" />
                  <Text fw={600}>{t("learner.lessonComplete")}</Text>
                </Group>
                <Text size="sm" c="dimmed" mt={4}>
                  {t("learner.score")}: {progress[activeLesson.id].score}%
                </Text>
              </Card>
            ) : (
              <LessonQuiz
                lessonId={activeLesson.id}
                courseId={course.id}
                questions={activeLesson.quiz}
                onComplete={(score) =>
                  setProgress((prev) => ({
                    ...prev,
                    [activeLesson.id]: {
                      lessonId: activeLesson.id,
                      courseId: course.id,
                      completed: true,
                      score,
                      clientUpdatedAt: new Date().toISOString(),
                      synced: online,
                    },
                  }))
                }
              />
            )
          ) : (
            <Button onClick={() => setActiveLessonId(null)} w="fit-content">
              Back to lessons
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  );
}
