import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			'/api': { target: 'http://127.0.0.1:8000', rewrite: path => path.replace(/^\/api(?=\/|$)/, '') },
		},
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.js'],
		clearMocks: true,
	},
})
