import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine if this is a development build
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  
  return {
    // Server configuration
    server: {
      host: "::",
      port: 8080,
      open: isDevelopment,
      cors: true,
    },
    
    // Preview server configuration
    preview: {
      host: "::",
      port: 4173,
      cors: true,
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      minify: isProduction ? 'esbuild' : false,
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks: isProduction ? {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
            query: ['@tanstack/react-query'],
            router: ['react-router-dom'],
          } : undefined,
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    
    // Plugin configuration
    plugins: [
      react(),
      isDevelopment && componentTagger(),
    ].filter(Boolean),
    
    // Path resolution
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    
    // Environment variable configuration
    envPrefix: 'VITE_',
    
    // Define global constants
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BUILD_MODE__: JSON.stringify(mode),
    },
    
    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
      ],
    },
    
    // CSS configuration
    css: {
      devSourcemap: isDevelopment,
    },
  };
});
