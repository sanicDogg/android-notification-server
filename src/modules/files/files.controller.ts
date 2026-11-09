// src/modules/shared/files.controller.ts

import * as fs from 'fs/promises';

import { Hono } from 'hono';
import { filesService } from './files.service';
import { globalEventEmitter } from '../events.controller';

export const filesRouter = new Hono();

// GET /shared/list
filesRouter.get('/list', async (c) => {
  try {
    const dbFiles = await filesService.getAllFiles();
    const files = dbFiles.map((f) => ({
      id: f.id,
      name: f.name,
      size: f.size,
    }));
    return c.json({ files });
  } catch (error) {
    return c.json({
      error: 'Internal Server Error',
      details: (error as Error).message,
    }, 500);
  }
});

// POST /shared/upload
filesRouter.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody({ all: true });
    const filesInput = body['files'];

    if (!filesInput) {
      return c.json({ error: 'No files uploaded' }, 400);
    }

    const filesArray = Array.isArray(filesInput) ? filesInput : [filesInput];
    const validFiles = filesArray.filter((f): f is File => f instanceof File);

    if (validFiles.length === 0) {
      return c.json({ error: 'Invalid files format' }, 400);
    }

    const resultFiles: Array<{ id: string; name: string; size: number }> = [];

    for (const file of validFiles) {
      const dbFile = await filesService.saveSingleFile(file);
      if (dbFile === undefined) {
        console.warn(`[Upload API]: Failed to save file ${file.name}`);
        continue;
      }
      const fileData = { id: dbFile.id, name: dbFile.name, size: dbFile.size };
      resultFiles.push(fileData);

      globalEventEmitter.emit('broadcast', {
        type: 'FILE_ADDED',
        file: fileData,
      });
    }

    if (resultFiles.length === 0 && validFiles.length > 0) {
      return c.json({ error: 'All file uploads failed' }, 500);
    }

    return c.json({ files: resultFiles });
  } catch (error) {
    console.error('[Upload API Error]:', error);
    return c.json({
      error: 'File upload failed',
      details: (error as Error).message,
    }, 500);
  }
});

// GET /shared/download/:id
filesRouter.get('/download/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const file = await filesService.getFileById(id);
    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    const fileBuffer = await fs.readFile(file.path);

    c.header('Content-Type', file.mimeType);
    c.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.name)}"`,
    );
    c.header('Content-Length', file.size.toString());

    return c.body(fileBuffer);
  } catch (error) {
    return c.json({
      error: 'Failed to stream file',
      details: (error as Error).message,
    }, 500);
  }
});

// DELETE /shared/all
filesRouter.delete('/all', async (c) => {
  try {
    const success = await filesService.deleteAllFiles();

    if (!success) {
      return c.json({ error: 'Failed to clear storage' }, 500);
    }

    globalEventEmitter.emit('broadcast', {
      type: 'FILE_LIST_UPDATED',
      files: [],
    });

    return c.json({ success: true, message: 'All files deleted successfully' });
  } catch (error) {
    console.error('[Delete All API Error]:', error);
    return c.json({
      error: 'Failed to delete all files',
      details: (error as Error).message,
    }, 500);
  }
});

// DELETE /shared/:id
filesRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const deleted = await filesService.deleteFile(id);
    if (!deleted) {
      return c.json({ error: 'File not found' }, 404);
    }

    globalEventEmitter.emit('broadcast', {
      type: 'FILE_DELETED',
      fileId: id,
    });

    return c.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    return c.json({
      error: 'Failed to delete file',
      details: (error as Error).message,
    }, 500);
  }
});
