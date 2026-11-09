// src/modules/files/files.service.ts

import * as fs from 'fs/promises';
import * as path from 'path';

import { db } from '../../db';
import { sharedFiles } from '../../db/schema';
import { eq } from 'drizzle-orm';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
console.log('upload_dir:', UPLOAD_DIR);

export class FilesService {
  constructor() {
    fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error);
  }

  async getAllFiles() {
    try {
      return await db.select().from(sharedFiles).execute();
    } catch (error) {
      console.error('[DB_ERROR] Failed to fetch files:', error);
      throw error;
    }
  }

  async getFileById(id: string) {
    try {
      const result = await db.select().from(sharedFiles).where(
        eq(sharedFiles.id, id),
      ).execute();
      return result[0] || null;
    } catch (error) {
      console.error(`[DB_ERROR] Failed to fetch file ${id}:`, error);
      throw error;
    }
  }

  async saveSingleFile(file: File) {
    const fileId = crypto.randomUUID();
    const extension = path.extname(file.name);
    const storageName = `${fileId}${extension}`;
    const filePath = path.join(UPLOAD_DIR, storageName);

    let isFileWritten = false;

    try {
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(arrayBuffer));
      isFileWritten = true;

      const [dbFile] = await db.insert(sharedFiles).values({
        id: fileId,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        path: filePath,
        createdAt: Date.now(),
      }).returning();

      if (!dbFile) {
        throw new Error('Database insert returned empty result');
      }

      console.log(
        `[DB] File saved successfully: ${dbFile.name} (${dbFile.id})`,
      );
      return dbFile;
    } catch (error) {
      console.error(
        `[FilesService Error] Failed to save file "${file.name}":`,
        error,
      );

      // If we wrote file, but DB insert failed - delete junk
      if (isFileWritten) {
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.error(
            `[FilesService Cleanup Error] Could not delete orphaned file ${filePath}:`,
            unlinkError,
          );
        }
      }

      return undefined;
    }
  }

  async deleteFile(id: string) {
    const file = await this.getFileById(id);
    if (!file) return false;

    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.warn(
        `[IO_WARN] Local file not found on disk during deletion: ${file.path}`,
      );
    }

    await db.delete(sharedFiles).where(eq(sharedFiles.id, id)).execute();
    console.log(`[DB] File metadata removed: ${id}`);
    return true;
  }

  async deleteAllFiles(): Promise<boolean> {
    const allFiles = await this.getAllFiles();
    for (const file of allFiles) {
      try {
        await fs.unlink(file.path);
      } catch (e) {
        console.error(`Cannot remove file from disk: ${file.path}`, e);
      }
    }
    await db.delete(sharedFiles).execute();
    return true;
  }
}

export const filesService = new FilesService();
