# VueJS version of `react-markdown`

[![codecov](https://codecov.io/github/nomorechokedboy/markdown-vue/branch/main/graph/badge.svg?token=8USH85MRVT)](https://codecov.io/github/nomorechokedboy/markdown-vue)
[![CI workflows](https://github.com/nomorechokedboy/markdown-vue/actions/workflows/ci.yml/badge.svg)](https://github.com/nomorechokedboy/markdown-vue/actions/workflows/ci.yml)
[![CD workflows](https://github.com/nomorechokedboy/markdown-vue/actions/workflows/cd.yaml/badge.svg)](https://github.com/nomorechokedboy/markdown-vue/actions/workflows/cd.yaml)

Vue component to render markdown without using `innerHTML`

## Feature highlights

- [x] [**Safe**](https://github.com/remarkjs/react-markdown#security) by default (no `innerHTML` or XSS attacks)
- [x] [Extensible](https://github.com/remarkjs/react-markdown#appendix-b-components) (you can pass your own component to use instead of `<h1>` for `# hi`)
- [x] [Plugins](https://github.com/remarkjs/react-markdown#plugins) (support [remark](https://github.com/remarkjs/remark) and [rehype](https://github.com/rehypejs/rehype) plugins)

The implementation is 90% shamelessly copied from https://github.com/remarkjs/react-markdown.

Changes include:

- Replacing `React` specific component creation with `VueJS` components
- Porting the implementation from `javascript` with `JSDoc` types to `typescript`
- Testing with `Vitest` instead of nodejs built-in test module
- Development and preview with `Histoire`
- Using `Vite` instead of `esbuild`

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

- [x] Port unit tests from from original library
- [x] Playground with github page
