export type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

export type Profile = RecordingInfo & {
  apiEndpoint: string;
  bearerToken?: string | null;
};

export type OutboxItem = {
  url: string;
  headers: { Authorization?: string | null };
  payload: Record<string, unknown>;
  ts: string;
};

export type ScanMode = 'qr' | 'barcode';

export type SubmitResult = {
  ok: boolean;
  status: number;
  body: string;
};
