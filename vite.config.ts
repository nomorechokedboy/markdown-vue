import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
        process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }

        const test =
                process.env.TEST_ENV === 'csr'
                        ? {
                                  globals: true,
                                  environment: 'jsdom',
                                  include: [
                                          'src/runtime/components/VueMarkdown.test.ts'
                                  ]
                          }
                        : undefined

        return {
                build: {
                        lib: {
                                entry: path.resolve(
                                        __dirname,
                                        './src/entry.ts'
                                ),
                                name: 'MarkdownVue',
                                fileName: (format) =>
                                        `markdown-vue.${format}.js`,
                                formats: ['es', 'cjs', 'umd']
                        },
                        rollupOptions: {
                                external: ['vue'],
                                output: {
                                        globals: {
                                                vue: 'Vue'
                                        }
                                }
                        },
                        outDir: 'dist-csr'
                },
                plugins: [vue(), dts()],
                test,
                server: {
                        watch: {
                                ignored: [
                                        '**/.histoire/**',
                                        '**/dist/**',
                                        '**/dist-csr/**'
                                ]
                        }
                }
        }
})
