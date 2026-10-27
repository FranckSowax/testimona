// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { newIdempotencyKey, useIdempotencyKey } from './useIdempotencyKey';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('newIdempotencyKey', () => {
  it('renvoie un UUID v4', () => {
    expect(newIdempotencyKey()).toMatch(UUID_V4);
  });

  it('construit un UUID v4 quand randomUUID manque', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0xff),
    });
    expect(newIdempotencyKey()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => bytes.fill(0),
    });
    expect(newIdempotencyKey()).toBe('00000000-0000-4000-8000-000000000000');
  });
});

describe('useIdempotencyKey', () => {
  it('donne une clé après le montage et la renouvelle', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const first = result.current[0];
    expect(first).toMatch(UUID_V4);
    act(() => result.current[1]());
    expect(result.current[0]).toMatch(UUID_V4);
    expect(result.current[0]).not.toBe(first);
  });
});
