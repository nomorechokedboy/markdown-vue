# VueJS version of `react-markdown`

The implementation is 90% shamelessly copied from https://github.com/remarkjs/react-markdown.

Changes include:

- Replacing React specific component creation with VueJS components
- Porting the implementation from javascript with JSDoc types to typescript
- Testing with vitest instead of nodejs built-in test module
- Development and preview with histoire

Please check the original repo for in-depth details on how to use.

## Installation

```sh
npm install markdown-vue # using npm

yarn add markdown-vue # using yarn

pnpm install markdown-vue # using pnpm
```

## Usage

```html
<script setup lang="ts">
	import VueMarkdown from 'markdown-vue'
</script>

<template>
	<VueMarkdown source="# Hello, *world*!" />
</template>
```

## TODO

- [ ] Port unit tests from from original library (wip)
- [ ] Playground with github page (wip)
