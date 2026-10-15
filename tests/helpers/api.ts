/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi } from "vitest";

/**
 * Auto-stubbing Prisma mock: any `prismaMock.model.method` is a vi.fn() created on first access,
 * and `$transaction(cb)` runs the callback against the same mock. Tests then program only the
 * calls they care about. This lets us exercise REAL route handlers + REAL authorization code
 * without a database.
 */
function createPrismaMock() {
  const models: Record<string, Record<string, any>> = {};
  const root: any = new Proxy(
    {},
    {
      get(_t, model: string) {
        if (model === "$transaction") return async (fn: (tx: unknown) => unknown) => fn(root);
        if (model === "$queryRaw") return (models.$queryRaw ??= { fn: vi.fn() }).fn;
        return (models[model] ??= new Proxy(
          {},
          {
            get(target: Record<string, any>, method: string) {
              return (target[method] ??= vi.fn());
            },
          },
        ));
      },
    },
  );
  return root;
}

export const prismaMock = createPrismaMock();

export function jsonRequest(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

export const routeParams = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

const user = (id: string) => ({ id, name: `User ${id}`, username: `user_${id}` });

/** Shape returned by the real loadPlaylist() query. */
export function playlistFixture(overrides: Record<string, any> = {}) {
  return {
    id: "p1",
    name: "Road Trip",
    slug: "road-trip",
    description: null,
    coverUrl: null,
    ownerId: "owner",
    isPublic: false,
    isCollaborative: true,
    folderId: null,
    folder: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: user("owner"),
    collaborations: [] as any[],
    tracks: [] as any[],
    activities: [] as any[],
    ...overrides,
  };
}

export const collaborator = (
  id: string,
  permission: "CONTRIBUTOR" | "MODERATOR" = "CONTRIBUTOR",
  canRemoveOthers = false,
) => ({ userId: id, permission, canRemoveOthers, user: user(id) });

export const trackEntry = (id: string, trackId: string, addedById: string) => ({
  id,
  trackId,
  position: 0,
  addedAt: new Date(),
  addedById,
  addedBy: user(addedById),
  track: { id: trackId, title: `Track ${trackId}` },
});
