import { describe, expect, test } from "bun:test";
import { parseJson, parseRecordingInfo, sanitizeEndpoint } from "@/lib/qr";

describe("parseJson", () => {
  test("returns the parsed object for valid JSON", () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });

  test("returns null for invalid JSON", () => {
    expect(parseJson("not json")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseJson("")).toBeNull();
  });
});

describe("parseRecordingInfo", () => {
  test("returns RecordingInfo when all required fields are present", () => {
    expect(
      parseRecordingInfo({ orderNo: "1234", recordingNo: 1, locationCode: "FG HU" })
    ).toEqual({ orderNo: "1234", recordingNo: 1, locationCode: "FG HU" });
  });

  test("coerces numeric strings for recordingNo", () => {
    expect(
      parseRecordingInfo({ orderNo: "1", recordingNo: "42", locationCode: "X" })
    ).toEqual({ orderNo: "1", recordingNo: 42, locationCode: "X" });
  });

  test("returns null when any required field is missing", () => {
    expect(parseRecordingInfo({ orderNo: "1", recordingNo: 1 })).toBeNull();
  });

  test("returns null when recordingNo is NaN", () => {
    expect(
      parseRecordingInfo({ orderNo: "1", recordingNo: "abc", locationCode: "X" })
    ).toBeNull();
  });

  test("truncates fractional recordingNo", () => {
    expect(
      parseRecordingInfo({ orderNo: "1", recordingNo: 3.7, locationCode: "X" })
    ).toEqual({ orderNo: "1", recordingNo: 3, locationCode: "X" });
  });
});

describe("sanitizeEndpoint", () => {
  test("strips angle brackets", () => {
    expect(sanitizeEndpoint("<https://example.com>")).toBe("https://example.com");
  });

  test("trims whitespace", () => {
    expect(sanitizeEndpoint("  https://example.com  ")).toBe("https://example.com");
  });
});
