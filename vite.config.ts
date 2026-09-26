import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { extractOntologyFromText } from './src/lib/ontologyExtractor'

function resolveBasePath(): string {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;

  // In GitHub Actions, derive Pages base from owner/repo when not explicitly provided.
  if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_REPOSITORY) {
    const [, repoName] = process.env.GITHUB_REPOSITORY.split('/');
    if (repoName) return `/${repoName}/`;
  }

  return '/';
}

function localAiBuilderPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'local-ai-builder-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/generate-ontology' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const { description } = JSON.parse(body || '{}');

              const openaiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
              const azureKey = env.AZURE_OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
              const apiKey = openaiKey || azureKey;

              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error:
                      'OpenAI API Key not configured. Please add OPENAI_API_KEY=your_key in your .env or .env.local file.',
                  })
                );
                return;
              }

              const isAzure =
                !openaiKey &&
                Boolean(azureKey && (env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT));

              const baseURL = isAzure
                ? env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_ENDPOINT
                : env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

              const model = isAzure
                ? undefined
                : env.OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';

              const azureDeployment = isAzure
                ? env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_OPENAI_DEPLOYMENT
                : undefined;

              const ontology = await extractOntologyFromText(description, {
                apiKey,
                baseURL,
                model,
                isAzure,
                azureDeployment,
              });

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ontology }));
            } catch (err: unknown) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              const message = err instanceof Error ? err.message : String(err);
              res.end(JSON.stringify({ error: message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localAiBuilderPlugin(env)],
    base: resolveBasePath(),
    build: {
      outDir: 'build',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('cytoscape')) return 'graph-vendor';
            if (id.includes('react') || id.includes('zustand') || id.includes('framer-motion'))
              return 'ui-vendor';
            return 'vendor';
          },
        },
      },
    },
    server: {
      proxy: {
        // GitHub OAuth device-flow endpoints don't support CORS — proxy in dev
        '/__github/login/device/code': {
          target: 'https://github.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace('/__github', ''),
        },
        '__github/login/oauth/access_token': {
          target: 'https://github.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace('/__github', ''),
        },
      },
    },
  };
});
