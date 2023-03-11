<script lang="ts" setup>
import { html } from 'property-information'
import remarkParse from 'remark-parse'
import remarkRehype, { Options as RemarkRehypeOptions } from 'remark-rehype'
import { PluggableList, unified } from 'unified'
import { VFile } from 'vfile'
import { Fragment, h, useAttrs } from 'vue'
import { childrenToVue } from './astToVue'
import rehypeFilter from './rehypeFilter'
import type {
	AllowElement,
	Components,
	TransformImage,
	TransformLink,
	TransformLinkTarget,
	TransformLinkTargetType
} from './types'

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

const {
	remarkPlugins,
	rehypePlugins,
	allowedElements,
	allowElement,
	disallowedElements,
	unwrapDisallowed,
	transformLinkUri,
	skipHtml,
	rawSourcePos,
	transformImageUri,
	linkTarget,
	includeElementIndex,
	sourcePos,
	components,
	remarkRehypeOptions,
	source
} = defineProps<MarkdownOptions>()

const processor = unified()
	.use(remarkParse)
	.use(remarkPlugins || [])
	.use(remarkRehype, {
		...remarkRehypeOptions,
		allowDangerousHtml: true
	})
	.use(rehypePlugins || [])
	.use(rehypeFilter, {
		allowedElements,
		allowElement,
		disallowedElements,
		unwrapDisallowed
	})
const file = new VFile()
file.value = source
const hastNode = processor.runSync(processor.parse(file), file)

let result = h(
	Fragment,
	{},
	childrenToVue(
		{
			schema: html,
			listDepth: 0,
			options: {
				transformLinkUri,
				skipHtml,
				rawSourcePos,
				transformImageUri,
				linkTarget,
				includeElementIndex,
				sourcePos,
				components
			}
		},
		hastNode
	)
)

const attrs = useAttrs()
if (attrs.class) {
	result = h('div', { class: attrs.class }, result)
}
</script>

<template>
	<component :is="result" />
</template>
