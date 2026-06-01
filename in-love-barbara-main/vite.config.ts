import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

const githubRepository = process.env.GITHUB_REPOSITORY;
const githubRepositoryName = githubRepository?.split('/')[1];
const githubPagesBase = process.env.GITHUB_ACTIONS && githubRepositoryName ? `/${githubRepositoryName}/` : '/';

export default defineConfig(({ mode }) => ({
  base: githubPagesBase,
  server: {
    host: '::',
    port: 8080,
  },
  plugins: [react(), mode === 'development' && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('jspdf') ||
            id.includes('html2canvas') ||
            id.includes('dompurify') ||
            id.includes('jspdf-autotable')
          ) {
            return 'pdf-vendor';
          }

          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }

          if (id.includes('node_modules/date-fns')) {
            return 'date-vendor';
          }

          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@tanstack/react-query')
          ) {
            return 'react-vendor';
          }

          if (id.includes('node_modules/@radix-ui') || id.includes('node_modules/lucide-react')) {
            return 'ui-vendor';
          }

          return undefined;
        },
      },
    },
    reportCompressedSize: false,
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
}));
