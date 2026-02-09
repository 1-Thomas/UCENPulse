import request from "supertest";
import { app } from "../server";
import { prisma, pool } from "../db";



async function registerAndLogin(email: string, password: string) {
  await request(app).post("/auth/register").send({ email, password, name: "T" });
  const login = await request(app).post("/auth/login").send({ email, password });
  return login.body.accessToken as string;
}

describe("Feature 3 integration: Activities + Metrics + Ownership", () => {
  const user1 = { email: "u1@example.com", password: "Password123!" };
  const user2 = { email: "u2@example.com", password: "Password123!" };

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  test("auth required for activities", async () => {
    await request(app).get("/activities").expect(401);
  });

  test("user can CRUD activity and metric", async () => {
    const token = await registerAndLogin(user1.email, user1.password);


    const created = await request(app)
      .post("/activities")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "run",
        startedAt: new Date().toISOString(),
        notes: "test",
        tags: ["cardio"],
      })
      .expect(201);

    const activityId = created.body.id;


    const metric = await request(app)
      .post(`/activities/${activityId}/metrics`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "distance", unit: "km", value: 5 })
      .expect(201);

    const metricId = metric.body.id;

   
    const fetched = await request(app)
      .get(`/activities/${activityId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(fetched.body.metrics.length).toBe(1);

  
    await request(app)
      .patch(`/metrics/${metricId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ value: 5.5 })
      .expect(200);

  
    await request(app)
      .delete(`/metrics/${metricId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    await request(app)
      .delete(`/activities/${activityId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  test("ownership enforced: user2 cannot read user1 activity", async () => {
    const token1 = await registerAndLogin(user1.email, user1.password);

    const created = await request(app)
      .post("/activities")
      .set("Authorization", `Bearer ${token1}`)
      .send({ type: "run", startedAt: new Date().toISOString() })
      .expect(201);

    const activityId = created.body.id;

    const token2 = await registerAndLogin(user2.email, user2.password);

    await request(app)
      .get(`/activities/${activityId}`)
      .set("Authorization", `Bearer ${token2}`)
      .expect(404);
  });
});
