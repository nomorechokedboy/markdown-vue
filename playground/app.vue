<template>
  <div>Nuxt module playground!</div>
  <VueMarkdown :source="text" />
  <textarea
    v-model="text"
    cols="100"
    rows="100"
  />
</template>

<script lang="ts" setup>
import { ref } from 'vue'

const text = ref('# Hello, world!')
</script>
