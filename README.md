# VueJS version of `react-markdown`

[![codecov](https://codecov.io/github/nomorechokedboy/markdown-vue/branch/main/graph/badge.svg?token=8USH85MRVT)](https://codecov.io/github/nomorechokedboy/markdown-vue)
[![CI workflows](https://github.com/nomorechokedboy/markdown-vue/actions/workflows/ci.yml/badge.svg)](https://github.com/nomorechokedboy/markdown-vue/actions/workflows/ci.yml)

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

<details>
<summary>VueJs</summary>

```html
<script setup lang="ts">
        import VueMarkdown from 'markdown-vue'
</script>

<template>
        <VueMarkdown source="# Hello, *world*!" />
</template>
```

</details>

<details>
<summary>NuxtJS</summary>

- Add `markdown-vue/nuxt` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
        modules: ['markdown-vue/nuxt']
})
```

```html
<!-- VueMarkdown is auto imported -->
<template>
        <VueMarkdown source="# Hello, *world*!" />
</template>
```

</details>

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

## Note

Currently, your page will be crash if you use this component in Nuxt project dev mode and I can't figure out why. If you figure out the solution, please feel free to create a PR. I will gladly to merge it.

## TODO

- [x] Port unit tests from from original library
- [x] Playground with github page
- [ ] Fix `NuxtJs` dev error

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/my-module/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/my-module
[npm-downloads-src]: https://img.shields.io/npm/dm/my-module.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/my-module
[license-src]: https://img.shields.io/npm/l/my-module.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://npmjs.com/package/my-module
[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt.js
[nuxt-href]: https://nuxt.com
