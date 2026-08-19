import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const envPath = resolve(process.cwd(), ".env.local");

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name} in .env.local.`);
  return value;
}

export function setLocalEnv(name: string, value: string): void {
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const lines = current ? current.replace(/\r\n/g, "\n").split("\n") : [];
  const assignment = `${name}=${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${name}=`));
  if (index >= 0) lines[index] = assignment;
  else lines.push(assignment);
  const output = `${lines.filter((line, lineIndex) => line || lineIndex < lines.length - 1).join("\n")}\n`;
  writeFileSync(envPath, output, { encoding: "utf8", mode: 0o600 });
}
