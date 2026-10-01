import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(60, "Folder name is too long"),
});

export const renameFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(60, "Folder name is too long"),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type RenameFolderInput = z.infer<typeof renameFolderSchema>;
