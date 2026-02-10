import request from "supertest";
import { app } from "../server";
import { prisma, pool } from "../db";

async function registerAndLogin(email: string, password: string, testKey: string) {
  const reg = await request(app)
    .post("/auth/register")
    .set("x-test-key", testKey)
    .send({ email, password, name: "T" });

  if (![201, 409].includes(reg.status)) throw new Error(`register failed: ${reg.status}`);

  const login = await request(app)
    .post("/auth/login")
    .set("x-test-key", testKey)
    .send({ email, password });

  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);

  return login.body.accessToken as string;
}

describe("Feature 8: reports summary", () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  test("returns aggregated data for the authenticated user", async () => {
    const token = await registerAndLogin("rep@test.com", "Password123!", "feature8");

    const startedAt = new Date(Date.now() - 30 * 60000).toISOString();
    const endedAt = new Date().toISOString();

    const act = await request(app)
      .post("/activities")
      .set("Authorization", `Bearer ${token}`)
      .set("x-test-key", "feature8")
      .send({ type: "run", startedAt, endedAt, tags: ["cardio"] })
      .expect(201);

    
    await request(app)
      .post(`/activities/${act.body.id}/metrics`)
      .set("Authorization", `Bearer ${token}`)
      .set("x-test-key", "feature8")
      .send({ name: "distance", unit: "km", value: 5 })
      .expect(201);

    const rep = await request(app)
      .get("/reports/summary")
      .set("Authorization", `Bearer ${token}`)
      .set("x-test-key", "feature8")
      .expect(200);

    expect(rep.body.totalActivities).toBeGreaterThanOrEqual(1);
    expect(rep.body.byType.run.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(rep.body.metrics)).toBe(true);
  });
});
