// ============================================================================
// Seed script: creates one demo tenant with a full set of users + a manually
// authored (not AI-generated) example course, so the app is demoable
// immediately after `npx prisma db seed`.
//
// NOTE on auth: in a real Supabase setup, `authUserId` would come from
// actually creating users via supabase.auth.admin.createUser(). For this
// MVP seed we just generate uuids locally — the mock JWT flow in
// supabaseAuth.service.ts only needs authUserId to be a stable, unique
// string that matches what verifyOtpAndIssueToken signs into the JWT `sub`.
// ============================================================================
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ElimuPopote...");

  // --- Superadmin (no tenant) -------------------------------------------
  const superadmin = await prisma.user.upsert({
    where: { phone: "+254700000001" },
    update: {},
    create: {
      authUserId: randomUUID(),
      phone: "+254700000001",
      fullName: "Asha Superadmin",
      role: "SUPERADMIN",
      tenantId: null,
    },
  });

  // --- Tenant -------------------------------------------------------------
  const tenant = await prisma.tenant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Safiri Logistics Ltd",
      seatsLimit: 20,
    },
  });

  // --- Tenant Admin ---------------------------------------------------------
  const tenantAdmin = await prisma.user.upsert({
    where: { phone: "+254700000002" },
    update: {},
    create: {
      authUserId: randomUUID(),
      phone: "+254700000002",
      fullName: "Brenda Mwangi",
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
    },
  });

  // --- Instructor -----------------------------------------------------------
  const instructor = await prisma.user.upsert({
    where: { phone: "+254700000003" },
    update: {},
    create: {
      authUserId: randomUUID(),
      phone: "+254700000003",
      fullName: "Daniel Otieno",
      role: "INSTRUCTOR",
      tenantId: tenant.id,
    },
  });

  // --- Learner --------------------------------------------------------------
  const learner = await prisma.user.upsert({
    where: { phone: "+254700000004" },
    update: {},
    create: {
      authUserId: randomUUID(),
      phone: "+254700000004",
      fullName: "Faith Chebet",
      role: "LEARNER",
      tenantId: tenant.id,
    },
  });

  // --- Example course (manually authored, PUBLISHED) ------------------------
  const existingCourse = await prisma.course.findFirst({
    where: { tenantId: tenant.id, title: "Customer Service Excellence" },
  });

  const course =
    existingCourse ??
    (await prisma.course.create({
      data: {
        tenantId: tenant.id,
        instructorId: instructor.id,
        title: "Customer Service Excellence",
        description:
          "A practical course covering the fundamentals of delivering excellent customer service in a logistics business.",
        language: "en",
        status: "PUBLISHED",
        learningObjectives: [
          "Greet and respond to customers professionally",
          "Handle complaints calmly and effectively",
          "Apply active listening in customer conversations",
        ],
        lessons: {
          create: [
            {
              tenantId: tenant.id,
              order: 0,
              title: "Welcoming Customers",
              content:
                "First impressions matter. This lesson covers professional greetings, tone of voice, and body language when welcoming customers in person, by phone, or by SMS.",
              quiz: {
                create: {
                  tenantId: tenant.id,
                  questions: {
                    create: [
                      {
                        tenantId: tenant.id,
                        order: 0,
                        question: "What is the most important part of greeting a customer?",
                        correctIndex: 1,
                        options: {
                          create: [
                            { tenantId: tenant.id, order: 0, text: "Speaking quickly" },
                            { tenantId: tenant.id, order: 1, text: "Being warm and attentive" },
                            { tenantId: tenant.id, order: 2, text: "Avoiding eye contact" },
                            { tenantId: tenant.id, order: 3, text: "Skipping introductions" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
            {
              tenantId: tenant.id,
              order: 1,
              title: "Handling Complaints",
              content:
                "Complaints are opportunities. This lesson teaches the LISTEN-APOLOGIZE-SOLVE framework for de-escalating frustrated customers and resolving issues quickly.",
              quiz: {
                create: {
                  tenantId: tenant.id,
                  questions: {
                    create: [
                      {
                        tenantId: tenant.id,
                        order: 0,
                        question: "What should you do first when a customer complains?",
                        correctIndex: 0,
                        options: {
                          create: [
                            { tenantId: tenant.id, order: 0, text: "Listen fully without interrupting" },
                            { tenantId: tenant.id, order: 1, text: "Defend the company immediately" },
                            { tenantId: tenant.id, order: 2, text: "Transfer the call right away" },
                            { tenantId: tenant.id, order: 3, text: "Ignore the complaint" },
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        liveSessions: {
          create: [
            {
              tenantId: tenant.id,
              title: "Live Q&A: Customer Service Roleplay",
              datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              meetingLink: "https://meet.google.com/example-link",
            },
          ],
        },
      },
    }));

  // Enroll the learner in the example course.
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: learner.id, courseId: course.id } },
    update: {},
    create: { tenantId: tenant.id, userId: learner.id, courseId: course.id },
  });

  console.log("✅ Seed complete:");
  console.log({
    superadmin: superadmin.phone,
    tenantAdmin: tenantAdmin.phone,
    instructor: instructor.phone,
    learner: learner.phone,
    tenant: tenant.name,
    course: course.title,
  });
  console.log("ℹ️  Use OTP code 123456 to log in as any of the above phone numbers.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
