import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { apiClient } from "../api/client";
import { useAuthContext } from "../context/AuthContext";

interface Course {
  id: string;
  title: string;
  description: string;
  status: "DRAFT" | "PUBLISHED";
  language: string;
  createdAt: string;
  lessons?: { id: string }[];
}

export function InstructorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/api/courses")
      .then((res) => setCourses(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handlePublish(courseId: string) {
    await apiClient.patch(`/api/courses/${courseId}/publish`);
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, status: "PUBLISHED" } : c))
    );
  }

  return (
    <Stack p="md" maw={800}>
      <Group justify="space-between">
        <div>
          <Title order={2}>My Courses</Title>
          <Text c="dimmed" size="sm">
            Welcome back, {user?.fullName}
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => navigate("/courses/new")}
        >
          New Course
        </Button>
      </Group>

      {loading && <Loader />}

      {!loading && courses.length === 0 && (
        <Card withBorder padding="xl" ta="center">
          <Text c="dimmed" mb="md">
            You haven't created any courses yet.
          </Text>
          <Button onClick={() => navigate("/courses/new")}>
            Create your first course
          </Button>
        </Card>
      )}

      {courses.map((course) => (
        <Card key={course.id} withBorder padding="md">
          <Group justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Group gap="xs" mb={4}>
                <Text fw={600}>{course.title}</Text>
                <Badge
                  color={course.status === "PUBLISHED" ? "green" : "gray"}
                  size="sm"
                >
                  {course.status}
                </Badge>
                <Badge variant="outline" size="sm">
                  {course.language === "sw" ? "Swahili" : "English"}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" lineClamp={2}>
                {course.description}
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                {new Date(course.createdAt).toLocaleDateString()}
              </Text>
            </div>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                onClick={() => navigate(`/courses/${course.id}/edit`)}
              >
                Edit
              </Button>
              {course.status === "DRAFT" && (
                <Button
                  size="xs"
                  color="green"
                  onClick={() => handlePublish(course.id)}
                >
                  Publish
                </Button>
              )}
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}
