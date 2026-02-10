import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
    plugins: [
        react(),
        viteStaticCopy({
            targets: [
                {
                    src: 'manifest.json',
                    dest: '.'
                },
                {
                    src: 'src/icons',
                    dest: '.'
                }
            ]
        })
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                // HTML entry for the popup page
                'popup': resolve(__dirname, 'src/popup/popup.html'),
                // JS-only entry points
                'content/index': resolve(__dirname, 'src/content/index.ts'),
                'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
            },
            output: {
                // Output as individual files, not chunks
                entryFileNames: '[name].js',
                chunkFileNames: 'shared/[name].js',
                assetFileNames: (assetInfo) => {
                    // Keep popup.html at root level, not in src/popup
                    if (assetInfo.name === 'popup.html') {
                        return 'popup.html';
                    }
                    return '[name].[ext]';
                },
            },
        },
    },
});
