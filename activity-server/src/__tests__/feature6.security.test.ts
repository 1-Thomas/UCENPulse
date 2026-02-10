import request from "supertest";
import { app } from "../server";
import { prisma, pool } from "../db";

describe("Feature 6: security + readiness", () => {
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  test("ready endpoint responds (no auth required)", async () => {
    const r = await request(app).get("/ready");
    expect([200, 503]).toContain(r.status);
  });

  test("auth rate limit blocks eventually", async () => {
    const key = "feature6";
    const email = "rl@test.com";
    const password = "Password123!";

    const reg = await request(app)
      .post("/auth/register")
      .set("x-test-key", key)
      .send({ email, password, name: "RL" });

    expect([201, 409]).toContain(reg.status);

    let got429 = false;

    for (let i = 0; i < 50; i++) {
      const r = await request(app)
        .post("/auth/login")
        .set("x-test-key", key)
        .send({ email, password });

      if (r.status === 429) {
        got429 = true;
        break;
      }

      expect(r.status).toBe(200);
    }

    expect(got429).toBe(true);
  });
});
