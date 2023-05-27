import { describe, it, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { setup, $fetch } from '@nuxt/test-utils'

const isCSR = process.env.TEST_ENV === 'csr'

describe.skipIf(isCSR)('ssr', async () => {
        await setup({
                rootDir: fileURLToPath(
                        new URL('./fixtures/basic', import.meta.url)
                )
        })

        it('renders the index page', async () => {
                // Get response to a server-rendered page with `$fetch`.
                const html = await $fetch('/')
                expect(html).toContain('<div>basic</div>')
                expect(html).toContain('<h1>Hello world</h1>')
        })
})
