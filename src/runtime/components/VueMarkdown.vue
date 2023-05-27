<script lang="ts" setup>
import { html } from 'property-information'
import remarkParse from 'remark-parse'
import remarkRehype, { Options as RemarkRehypeOptions } from 'remark-rehype'
import { PluggableList, unified } from 'unified'
import { VFile } from 'vfile'
import { computed, Fragment, h, useAttrs } from 'vue'
import { childrenToVue } from '../astToVue'
import rehypeFilter from '../rehypeFilter'
import type {
        AllowElement,
        Components,
        TransformImage,
        TransformLink,
        TransformLinkTarget,
        TransformLinkTargetType
} from '../types'

export interface MarkdownOptions {
        source: string
        remarkPlugins?: PluggableList
        rehypePlugins?: PluggableList
        remarkRehypeOptions?: RemarkRehypeOptions
        sourcePos?: boolean
        rawSourcePos?: boolean
        skipHtml?: boolean
        includeElementIndex?: boolean
        transformLinkUri?: false | TransformLink | null
        transformImageUri?: TransformImage
        linkTarget?: TransformLinkTarget | TransformLinkTargetType
        components?: Components
        allowedElements?: string[]
        disallowedElements?: string[]
        allowElement?: AllowElement
        unwrapDisallowed?: boolean
}

const props = defineProps<MarkdownOptions>()

const processor = computed(() =>
        unified()
                .use(props.remarkPlugins || [])
                .use(remarkRehype, {
                        ...props.remarkRehypeOptions,
                        allowDangerousHtml: true
                })
                .use(props.rehypePlugins || [])
                .use(rehypeFilter, {
                        allowedElements: props.allowedElements,
                        allowElement: props.allowElement,
                        disallowedElements: props.disallowedElements,
                        unwrapDisallowed: props.unwrapDisallowed
                })
)

const result = computed(() => {
        const file = new VFile()
        file.value = props.source
        const hastNode = processor.value.runSync(
                processor.value.parse(file),
                file
        )

        if (hastNode.type !== 'root') {
                throw new TypeError('Expected a `root` node')
        }

        let markup = h(
                Fragment,
                childrenToVue(
                        {
                                schema: html,
                                listDepth: 0,
                                options: {
                                        transformLinkUri:
                                                props.transformLinkUri,
                                        skipHtml: props.skipHtml,
                                        rawSourcePos: props.rawSourcePos,
                                        transformImageUri:
                                                props.transformImageUri,
                                        linkTarget: props.linkTarget,
                                        includeElementIndex:
                                                props.includeElementIndex,
                                        sourcePos: props.sourcePos,
                                        components: props.components
                                }
                        },
                        hastNode
                )
        )

        const attrs = useAttrs()
        if (attrs.class) {
                markup = h('div', { class: attrs.class }, markup)
        }

        return markup
})
</script>

<template>
  <component :is="result" />
</template>
