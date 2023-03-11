import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, '/lib/index.ts'),
			name: 'MarkdownVue',
			fileName: (format) => `markdown-vue.${format}.js`
		},
		rollupOptions: {
			external: ['vue'],
			output: {
				globals: {
					vue: 'Vue'
				}
			}
		}
	},
	plugins: [vue()],
	test: {
		globals: true,
		environment: 'jsdom'
	},
	server: {
		watch: {
			ignored: ['**/.histoire/**', '**/dist/**']
		}
	}
})
