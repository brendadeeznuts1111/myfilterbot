// TODO: Define RBAC related types and interfaces here
export interface UserRole {
  userId: string;
  role: string;
}

export interface Permission {
  resource: string;
  action: string;
}

export enum Role {
  Admin = "admin",
  Moderator = "moderator",
  User = "user",
}

export enum PermissionAction {
  Read = "read",
  Write = "write",
  Delete = "delete",
}

export enum PermissionResource {
  User = "user",
  Post = "post",
  Comment = "comment",
}

export interface RolePermission {
  role: Role;
  resource: PermissionResource;
  action: PermissionAction;
}
