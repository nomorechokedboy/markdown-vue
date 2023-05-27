<script lang="ts" setup>
import { computed, reactive } from 'vue'
import { source } from './storyFixture'
import VueMarkdown, { MarkdownOptions } from './VueMarkdown.vue'
import gfm from 'remark-gfm'
import raw from 'rehype-raw'

const state = reactive<
        MarkdownOptions & { enableRaw?: boolean; enableGfm?: boolean }
>({
        source,
        enableGfm: false,
        enableRaw: false
})
const remarkPlugins = computed(() => {
        if (state.enableGfm) {
                return [gfm]
        }

        return []
})
const rehypePlugins = computed(() => {
        if (state.enableRaw) {
                return [raw]
        }

        return []
})
</script>

<template>
  <Story>
    <Variant
      title="Usage"
      auto-props-disabled
    >
      <template #controls>
        <HstTextarea
          v-model="state.source"
          title="Source"
        />
        <HstCheckbox
          v-model="state.enableGfm"
          title="Use remark-gfm (to enable GFM)"
        />
        <HstCheckbox
          v-model="state.enableRaw"
          title="Use rehype-raw (to enable HTML)"
        />
      </template>
      <template #default>
        <VueMarkdown
          :key="
            JSON.stringify({
              gfm: state.enableGfm,
              raw: state.enableRaw
            })
          "
          :rehype-plugins="rehypePlugins"
          :remark-plugins="remarkPlugins"
          :source="state.source"
        />
      </template>
    </Variant>
  </Story>
</template>
