export const parseJson = (text: string): Record<string, unknown> | null => {
  try {
    const v = JSON.parse(text);
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

export const parseRecordingInfo = (
  value: Record<string, unknown>,
): { orderNo: string; recordingNo: number; locationCode: string } | null => {
  const orderNo = `${value.orderNo ?? ''}`.trim();
  const locationCode = `${value.locationCode ?? ''}`.trim();
  const recordingNo = Number(value.recordingNo);
  if (!orderNo || !locationCode || Number.isNaN(recordingNo)) return null;
  return { orderNo, recordingNo: Math.trunc(recordingNo), locationCode };
};

export const sanitizeEndpoint = (input: string): string => {
  let value = input.trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value;
};
