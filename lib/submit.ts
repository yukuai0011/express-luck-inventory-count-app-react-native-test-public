import type { SubmitResult } from './types';

export const uuidv4 = (): string => {
  const rand = (max: number) =>
    (Date.now() + Math.floor(Math.random() * max)) % max;
  const hex = (num: number, width: number) =>
    num.toString(16).padStart(width, '0');
  const p1 = hex(rand(0xffffffff), 8);
  const p2 = hex(rand(0xffff), 4);
  const p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4);
  const p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4);
  const p5 = hex(rand(0xffffffffffff), 12);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};

export async function submitRecord(
  url: string,
  bearerToken: string | null | undefined,
  payload: Record<string, unknown>,
): Promise<SubmitResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-ms-client-tracking-id': uuidv4(),
  };
  const token = (bearerToken ?? '').toString().trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const ct = resp.headers.get('content-type') ?? '';
  const body = ct.includes('application/json')
    ? JSON.stringify(await resp.json())
    : await resp.text();

  return {
    ok: resp.status >= 200 && resp.status < 300,
    status: resp.status,
    body,
  };
}
