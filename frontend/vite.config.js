import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'

export default defineConfig({
    plugins: [
        react(),
        {
            name: 'esp32-proxy',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (!req.url?.startsWith('/esp32/')) return next()

                    const espIp = req.headers['x-esp32-ip']
                    if (!espIp) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' })
                        return res.end('Missing x-esp32-ip header')
                    }

                    const targetPath = req.url.replace(/^\/esp32/, '')

                    const proxyReq = http.request(
                        `http://${espIp}${targetPath}`,
                        {
                            method: req.method,
                            headers: { ...req.headers, host: espIp },
                            timeout: 10000,
                        },
                        (proxyRes) => {
                            res.writeHead(proxyRes.statusCode, proxyRes.headers)
                            proxyRes.pipe(res)
                        }
                    )

                    proxyReq.on('error', (err) => {
                        res.writeHead(502, { 'Content-Type': 'text/plain' })
                        res.end(`Proxy error: ${err.message}`)
                    })

                    req.pipe(proxyReq)
                })
            }
        }
    ],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
            '/voice-activities': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            }
        }
    }
})
