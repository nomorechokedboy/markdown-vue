import { defineNuxtModule, createResolver, addComponent } from '@nuxt/kit'

// Module options TypeScript interface definition
export interface ModuleOptions {}

export default defineNuxtModule<ModuleOptions>({
        meta: {
                name: 'markdown-vue',
                configKey: 'markdownVue'
        },
        // Default configuration options of the Nuxt module
        defaults: {},
        setup(options, nuxt) {
                const resolver = createResolver(import.meta.url)

                addComponent({
                        name: 'VueMarkdown', // name of the component to be used in vue templates
                        filePath: resolver.resolve(
                                'runtime/components/VueMarkdown'
                        )
                })
        }
})
