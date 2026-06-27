// ============================================================================
// Dexie (IndexedDB) database — the client-side offline data store.
// ----------------------------------------------------------------------------
// Four tables:
//   - courses     : flattened course metadata (one row per enrolled course)
//   - lessons     : lesson content + embedded quiz, denormalized for fast
//                   offline reads (no joins needed on-device)
//   - progress    : local quiz attempts. This is the LEARNER'S SOURCE OF
//                   TRUTH while offline — the server's `progress` table is
//                   only updated once syncManager.ts replays the queue.
//   - syncQueue   : an append-only log of "things that happened offline and
//                   still need to reach the server". Each entry corresponds
//                   1:1 with a `progress` write the learner made on-device.
//
// WHY A SEPARATE syncQueue TABLE INSTEAD OF JUST DIFFING `progress`?
// Diffing would require us to track a "synced" flag per progress row and
// handle out-of-order retries carefully. A queue is simpler to reason about:
// every local mutation appends a queue entry; syncManager.ts drains the
// queue in order and only removes entries the server confirms it applied.
// If the queue is empty, the device is fully synced.
// ============================================================================
import Dexie, { type Table } from "dexie";

export interface OfflineCourse {
  id: string; // matches server Course.id
  title: string;
  description: string;
  language: string;
  status: string;
  cachedAt: string; // ISO timestamp of when this was downloaded
}

export interface OfflineQuizOption {
  id: string;
  text: string;
  order: number;
}

export interface OfflineQuizQuestion {
  id: string;
  question: string;
  correctIndex: number;
  order: number;
  options: OfflineQuizOption[];
}

export interface OfflineLesson {
  id: string; // matches server Lesson.id
  courseId: string;
  title: string;
  content: string;
  order: number;
  quiz: OfflineQuizQuestion[]; // empty array if the lesson has no quiz
}

export interface OfflineProgress {
  lessonId: string; // primary key — one progress row per lesson per device
  courseId: string;
  completed: boolean;
  score: number | null;
  clientUpdatedAt: string; // ISO timestamp, set the moment the learner finishes the quiz
  synced: boolean; // convenience flag mirrored from syncQueue presence, for fast UI reads
}

export interface SyncQueueEntry {
  id?: number; // auto-incrementing local id
  lessonId: string;
  completed: boolean;
  score: number | null;
  clientUpdatedAt: string;
  attempts: number; // retry count, used for simple backoff
  createdAt: string;
}

class ElimuPopoteDB extends Dexie {
  courses!: Table<OfflineCourse, string>;
  lessons!: Table<OfflineLesson, string>;
  progress!: Table<OfflineProgress, string>;
  syncQueue!: Table<SyncQueueEntry, number>;

  constructor() {
    super("elimupopote");
    this.version(1).stores({
      courses: "id",
      lessons: "id, courseId",
      progress: "lessonId, courseId, synced",
      syncQueue: "++id, lessonId, createdAt",
    });
  }
}

export const db = new ElimuPopoteDB();

// ============================================================================
// cacheCourseForOffline
// ----------------------------------------------------------------------------
// Called the first time a learner opens a course (see LearnerCourseView.tsx).
// Downloads the full nested course detail from the API and flattens it into
// the `courses` and `lessons` tables so the learner can keep studying with
// zero connectivity from this point forward.
// ============================================================================
export async function cacheCourseForOffline(course: {
  id: string;
  title: string;
  description: string;
  language: string;
  status: string;
  lessons: {
    id: string;
    title: string;
    content: string;
    order: number;
    quiz: { questions: OfflineQuizQuestion[] } | null;
  }[];
}) {
  await db.transaction("rw", db.courses, db.lessons, async () => {
    await db.courses.put({
      id: course.id,
      title: course.title,
      description: course.description,
      language: course.language,
      status: course.status,
      cachedAt: new Date().toISOString(),
    });

    for (const lesson of course.lessons) {
      await db.lessons.put({
        id: lesson.id,
        courseId: course.id,
        title: lesson.title,
        content: lesson.content,
        order: lesson.order,
        quiz: lesson.quiz?.questions ?? [],
      });
    }
  });
}

// ============================================================================
// recordLessonAttempt
// ----------------------------------------------------------------------------
// Called when a learner finishes a lesson/quiz, online or offline. Writes
// the result to `progress` immediately (so the UI reflects it instantly)
// AND appends a `syncQueue` entry (so syncManager.ts knows to push it to the
// server next time the device is online).
// ============================================================================
export async function recordLessonAttempt(params: {
  lessonId: string;
  courseId: string;
  completed: boolean;
  score: number | null;
}) {
  const clientUpdatedAt = new Date().toISOString();

  await db.transaction("rw", db.progress, db.syncQueue, async () => {
    await db.progress.put({
      lessonId: params.lessonId,
      courseId: params.courseId,
      completed: params.completed,
      score: params.score,
      clientUpdatedAt,
      synced: false,
    });

    await db.syncQueue.add({
      lessonId: params.lessonId,
      completed: params.completed,
      score: params.score,
      clientUpdatedAt,
      attempts: 0,
      createdAt: clientUpdatedAt,
    });
  });
}
