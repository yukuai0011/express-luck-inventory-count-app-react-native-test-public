import { test, expect, describe } from 'bun:test';
import {
  parseJson,
  parseRecordingInfo,
  sanitizeEndpoint,
} from '../lib/profile';

describe('parseJson', () => {
  test('parses valid JSON object', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });
  test('returns null for invalid JSON', () => {
    expect(parseJson('not json')).toBeNull();
  });
  test('returns null for non-object', () => {
    expect(parseJson('123')).toBeNull();
  });
});

describe('sanitizeEndpoint', () => {
  test('trims whitespace', () => {
    expect(sanitizeEndpoint('  https://x  ')).toBe('https://x');
  });
  test('strips angle brackets', () => {
    expect(sanitizeEndpoint('<https://x>')).toBe('https://x');
  });
  test('returns empty string unchanged', () => {
    expect(sanitizeEndpoint('')).toBe('');
  });
});

describe('parseRecordingInfo', () => {
  test('parses a valid object', () => {
    expect(
      parseRecordingInfo({
        orderNo: '1234',
        recordingNo: 2,
        locationCode: 'FG HU',
      })
    ).toEqual({ orderNo: '1234', recordingNo: 2, locationCode: 'FG HU' });
  });
  test('truncates fractional recordingNo', () => {
    expect(
      parseRecordingInfo({
        orderNo: '1',
        recordingNo: 2.7,
        locationCode: 'A',
      })
    ).toEqual({ orderNo: '1', recordingNo: 2, locationCode: 'A' });
  });
  test('returns null when orderNo is missing', () => {
    expect(
      parseRecordingInfo({ recordingNo: 1, locationCode: 'A' })
    ).toBeNull();
  });
  test('returns null when recordingNo is NaN', () => {
    expect(
      parseRecordingInfo({ orderNo: '1', recordingNo: 'x', locationCode: 'A' })
    ).toBeNull();
  });
  test('returns null when locationCode is missing', () => {
    expect(
      parseRecordingInfo({ orderNo: '1', recordingNo: 1 })
    ).toBeNull();
  });
});
