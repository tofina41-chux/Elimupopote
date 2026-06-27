import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Anchor, Button, Card, List, Stack, Tabs, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { apiClient } from "../api/client";
import { db, cacheCourseForOffline, type OfflineLesson } from "../db/db";
import { LessonQuiz } from "../components/LessonQuiz";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

interface LiveSession {
  id: string;
  title: string;
  datetime: string;
  meetingLink: string;
}

// ============================================================================
// Offline-first read path:
//   - On mount, ALWAYS read from Dexie first (instant, works offline).
//   - If online, ALSO fetch the latest from the server and re-cache it
//     (cacheCourseForOffline), then refresh the on-screen lesson list. This
//     gives "stale-while-revalidate" behavior: instant render from cache,
//     silently updated if the network has something newer.
//   - The very first time a learner opens a course, Dexie is empty, so the
//     network fetch is what populates it — after that, the course is fully
//     available offline indefinitely (until the device's storage is
//     cleared or the learner is removed from the course).
// ============================================================================
export function LearnerCourseView() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const online = useOnlineStatus();

  const [lessons, setLessons] = useState<OfflineLesson[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    async function loadFromCache() {
      const cached = await db.lessons.where("courseId").equals(courseId!).sortBy("order");
      setLessons(cached);
    }

    async function loadFromNetwork() {
      try {
        const { data } = await apiClient.get(`/api/courses/${courseId}`);
        await cacheCourseForOffline(data);
        setLiveSessions(data.liveSessions ?? []);
        await loadFromCache();
      } catch (err) {
        console.warn("[LearnerCourseView] network fetch failed, using cache only:", err);
      }
    }

    loadFromCache();
    if (online) loadFromNetwork();
  }, [courseId, online]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId);

  return (
    <Stack p="md" maw={760}>
      <Tabs defaultValue="lessons">
        <Tabs.List>
          <Tabs.Tab value="lessons">{t("learner.lessons")}</Tabs.Tab>
          <Tabs.Tab value="live">{t("learner.liveSessions")}</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="lessons" pt="md">
          {!activeLesson ? (
            <List spacing="sm">
              {lessons.map((lesson) => (
                <List.Item key={lesson.id}>
                  <Anchor onClick={() => setActiveLessonId(lesson.id)}>{lesson.title}</Anchor>
                </List.Item>
              ))}
            </List>
          ) : (
            <Stack>
              <Button variant="subtle" onClick={() => setActiveLessonId(null)} w="fit-content">
                ← {t("learner.lessons")}
              </Button>
              <Title order={3}>{activeLesson.title}</Title>
              <Text>{activeLesson.content}</Text>

              {activeLesson.quiz.length > 0 && (
                <>
                  <Title order={5} mt="md">
                    {t("learner.startQuiz")}
                  </Title>
                  <LessonQuiz
                    lessonId={activeLesson.id}
                    courseId={courseId!}
                    questions={activeLesson.quiz}
                    onComplete={() => {}}
                  />
                </>
              )}
            </Stack>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="live" pt="md">
          <Stack>
            {liveSessions.length === 0 && <Text c="dimmed">—</Text>}
            {liveSessions.map((session) => (
              <Card key={session.id} withBorder padding="md">
                <Text fw={600}>{session.title}</Text>
                <Text size="sm" c="dimmed">
                  {new Date(session.datetime).toLocaleString()}
                </Text>
                <Button
                  component="a"
                  href={session.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  mt="sm"
                  size="xs"
                  disabled={!online}
                >
                  {t("learner.joinSession")}
                </Button>
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
