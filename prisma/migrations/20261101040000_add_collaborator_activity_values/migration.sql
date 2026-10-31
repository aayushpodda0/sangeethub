-- Existing databases may have the original PlaylistActivityType enum while
-- the 0_init baseline already contains these values for fresh databases.
ALTER TYPE "PlaylistActivityType" ADD VALUE IF NOT EXISTS 'COLLABORATOR_JOINED';
ALTER TYPE "PlaylistActivityType" ADD VALUE IF NOT EXISTS 'COLLABORATOR_REMOVED';
ALTER TYPE "PlaylistActivityType" ADD VALUE IF NOT EXISTS 'COLLABORATOR_PERMISSION_CHANGED';
