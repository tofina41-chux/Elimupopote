import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { apiClient } from "../api/client";
import { useAuthContext } from "../context/AuthContext";

interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  createdAt: string;
}

export function LearnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/api/courses/published")
      .then((res) => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Stack p="md" maw={800}>
      <div>
        <Title order={2}>My Learning</Title>
        <Text c="dimmed" size="sm">
          Welcome back, {user?.fullName}
        </Text>
      </div>

      {loading && <Loader />}

      {!loading && courses.length === 0 && (
        <Card withBorder padding="xl" ta="center">
          <Text c="dimmed">
            You haven't been enrolled in any courses yet. Contact your admin.
          </Text>
        </Card>
      )}

      {courses.map((course) => (
        <Card key={course.id} withBorder padding="md">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <IconBook size={24} color="var(--mantine-color-blue-6)" />
              <div>
                <Text fw={600}>{course.title}</Text>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  {course.description}
                </Text>
                <Text size="xs" c="dimmed">
                  {course.language === "sw" ? "Swahili" : "English"}
                </Text>
              </div>
            </Group>
            <Button size="sm" onClick={() => navigate(`/courses/${course.id}`)}>
              Continue
            </Button>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
