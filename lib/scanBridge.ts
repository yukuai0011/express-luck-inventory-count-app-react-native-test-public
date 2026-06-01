let handler: ((value: string) => void) | null = null;

export const registerScanHandler = (fn: (value: string) => void): void => {
  handler = fn;
};

export const consumeScanHandler = (): ((value: string) => void) | null => {
  const h = handler;
  handler = null;
  return h;
};
