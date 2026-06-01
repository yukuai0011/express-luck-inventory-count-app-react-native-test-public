import type { RecordingInfo } from './types';

export const sanitizeEndpoint = (input: string): string => {
  let value = input.trim();
  if (value.startsWith('<') && value.endsWith('>')) {
    value = value.slice(1, -1);
  }
  return value;
};

export const parseJson = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
};

export const parseRecordingInfo = (
  value: Record<string, unknown>
): RecordingInfo | null => {
  const orderNo = `${value.orderNo ?? ''}`.trim();
  const locationCode = `${value.locationCode ?? ''}`.trim();
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
