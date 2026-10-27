import { describe, expect, it } from 'vitest';
import { canManageMembers, canWrite, hasRole } from './roles';

describe('rôles', () => {
  it('compare les rangs', () => {
    expect(hasRole('owner', 'coordinator')).toBe(true);
    expect(hasRole('treasurer', 'coordinator')).toBe(false);
    expect(hasRole('viewer', 'viewer')).toBe(true);
  });

  it('dérive les droits', () => {
    expect(canManageMembers('coordinator')).toBe(true);
    expect(canManageMembers('contributor')).toBe(false);
    expect(canWrite('contributor')).toBe(true);
    expect(canWrite('viewer')).toBe(false);
    expect(canWrite(null)).toBe(false);
  });
});
