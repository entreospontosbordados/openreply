import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace-access', () => ({
  getCurrentWorkspaceContext: async () => ({ workspaceId: 'workspace', role: 'OWNER' }),
  canManageWorkspace: () => true,
}));

import { withZernioManagement } from '@/lib/zernio/route-handler';

afterEach(() => vi.unstubAllEnvs());

it('accepts the configured HTTPS origin when the proxy uses an internal URL', async () => {
  vi.stubEnv('NEXTAUTH_URL', 'https://openreply.example.com');
  const handler = vi.fn(async () => new Response('ok'));
  const response = await withZernioManagement(handler)(new Request('http://127.0.0.1:3000/api/zernio/settings', {
    method: 'POST', headers: { origin: 'https://openreply.example.com' },
  }));
  expect(response.status).toBe(200);
  expect(handler).toHaveBeenCalledOnce();
});

it('rejects a foreign origin even with spoofed forwarded headers', async () => {
  vi.stubEnv('NEXTAUTH_URL', 'https://openreply.example.com');
  const handler = vi.fn(async () => new Response('ok'));
  const response = await withZernioManagement(handler)(new Request('http://127.0.0.1:3000/api/zernio/settings', {
    method: 'POST', headers: { origin: 'https://foreign.example.com', 'x-forwarded-host': 'foreign.example.com', 'x-forwarded-proto': 'https' },
  }));
  expect(response.status).toBe(403);
  expect(handler).not.toHaveBeenCalled();
});
