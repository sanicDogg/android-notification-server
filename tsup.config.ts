/// <reference types="node" />
import { defineConfig } from 'tsup';
import * as fs from 'node:fs';
import * as path from 'node:path';

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['esm'],
  clean: true,
  bundle: true,
  noExternal: [/.*/],
  publicDir: 'drizzle', 
  
  async onSuccess() {
    const outputFile = path.join(process.cwd(), 'dist', 'app.js');
    
    if (fs.existsSync(outputFile)) {
      let content = fs.readFileSync(outputFile, 'utf8');
      
      // Changing 'sqlite' import to builtin Node.js 'node:sqlite'
      if (content.includes('from "sqlite"')) {
        content = content.replace(/from\s+"sqlite"/g, 'from "node:sqlite"');
        fs.writeFileSync(outputFile, content, 'utf8');
        console.log('⚡️ [Post-Build] Successfully patched "sqlite" import to "node:sqlite"');
      }
    }
  }
});
