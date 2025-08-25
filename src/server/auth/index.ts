import { Hono } from "hono";
export const authAppRoutes = new Hono(); // TODO: Hono instance
export function registerAuthRoutes() {}
export function generateAccessToken() { return ""; }
export function generateRefreshToken() { return ""; }
