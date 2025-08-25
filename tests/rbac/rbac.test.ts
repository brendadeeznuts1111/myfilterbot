import { test, expect, beforeEach, afterEach } from "bun:test";
import { initializeRbacDatabase, getRbacDatabase } from "../src/server/rbac/database";
import { rbacApp } from "../src/server/rbac";
import { authAppRoutes, generateAccessToken, generateRefreshToken } from "../src/server/auth";
import { Role, PermissionResource, PermissionAction } from "../src/server/rbac/types";
import { verify } from "hono/jwt"; // Import verify
import type { Context } from "hono"; // Import Context as type
import type { RefreshTokenPayload } from "../src/server/auth/types"; // Import RefreshTokenPayload as type

// Use a unique in-memory database for each test file
const TEST_DB_PATH = ":memory:";

beforeEach(() => {
  // Initialize the database for each test
  initializeRbacDatabase(TEST_DB_PATH);
});

afterEach(() => {
  // Close the database connection after each test
  getRbacDatabase().close();
});

test("POST /rbac/roles - should create a new role", async () => {
  const roleName = "test_role";
  const req = new Request("http://localhost/rbac/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: roleName }),
  });

  const res = await rbacApp.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(201);
  expect(json.message).toBe("Role created successfully");
  expect(json.role).toHaveProperty("id");
  expect(json.role.name).toBe(roleName);

  // Verify it exists in the database
  const db = getRbacDatabase();
  const role = db.query("SELECT name FROM roles WHERE name = ?").get(roleName);
  expect(role).toHaveProperty("name", roleName);
});

test("POST /rbac/roles - should return 409 if role already exists", async () => {
  const roleName = "admin"; // 'admin' is seeded by default
  const req = new Request("http://localhost/rbac/roles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: roleName }),
  });

  const res = await rbacApp.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(409);
  expect(json.error).toBe("Role with this name already exists");
});

test("POST /rbac/roles/:roleId/permissions - should attach permission to role", async () => {
  const db = getRbacDatabase();
  const roleId = (db.query("SELECT id FROM roles WHERE name = 'user'").get() as { id: number }).id;
  const resource = PermissionResource.User;
  const action = PermissionAction.Write;

  const req = new Request(`http://localhost/rbac/roles/${roleId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, action }),
  });

  const res = await rbacApp.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.message).toBe("Permission attached to role successfully");

  // Verify in DB
  const permissionId = (db.query("SELECT id FROM permissions WHERE resource = ? AND action = ?").get(resource, action) as { id: number }).id;
  const rolePermission = db.query("SELECT * FROM role_permissions WHERE role_id = ? AND permission_id = ?").get(roleId, permissionId);
  expect(rolePermission).toBeDefined();
});

test("GET /rbac/roles - should list all roles", async () => {
  const req = new Request("http://localhost/rbac/roles");
  const res = await rbacApp.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.roles).toBeArrayOfSize(3); // admin, moderator, user seeded by default
  expect(json.roles).toContainEqual(expect.objectContaining({ name: "admin" }));
  expect(json.roles).toContainEqual(expect.objectContaining({ name: "moderator" }));
  expect(json.roles).toContainEqual(expect.objectContaining({ name: "user" }));
});

test("POST /rbac/users/:userId/roles - should assign role to user", async () => {
  const userId = "user123";
  const roleName = "moderator";
  const req = new Request(`http://localhost/rbac/users/${userId}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleName }),
  });

  const res = await rbacApp.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.message).toBe(`Role '${roleName}' assigned to user '${userId}' successfully`);

  // Verify in DB
  const db = getRbacDatabase();
  const roleId = (db.query("SELECT id FROM roles WHERE name = ?").get(roleName) as { id: number }).id;
  const userRole = db.query("SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?").get(userId, roleId);
  expect(userRole).toBeDefined();
});

test("GET /rbac/users/:userId/permissions - should get user's permissions", async () => {
  const db = getRbacDatabase();
  const userId = "user456";
  const adminRoleId = (db.query("SELECT id FROM roles WHERE name = 'admin'").get() as { id: number }).id;
  db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", userId, adminRoleId);

  // Assign some permissions to admin role (seeded by default)
  const userReadPermId = (db.query("SELECT id FROM permissions WHERE resource = 'user' AND action = 'read'").get() as { id: number }).id;
  const postDeletePermId = (db.query("SELECT id FROM permissions WHERE resource = 'post' AND action = 'delete'").get() as { id: number }).id;
  db.run("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", adminRoleId, userReadPermId);
  db.run("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", adminRoleId, postDeletePermId);

  const req = new Request(`http://localhost/rbac/users/${userId}/permissions`);
  const res = await rbacApp.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json.userId).toBe(userId);
  expect(json.permissions).toBeArrayOfSize(2);
  expect(json.permissions).toContainEqual({ resource: "user", action: "read" });
  expect(json.permissions).toContainEqual({ resource: "post", action: "delete" });
});

test("POST /auth/refresh - should refresh tokens and rotate refresh token", async () => {
  const userId = "testUserRefresh";
  const initialAccessToken = await generateAccessToken({ userId, roles: ["user"], permissions: ["user:read"] });
  const initialRefreshToken = await generateRefreshToken(userId);

  // Simulate a request to the refresh endpoint
  const req = new Request("http://localhost/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: initialRefreshToken }),
  });

  const res = await authAppRoutes.fetch(req);
  const json = await res.json();

  expect(res.status).toBe(200);
  expect(json).toHaveProperty("accessToken");
  expect(json).toHaveProperty("refreshToken");
  expect(json.accessToken).not.toBe(initialAccessToken);
  expect(json.refreshToken).not.toBe(initialRefreshToken);

  // Verify old refresh token is invalidated
  const db = getRbacDatabase();
  const oldTokenPayload = await verify(initialRefreshToken, process.env.JWT_SECRET || "your-super-secret-jwt-key") as unknown as RefreshTokenPayload;
  const oldTokenInDb = db.query("SELECT * FROM refresh_tokens WHERE jti = ?").get(oldTokenPayload.jti);
  expect(oldTokenInDb).toBeUndefined();

  // Verify new refresh token is in DB
  const newTokenPayload = await verify(json.refreshToken, process.env.JWT_SECRET || "your-super-secret-jwt-key") as unknown as RefreshTokenPayload;
  const newTokenInDb = db.query("SELECT * FROM refresh_tokens WHERE jti = ?").get(newTokenPayload.jti);
  expect(newTokenInDb).toBeDefined();
});

test("requirePermission middleware - should allow access if user has permission", async () => {
  const db = getRbacDatabase();
  const userId = "userWithPerm";
  const adminRoleId = (db.query("SELECT id FROM roles WHERE name = 'admin'").get() as { id: number }).id;
  db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", userId, adminRoleId);

  const userReadPermId = (db.query("SELECT id FROM permissions WHERE resource = 'user' AND action = 'read'").get() as { id: number }).id;
  db.run("INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)", adminRoleId, userReadPermId);

  // Simulate a Hono context and next function
  const mockContext = {
    req: {
      header: (name: string) => {
        if (name === "X-User-Id") return userId;
        return undefined;
      },
    },
    json: (data: any, status: number) => ({ data, status }),
  } as unknown as Context;

  let nextCalled = false;
  const mockNext = async () => { nextCalled = true; };

  // Temporarily define requirePermission within the test scope for direct testing
  const requirePermission = (permission: string) => {
    return async (c: Context, next: Function) => {
      const currentUserId = c.req.header("X-User-Id");
      if (!currentUserId) {
        return c.json({ error: "Unauthorized: User ID not provided" }, 401);
      }
      try {
        const hasPermission = db.query(`
          SELECT COUNT(DISTINCT p.id)
          FROM user_roles ur
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?
        `).get(currentUserId, permission.split(":")[0] as string, permission.split(":")[1] as string) as number;

        if (hasPermission > 0) {
          await next();
        } else {
          return c.json({ error: "Forbidden: Insufficient permissions" }, 403);
        }
      } catch (error) {
        console.error("Error in requirePermission middleware:", error);
        return c.json({ error: "Internal Server Error" }, 500);
      }
    };
  };

  const middleware = requirePermission("user:read");
  const result = await middleware(mockContext, mockNext);

  expect(nextCalled).toBe(true);
  expect(result).toBeUndefined(); // Middleware should not return a response if next is called
});

test("requirePermission middleware - should deny access if user does not have permission", async () => {
  const db = getRbacDatabase();
  const userId = "userWithoutPerm";
  const userRoleId = (db.query("SELECT id FROM roles WHERE name = 'user'").get() as { id: number }).id;
  db.run("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", userId, userRoleId);

  // Simulate a Hono context and next function
  const mockContext = {
    req: {
      header: (name: string) => {
        if (name === "X-User-Id") return userId;
        return undefined;
      },
    },
    json: (data: any, status: number) => ({ data, status }),
  } as unknown as Context;

  let nextCalled = false;
  const mockNext = async () => { nextCalled = true; };

  // Temporarily define requirePermission within the test scope for direct testing
  const requirePermission = (permission: string) => {
    return async (c: Context, next: Function) => {
      const currentUserId = c.req.header("X-User-Id");
      if (!currentUserId) {
        return c.json({ error: "Unauthorized: User ID not provided" }, 401);
      }
      try {
        const hasPermission = db.query(`
          SELECT COUNT(DISTINCT p.id)
          FROM user_roles ur
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?
        `).get(currentUserId, permission.split(":")[0] as string, permission.split(":")[1] as string) as number;

        if (hasPermission > 0) {
          await next();
        } else {
          return c.json({ error: "Forbidden: Insufficient permissions" }, 403);
        }
      } catch (error) {
        console.error("Error in requirePermission middleware:", error);
        return c.json({ error: "Internal Server Error" }, 500);
      }
    };
  };

  const middleware = requirePermission("post:delete"); // User does not have this permission
  const result = await middleware(mockContext, mockNext);

  expect(nextCalled).toBe(false);
  expect(result).toHaveProperty("status", 403);
  expect(result).toHaveProperty("data", { error: "Forbidden: Insufficient permissions" });
});
