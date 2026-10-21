import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * Админка живёт по секретному адресу из VITE_ADMIN_PATH (например /staff-k7q2m9x4/).
 * /admin.html снаружи отдаёт 404 — и в dev, и в сборке.
 * Это только «спрятать дверь»: настоящая защита — на бэкенде (Telegram + сотрудник в базе + PIN).
 */
function secretAdmin(path: string): Plugin {
  const clean = path.replace(/^\/+|\/+$/g, '')
  return {
    name: 'secret-admin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const [p, q] = (req.url ?? '').split('?')
        if (p === '/admin.html') {
          res.statusCode = 404
          return res.end('Not found')
        }
        if (p === `/${clean}` || p === `/${clean}/` || p === `/${clean}/index.html`) {
          req.url = '/admin.html' + (q ? `?${q}` : '')
        }
        next()
      })
    },
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist', import.meta.url))
      const from = resolve(dist, 'admin.html')
      const to = resolve(dist, clean, 'index.html')
      if (!existsSync(from)) return
      mkdirSync(dirname(to), { recursive: true })
      renameSync(from, to)
    },
  }
}

// Две точки входа: index.html — клиентский Mini App, admin.html — админка
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const adminPath = env.VITE_ADMIN_PATH
  if (!adminPath) throw new Error('Задай VITE_ADMIN_PATH в .env — секретный адрес админки, например staff-k7q2m9x4')

  return {
    plugins: [vue(), secretAdmin(adminPath)],
    define: { __BUILD__: JSON.stringify(new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })) },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': { target: 'http://localhost:8000', changeOrigin: true, ws: true },
      },
    },
    build: {
      rollupOptions: {
        input: {
          client: fileURLToPath(new URL('./index.html', import.meta.url)),
          admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
        },
      },
    },
  }
})
