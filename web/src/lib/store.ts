import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { Reading } from "./types";

const DIR = path.join(process.cwd(), "data", "readings");

function file(id: string) {
  if (!/^[a-z0-9-]+$/i.test(id)) throw new Error("bad id");
  return path.join(DIR, `${id}.json`);
}

export async function listReadings(): Promise<Reading[]> {
  await fs.mkdir(DIR, { recursive: true });
  const names = (await fs.readdir(DIR)).filter((n) => n.endsWith(".json"));
  const all = await Promise.all(names.map((n) => fs.readFile(path.join(DIR, n), "utf8").then(JSON.parse)));
  return (all as Reading[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getReading(id: string): Promise<Reading | null> {
  try {
    return JSON.parse(await fs.readFile(file(id), "utf8"));
  } catch {
    return null;
  }
}

export async function saveReading(r: Reading): Promise<Reading> {
  await fs.mkdir(DIR, { recursive: true });
  r.updatedAt = new Date().toISOString();
  const tmp = file(r.id) + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(r, null, 2));
  await fs.rename(tmp, file(r.id));
  return r;
}

export async function deleteReading(id: string) {
  await fs.rm(file(id), { force: true });
}
