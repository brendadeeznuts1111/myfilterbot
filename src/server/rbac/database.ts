/**
 * RBAC Database Module
 * Simple in-memory implementation for testing
 */

interface RbacDatabase {
  roles: Map<string, any>;
  permissions: Map<string, any>;
  userRoles: Map<string, string[]>;
  close: () => void;
}

let db: RbacDatabase | null = null;

export function initializeRbacDatabase(path: string = ':memory:'): void {
  db = {
    roles: new Map(),
    permissions: new Map(),
    userRoles: new Map(),
    close: () => {
      if (db) {
        db.roles.clear();
        db.permissions.clear();
        db.userRoles.clear();
        db = null;
      }
    }
  };
}

export function getRbacDatabase(): RbacDatabase {
  if (!db) {
    initializeRbacDatabase();
  }
  return db!;
}

export default { initializeRbacDatabase, getRbacDatabase };
