import fs from 'fs-extra'
import path from 'path'
import uniqid from 'uniqid'
import environment from '../environment/env'

const pendingDirPath = path.join(environment.userBaseDirectory, 'pending')

export async function ensurePendingDirectory(): Promise<void> {
  await fs.ensureDir(pendingDirPath)
}

// Moves an uploaded temp file (from multer) into the pending directory and
// returns the id used to find it again later. Keeps the original extension
// so finalize() can still derive it the same way api/user.js's contentPath()
// already does.
export async function stagePendingContent(tempFilePath: string): Promise<string> {
  const stagedContentId = uniqid() + path.extname(tempFilePath)
  await fs.move(tempFilePath, path.join(pendingDirPath, stagedContentId))
  return stagedContentId
}

export function stagedContentPath(stagedContentId: string): string {
  return path.join(pendingDirPath, stagedContentId)
}

// Moves staged content to its final resting place once a scan passes.
export async function finalizeContent(stagedContentId: string, finalAbsolutePath: string): Promise<void> {
  await fs.move(stagedContentPath(stagedContentId), finalAbsolutePath, { overwrite: true })
}

// Deletes staged content once a scan rejects it or processing gives up.
export async function deletePendingContent(stagedContentId: string): Promise<void> {
  await fs.remove(stagedContentPath(stagedContentId))
}
