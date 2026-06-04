export type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

export const parseJson = (text: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const parseRecordingInfo = (
  value: Record<string, unknown>
): RecordingInfo | null => {
  const orderNo = `${value.orderNo ?? ""}`.trim();
  const locationCode = `${value.locationCode ?? ""}`.trim();
  const recordingNo = Number(value.recordingNo);
  if (!orderNo || !locationCode || Number.isNaN(recordingNo)) {
    return null;
  }
  return {
    orderNo,
    recordingNo: Math.trunc(recordingNo),
    locationCode,
  };
};

export const sanitizeEndpoint = (input: string) => {
  let value = input.trim();
  if (value.startsWith("<") && value.endsWith(">")) {
    value = value.slice(1, -1);
  }
  return value;
};

export const uuidv4 = () => {
  const rand = (max: number) =>
    (Date.now() + Math.floor(Math.random() * max)) % max;
  const hex = (num: number, width: number) =>
    num.toString(16).padStart(width, "0");
  const p1 = hex(rand(0xffffffff), 8);
  const p2 = hex(rand(0xffff), 4);
  const p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4);
  const p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4);
  const p5 = hex(rand(0xffffffffffff), 12);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};
