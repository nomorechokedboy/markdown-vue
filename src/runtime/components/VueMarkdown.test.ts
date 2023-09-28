import { mount } from '@vue/test-utils'
import fs from 'fs/promises'
import raw from 'rehype-raw'
import gfm from 'remark-gfm'
import toc from 'remark-toc'
import { visit } from 'unist-util-visit'
import { assert, describe, expect, it } from 'vitest'
import { h, ref } from 'vue'
import { Components } from '../types'
import VueMarkdown, { MarkdownOptions } from './VueMarkdown.vue'

type TestTable = {
        desc: string
        props: MarkdownOptions & JSX.IntrinsicAttributes
        expected: string
}
const emptyLink = 'Empty: []()'
const linkToRustLang = 'This is [a link](https://rust-lang.org/) to Rust Lang'
const expectedNinJAImg = '<p>This is <img src="/ninJA.png" alt="an image">.</p>'
const ninJAImg = 'This is ![an image](/ninJA.png).'
const emptyImage = '<p><img src="" alt=""></p>'
const heading: Components['h1'] = ({ level, node, ...props }, { slots }) => {
        return h(`h${level}`, props, slots.default?.())
}
const headingGenerator: (level: number) => Components['h1'] = (
        level: number
) => {
        const component: Components['h1'] = (_props, ctx) =>
                h(
                        'span',
                        { class: `heading level-${level}` },
                        ctx.slots.default?.()
                )
        return component
}
const remarkGfm = [gfm]
const rehypeRaw = [raw]
let count = 0
const isSSRTest = process.env.TEST_ENV === 'ssr'

describe.skipIf(isSSRTest)('VueMarkdown', () => {
        const table: TestTable[] = [
                {
                        desc: 'should render a single paragraph',
                        expected: '<p>Test</p>',
                        props: { source: 'Test' }
                },
                {
                        desc: 'should handle multiple paragraphs properly',
                        expected: '<p>Vue is awesome\nAnd so is markdown</p>\n<p>Combining = epic</p>',
                        props: {
                                source: 'Vue is awesome\nAnd so is markdown\n\nCombining = epic'
                        }
                },
                {
                        desc: 'should handle multiline paragraphs properly (softbreak, paragraphs)',
                        expected: '<p>Vue is awesome\nAnd so is markdown<br>\nCombining = epic</p>',
                        props: {
                                source: 'Vue is awesome\nAnd so is markdown  \nCombining = epic'
                        }
                },
                {
                        desc: 'should handle emphasis',
                        expected: '<p>Vue is <em>totally</em> <em>awesome</em></p>',
                        props: { source: 'Vue is _totally_ *awesome*' }
                },
                {
                        desc: 'should handle bold/strong texts',
                        expected: '<p>Vue is <strong>totally</strong> <strong>awesome</strong></p>',
                        props: { source: 'Vue is __totally__ **awesome**' }
                },
                {
                        desc: 'should handle links without title attribute',
                        expected: '<p>This is <a href="https://rust-lang.org/">a link</a> to Rust Lang</p>',
                        props: {
                                source: linkToRustLang
                        }
                },
                {
                        desc: 'should handle links with title attribute',
                        expected: '<p>This is <a href="https://rust-lang.org/" title="some title">a link</a> to Rust Lang</p>',
                        props: {
                                source: 'This is [a link](https://rust-lang.org/ "some title") to Rust Lang'
                        }
                },
                {
                        desc: 'should handle links with uppercase protocol',
                        expected: '<p>This is <a href="HTTPS://RUST-LANG.ORG/">a link</a> to Rust Lang</p>',
                        props: {
                                source: 'This is [a link](HTTPS://RUST-LANG.ORG/) to Rust Lang'
                        }
                },
                {
                        desc: 'should handle empty links with custom uri transformer',
                        expected: '<p>Empty: <a href=""></a></p>',
                        props: {
                                source: emptyLink,
                                transformLinkUri: (uri, _, title) => {
                                        expect(uri).toBe('')
                                        expect(title).toBeNull()
                                        return ''
                                }
                        }
                },
                {
                        desc: 'should handle titles of links',
                        expected: '<p>Empty: <a href="#" title="x"></a></p>',
                        props: {
                                source: 'Empty: [](# "x")'
                        }
                },
                {
                        desc: 'should use target attribute for links if specified',
                        expected: '<p>This is <a href="https://rust-lang.org/" target="_blank">a link</a> to Rust Lang</p>',
                        props: {
                                source: 'This is [a link](https://rust-lang.org/) to Rust Lang',
                                linkTarget: '_blank'
                        }
                },
                {
                        desc: 'should handle links with custome target transformer',
                        expected: '<p>Empty: <a href=""></a></p>',
                        props: {
                                source: emptyLink
                        }
                },
                {
                        desc: 'should handle links w/ titles and custom target transformer',
                        expected: '<p>Empty: <a href="a" title="b"></a></p>',
                        props: {
                                source: 'Empty: [](a "b")',
                                linkTarget: (_, _1, title) => {
                                        expect(title).toEqual('b')
                                        return undefined
                                }
                        }
                },
                {
                        desc: 'should support images without alt, url, or title',
                        expected: emptyImage,
                        props: {
                                source: '![]()'
                        }
                },
                {
                        desc: 'should support images without title attribute',
                        expected: expectedNinJAImg,
                        props: {
                                source: ninJAImg
                        }
                },
                {
                        desc: 'should handle images with title attribute',
                        expected: '<p>This is <img src="/ninJA.png" alt="an image" title="foo bar">.</p>',
                        props: {
                                source: 'This is ![an image](/ninJA.png "foo bar").'
                        }
                },
                {
                        desc: 'should handle images with custom uri transformer',
                        expected: expectedNinJAImg.replace('.png', '.jpg'),
                        props: {
                                source: ninJAImg,
                                transformImageUri: (uri) =>
                                        uri.replace(/\.png$/, '.jpg')
                        }
                },
                {
                        desc: 'should handle images with another custom uri transformer',
                        expected: '<p>Empty: <img src="" alt=""></p>',
                        props: {
                                source: 'Empty: ![]()',
                                transformImageUri: (uri, alt, title) => {
                                        expect(uri).toEqual('')
                                        expect(alt).toEqual('')
                                        expect(title).toBeNull()
                                        return ''
                                }
                        }
                },
                {
                        desc: 'should handle images w/ titles + custom uri transformer',
                        expected: '<p>Empty: <img src="a" alt="" title="b"></p>',
                        props: {
                                source: 'Empty: ![](a "b")',
                                transformImageUri: (src, _, title) => {
                                        expect(title).toEqual('b')
                                        return src
                                }
                        }
                },
                {
                        desc: 'should handle image references with custom uri transformer',
                        expected: '<p>This is <img src="https://some.host/img.jpg" alt="The Waffle NinJA">.</p>',
                        props: {
                                source: 'This is ![The Waffle NinJA][ninJA].\n\n[ninJA]: https://some.host/img.png',
                                transformImageUri: (uri) =>
                                        uri.replace(/\.png$/, '.jpg')
                        }
                },
                {
                        desc: 'should support images references without alt, url or title',
                        expected: emptyImage,
                        props: {
                                source: '![][a]\n\n[a]: <>'
                        }
                },
                {
                        desc: 'should handle images with special characters in alt text',
                        expected: '<p>This is <img src="/ninJA.png" alt="a ninJA\'s image">.</p>',
                        props: {
                                source: "This is ![a ninJA's image](/ninJA.png)."
                        }
                },
                {
                        desc: 'should be able to render headers',
                        expected: '<h1>Awesome</h1>',
                        props: {
                                source: '# Awesome'
                        }
                },
                {
                        desc: 'should be able to render headers',
                        expected: '<h2>Awesome</h2>',
                        props: {
                                source: '## Awesome'
                        }
                },
                {
                        desc: 'should be able to render headers',
                        expected: '<h3>Awesome</h3>',
                        props: {
                                source: '### Awesome'
                        }
                },
                {
                        desc: 'should be able to render headers',
                        expected: '<h4>Awesome</h4>',
                        props: {
                                source: '#### Awesome'
                        }
                },
                {
                        desc: 'should be able to render headers',
                        expected: '<h5>Awesome</h5>',
                        props: {
                                source: '##### Awesome'
                        }
                },
                {
                        desc: 'should be able to render inline code',
                        expected: '<p>Just call <code>renderToStaticMarkup()</code>, already!</p>',
                        props: {
                                source: 'Just call `renderToStaticMarkup()`, already!'
                        }
                },
                {
                        desc: 'should handle code tags without any language specification',
                        expected: "<pre><code>var foo = require('bar');\nfoo();\n</code></pre>",
                        props: {
                                source: "```\nvar foo = require('bar');\nfoo();\n```"
                        }
                },
                {
                        desc: 'should handle code tags with any language specification',
                        expected: '<pre><code class="language-js">var foo = require(\'bar\');\nfoo();\n</code></pre>',
                        props: {
                                source: "```js\nvar foo = require('bar');\nfoo();\n```"
                        }
                },
                {
                        desc: 'should only use first language definition on code blocks',
                        expected: '<pre><code class="language-js">var foo = require(\'bar\');\nfoo();\n</code></pre>',
                        props: {
                                source: "```js foo bar\nvar foo = require('bar');\nfoo();\n```"
                        }
                },
                {
                        desc: 'should support character references in code blocks',
                        expected: '<pre><code class="language-js\nololo\ni\ncan\nhaz\nclass\nnames\n!@#$%^&amp;*()_">  woop\n</code></pre>',
                        props: {
                                source: `~~~js&#x0a;ololo&#x0a;i&#x0a;can&#x0a;haz&#x0a;class&#x0a;names&#x0a;!@#$%^&*()_
  woop
  ~~~`
                        }
                },
                {
                        desc: 'should handle code blocks by indentation',
                        expected: '<pre><code>&lt;footer class="footer"&gt;\n    &amp;copy; 2014 Foo Bar\n&lt;/footer&gt;\n</code></pre>',
                        props: {
                                source: [
                                        '',
                                        '<footer class="footer">\n',
                                        '',
                                        '&copy; 2014 Foo Bar\n',
                                        '</footer>'
                                ].join('    ')
                        }
                },
                {
                        desc: 'should handle blockquotes',
                        expected: '<blockquote>\n<p>Moo\nTools\nFTW</p>\n</blockquote>',
                        props: {
                                source: '> Moo\n> Tools\n> FTW\n'
                        }
                },
                {
                        desc: 'should handle nested blockquotes',
                        expected: "<blockquote>\n<blockquote>\n<p>Lots of ex-Mootoolers on the React team</p>\n</blockquote>\n<p>Totally didn't know that.</p>\n<blockquote>\n<p>There's a reason why it turned out so awesome</p>\n</blockquote>\n<p>Haha I guess you're right!</p>\n</blockquote>",
                        props: {
                                source: [
                                        '> > Lots of ex-Mootoolers on the React team\n>\n',
                                        "> Totally didn't know that.\n>\n",
                                        "> > There's a reason why it turned out so awesome\n>\n",
                                        "> Haha I guess you're right!"
                                ].join('')
                        }
                },
                {
                        desc: 'should handle tight, unordered lists',
                        expected: '<ul>\n<li>Unordered</li>\n<li>Lists</li>\n<li>Are cool</li>\n</ul>',
                        props: {
                                source: '* Unordered\n* Lists\n* Are cool\n'
                        }
                },
                {
                        desc: 'should handle loose, unordered lists',
                        expected: '<ul>\n<li>\n<p>foo</p>\n</li>\n<li>\n<p>bar</p>\n</li>\n</ul>',
                        props: {
                                source: '- foo\n\n- bar'
                        }
                },
                {
                        desc: 'should handle tight, unordered lists with sublists',
                        expected: '<ul>\n<li>Unordered\n<ul>\n<li>Lists\n<ul>\n<li>Are cool</li>\n</ul>\n</li>\n</ul>\n</li>\n</ul>',
                        props: {
                                source: '* Unordered\n  * Lists\n    * Are cool\n'
                        }
                },
                {
                        desc: 'should handle loose, unordered lists with sublists',
                        expected: '<ul>\n<li>\n<p>foo</p>\n<ul>\n<li>bar</li>\n</ul>\n</li>\n</ul>',
                        props: {
                                source: '- foo\n\n  - bar'
                        }
                },
                {
                        desc: 'should handle ordered lists',
                        expected: '<ol>\n<li>Ordered</li>\n<li>Lists</li>\n<li>Are cool</li>\n</ol>',
                        props: {
                                source: '1. Ordered\n2. Lists\n3. Are cool\n'
                        }
                },
                {
                        desc: 'should handle ordered lists with a start index',
                        expected: '<ol start="7">\n<li>Ordered</li>\n<li>Lists</li>\n<li>Are cool</li>\n</ol>',
                        props: {
                                source: '7. Ordered\n8. Lists\n9. Are cool\n'
                        }
                },
                {
                        desc: 'should pass `ordered`, `depth`, `checked`, `index` to list/listItem',
                        expected: '<ul>\n<li>\n<p>foo</p>\n<ol start="2">\n<li>bar</li>\n<li>baz</li>\n</ol>\n</li>\n<li>\n<p>root</p>\n</li>\n</ul>',
                        props: {
                                source: '- foo\n\n  2. bar\n  3. baz\n\n- root\n',
                                components: {
                                        li(
                                                {
                                                        node,
                                                        ordered,
                                                        checked,
                                                        index,
                                                        ...props
                                                },
                                                ctx
                                        ) {
                                                expect(ordered).toBeTypeOf(
                                                        'boolean'
                                                )
                                                expect(checked).toBeNull()
                                                expect(index >= 0).toBe(true)
                                                return h(
                                                        'li',
                                                        props,
                                                        ctx.slots.default?.()
                                                )
                                        },
                                        ol(
                                                {
                                                        node,
                                                        ordered,
                                                        depth,
                                                        ...props
                                                },
                                                ctx
                                        ) {
                                                expect(ordered).toBe(true)
                                                expect(depth >= 0).toBe(true)
                                                return h(
                                                        'ol',
                                                        props,
                                                        ctx.slots.default?.()
                                                )
                                        },
                                        ul(
                                                {
                                                        node,
                                                        ordered,
                                                        depth,
                                                        ...props
                                                },
                                                { slots }
                                        ) {
                                                expect(ordered).toBe(false)
                                                expect(depth >= 0).toBe(true)
                                                return h(
                                                        'ul',
                                                        props,
                                                        slots.default?.()
                                                )
                                        }
                                } as Components
                        }
                },
                {
                        desc: 'should pass `inline: true` to inline code',
                        expected: '<pre><code>a\n</code></pre>\n<pre><code>b\n</code></pre>\n<p><code>c</code></p>',
                        props: {
                                source: '```\na\n```\n\n\tb\n\n`c`',
                                components: {
                                        code(
                                                { node, inline, ...props },
                                                { slots }
                                        ) {
                                                expect(
                                                        inline === undefined ||
                                                                inline === true
                                                ).toBe(true)
                                                return h(
                                                        'code',
                                                        props,
                                                        slots.default?.()
                                                )
                                        }
                                }
                        }
                },
                {
                        desc: 'should pass `isHeader: boolean` to `tr`s',
                        expected: '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr><tr><td>c</td></tr></tbody></table>',
                        props: {
                                source: '| a |\n| - |\n| b |\n| c |',
                                components: {
                                        tr(
                                                { node, isHeader, ...props },
                                                { slots }
                                        ) {
                                                assert.equal(
                                                        typeof isHeader ===
                                                                'boolean',
                                                        true
                                                )
                                                return h(
                                                        'tr',
                                                        props,
                                                        slots.default?.()
                                                )
                                        }
                                } as Components,
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should pass `isHeader: true` to `th`s, `isHeader: false` to `td`s',
                        expected: '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr><tr><td>c</td></tr></tbody></table>',
                        props: {
                                source: '| a |\n| - |\n| b |\n| c |',
                                components: {
                                        th(
                                                { node, isHeader, ...props },
                                                { slots }
                                        ) {
                                                expect(isHeader).toBe(true)
                                                return h(
                                                        'th',
                                                        props,
                                                        slots.default?.()
                                                )
                                        },
                                        td(
                                                { isHeader, node, ...props },
                                                { slots }
                                        ) {
                                                expect(isHeader).toBe(false)
                                                return h(
                                                        'td',
                                                        props,
                                                        slots.default?.()
                                                )
                                        }
                                } as Components,
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should pass `index: number`, `ordered: boolean`, `checked: boolean | null` to `li`s',
                        expected: '<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" disabled=""> a</li>\n<li class="task-list-item"><input type="checkbox" disabled=""> b</li>\n<li>c</li>\n</ul>',
                        props: {
                                source: '* [x] a\n* [ ] b\n* c',
                                components: {
                                        li(
                                                {
                                                        checked,
                                                        index,
                                                        node,
                                                        ordered,
                                                        ...props
                                                },
                                                { slots }
                                        ) {
                                                // I have to manually check for first checkbox checked property
                                                // because Vue render checked = true with no checked="" value
                                                // and I don't know why
                                                if (count === 0) {
                                                        const firstCheckBoxChecked: boolean =
                                                                slots.default?.()[0]
                                                                        .props
                                                                        ?.checked
                                                        expect(
                                                                firstCheckBoxChecked
                                                        ).toBe(true)
                                                }
                                                expect(index).toEqual(count)
                                                expect(ordered).toBe(false)
                                                expect(checked).toEqual(
                                                        count === 0
                                                                ? true
                                                                : count === 1
                                                                ? false
                                                                : null
                                                )
                                                count++

                                                return h(
                                                        'li',
                                                        props,
                                                        slots.default?.()
                                                )
                                        }
                                } as Components,
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should pass `level: number` to `h1`, `h2`, ...',
                        expected: '<h1></h1>\n<h2></h2>\n<h3></h3>',
                        props: {
                                source: '#\n##\n###',
                                components: {
                                        h1: heading,
                                        h2: heading,
                                        h3: heading
                                } as Components
                        }
                },
                {
                        desc: 'should skip inline html with skipHtml option enabled',
                        expected: '<p>I am having so much fun</p>',
                        props: {
                                source: 'I am having <strong>so</strong> much fun',
                                skipHtml: true
                        }
                },
                {
                        desc: 'should escape html blocks by default',
                        expected: '<p>This is a regular paragraph.</p>\n&lt;table&gt;\n    &lt;tr&gt;\n        &lt;td&gt;Foo&lt;/td&gt;\n    &lt;/tr&gt;\n&lt;/table&gt;\n<p>This is another regular paragraph.</p>',
                        props: {
                                source: [
                                        'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
                                        '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
                                        ' regular paragraph.'
                                ].join('')
                        }
                },
                {
                        desc: 'should skip html blocks if skipHtml prop is set',
                        expected: '<p>This is a regular paragraph.</p>\n\n<p>This is another regular paragraph.</p>',
                        props: {
                                source: [
                                        'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
                                        '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
                                        ' regular paragraph.'
                                ].join(''),
                                skipHtml: true
                        }
                },
                {
                        desc: 'should escape html blocks by default (with HTML parser plugin)',
                        expected: '<p>This is a regular paragraph.</p>\n&lt;table&gt;\n    &lt;tr&gt;\n        &lt;td&gt;Foo&lt;/td&gt;\n    &lt;/tr&gt;\n&lt;/table&gt;\n<p>This is another regular paragraph.</p>',
                        props: {
                                source: [
                                        'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
                                        '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
                                        ' regular paragraph.'
                                ].join('')
                        }
                },
                {
                        desc: 'should handle horizontal rules',
                        expected: '<p>Foo</p>\n<hr>\n<p>Bar</p>',
                        props: {
                                source: 'Foo\n\n------------\n\nBar'
                        }
                },
                {
                        desc: 'should set source position attributes if sourcePos option is enabled',
                        expected: '<p data-sourcepos="1:1-1:4">Foo</p>\n<hr data-sourcepos="3:1-3:13">\n<p data-sourcepos="5:1-5:4">Bar</p>',
                        props: {
                                source: 'Foo\n\n------------\n\nBar',
                                sourcePos: true
                        }
                },
                {
                        desc: 'should pass on raw source position to non-tag components if rawSourcePos option is enabled',
                        expected: '<p><em class="custom">Foo</em></p>\n<hr>\n<p><strong>Bar</strong></p>',
                        props: {
                                source: '*Foo*\n\n------------\n\n__Bar__',
                                rawSourcePos: true,
                                components: {
                                        em(
                                                {
                                                        node,
                                                        sourcePosition,
                                                        ...props
                                                },
                                                { slots }
                                        ) {
                                                expect(
                                                        sourcePosition
                                                ).toStrictEqual({
                                                        start: {
                                                                line: 1,
                                                                column: 1,
                                                                offset: 0
                                                        },
                                                        end: {
                                                                line: 1,
                                                                column: 6,
                                                                offset: 5
                                                        }
                                                })
                                                return h(
                                                        'em',
                                                        {
                                                                class: 'custom',
                                                                ...props
                                                        },
                                                        slots.default?.()
                                                )
                                        }
                                } as Components
                        }
                },
                {
                        desc: 'should pass on raw source position to non-tag components if rawSourcePos option is enabled and `rehype-raw` is used',
                        expected: '<p><!----></p>',
                        props: {
                                source: '*Foo*',
                                rawSourcePos: true,
                                rehypePlugins: rehypeRaw,
                                components: {
                                        em({ sourcePosition }) {
                                                expect(
                                                        sourcePosition
                                                ).toStrictEqual({
                                                        start: {
                                                                line: 1,
                                                                column: 1,
                                                                offset: 0
                                                        },
                                                        end: {
                                                                line: 1,
                                                                column: 6,
                                                                offset: 5
                                                        }
                                                })
                                                return h('')
                                        }
                                } as Components
                        }
                },
                {
                        desc: 'should skip nodes that are not defined as allowed',
                        expected: '\n<p>Paragraph</p>\n\n<ol>\n<li>List item</li>\n<li>List item 2</li>\n</ol>',
                        props: {
                                source: '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2',
                                allowedElements: ['p', 'ol', 'li']
                        }
                },
                {
                        desc: 'should skip nodes that are defined as disallowed',
                        expected: '<h1>Header</h1>\n<p>Paragraph</p>\n<h2>New header</h2>\n<ol>\n\n\n</ol>\n<p>Foo</p>',
                        props: {
                                source: '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2\n\nFoo',
                                disallowedElements: ['li']
                        }
                },
                {
                        desc: 'should unwrap child nodes from disallowed nodes, if unwrapDisallowed option is enabled',
                        expected: '<p>Espen <del>initiated</del> had the initial commit, but has had several contributors</p>',
                        props: {
                                source: 'Espen *~~initiated~~ had the initial commit*, but has had several **contributors**',
                                unwrapDisallowed: true,
                                disallowedElements: ['em', 'strong'],
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should render tables',
                        expected: '<p>Languages are fun, right?</p>\n<table><thead><tr><th style="text-align: left;">ID</th><th style="text-align: center;">English</th><th style="text-align: right;">Norwegian</th><th>Italian</th></tr></thead><tbody><tr><td style="text-align: left;">1</td><td style="text-align: center;">one</td><td style="text-align: right;">en</td><td>uno</td></tr><tr><td style="text-align: left;">2</td><td style="text-align: center;">two</td><td style="text-align: right;">to</td><td>due</td></tr><tr><td style="text-align: left;">3</td><td style="text-align: center;">three</td><td style="text-align: right;">tre</td><td>tre</td></tr></tbody></table>',
                        props: {
                                source: [
                                        'Languages are fun, right?',
                                        '',
                                        '| ID  | English | Norwegian | Italian |',
                                        '| :-- | :-----: | --------: | ------- |',
                                        '| 1   | one     | en        | uno     |',
                                        '| 2   | two     | to        | due     |',
                                        '| 3   | three   | tre       | tre     |',
                                        ''
                                ].join('\n'),
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should render partial tables',
                        expected: '<p>User is writing a table by hand</p>\n<table><thead><tr><th>Test</th><th>Test</th></tr></thead></table>',
                        props: {
                                source: 'User is writing a table by hand\n\n| Test | Test |\n|-|-|',
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should render link references',
                        expected: '<p>Stuff were changed in <a href="https://github.com/remarkjs/react-markdown/compare/v1.1.3...v1.1.4">1.1.4</a>. Check out the changelog for reference.</p>',
                        props: {
                                source: [
                                        'Stuff were changed in [1.1.4]. Check out the changelog for reference.',
                                        '',
                                        '[1.1.4]: https://github.com/remarkjs/react-markdown/compare/v1.1.3...v1.1.4'
                                ].join('\n')
                        }
                },
                {
                        desc: 'should render empty link references',
                        expected: '<p>Stuff were changed in [][]. Check out the changelog for reference.</p>',
                        props: {
                                source: 'Stuff were changed in [][]. Check out the changelog for reference.'
                        }
                },
                {
                        desc: 'should render image references',
                        expected: '<p>Checkout out this ninja: <img src="/assets/ninja.png" alt="The Waffle Ninja">. Pretty neat, eh?</p>',
                        props: {
                                source: [
                                        'Checkout out this ninja: ![The Waffle Ninja][ninja]. Pretty neat, eh?',
                                        '',
                                        '[ninja]: /assets/ninja.png'
                                ].join('\n')
                        }
                },
                {
                        desc: 'should render footnote with custom options',
                        expected: '<p>This is a statement<sup><a href="#main-fn-1" id="main-fnref-1" data-footnote-ref="" aria-describedby="footnote-label">1</a></sup> with a citation.</p>\n<section data-footnotes="" class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>\n<ol>\n<li id="main-fn-1">\n<p>This is a footnote for the citation. <a href="#main-fnref-1" data-footnote-backref="" class="data-footnote-backref" aria-label="Back to content">↩</a></p>\n</li>\n</ol>\n</section>',
                        props: {
                                source: [
                                        'This is a statement[^1] with a citation.',
                                        '',
                                        '[^1]: This is a footnote for the citation.'
                                ].join('\n'),
                                remarkPlugins: remarkGfm,
                                rehypePlugins: rehypeRaw,
                                remarkRehypeOptions: {
                                        clobberPrefix: 'main-'
                                }
                        }
                },
                {
                        desc: 'should support definitions with funky keys',
                        expected: '<p><a href="a"></a> and <a href="b"></a></p>',
                        props: {
                                source: '[][__proto__] and [][constructor]\n\n[__proto__]: a\n[constructor]: b',
                                transformLinkUri: null
                        }
                },
                {
                        desc: 'should support duplicate definitions',
                        expected: '<p><a href="b">a</a></p>',
                        props: {
                                source: '[a][]\n\n[a]: b\n[a]: c',
                                transformLinkUri: null
                        }
                },
                {
                        desc: 'should be able to use a custom function to determine if the node should be allowed',
                        expected: [
                                '<h1>Header</h1>',
                                '<p><a href="https://github.com/remarkjs/react-markdown/">react-markdown</a> is a nice helper</p>',
                                '<p>Also check out </p>'
                        ].join('\n'),
                        props: {
                                source: [
                                        '# Header',
                                        '[react-markdown](https://github.com/remarkjs/react-markdown/) is a nice helper',
                                        'Also check out [my website](https://espen.codes/)'
                                ].join('\n\n'),
                                allowElement: (element) =>
                                        element.tagName !== 'a' ||
                                        (element.properties &&
                                                typeof element.properties
                                                        .href === 'string' &&
                                                element.properties.href.indexOf(
                                                        'https://github.com/'
                                                ) === 0)
                        }
                },
                {
                        desc: 'should be able to override components',
                        expected: '<span class="heading level-1">Header</span>\n<p>Paragraph</p>\n<span class="heading level-2">New header</span>\n<ol>\n<li>List item</li>\n<li>List item 2</li>\n</ol>\n<p>Foo</p>',
                        props: {
                                source: '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2\n\nFoo',
                                components: {
                                        h1: headingGenerator(1),
                                        h2: headingGenerator(2)
                                } as Components
                        }
                },
                {
                        desc: 'allows specifying a custom URI-transformer',
                        expected: '<p>Received a great <a href="/remarkjs/react-markdown/pull/15">pull request</a> today</p>',
                        props: {
                                source: 'Received a great [pull request](https://github.com/remarkjs/react-markdown/pull/15) today',
                                transformLinkUri: (uri: string) =>
                                        uri.replace(
                                                /^https?:\/\/github\.com\//i,
                                                '/'
                                        )
                        }
                },
                {
                        desc: 'should support turning off the default URI transform',
                        expected: '<p><a href="data:text/html,%3Cscript%3Ealert(1)%3C/script%3E">a</a></p>',
                        props: {
                                source: '[a](data:text/html,<script>alert(1)</script>)',
                                transformLinkUri: null
                        }
                },
                {
                        desc: 'can use parser plugins',
                        expected: '<p>a <del>b</del> c</p>',
                        props: {
                                source: 'a ~b~ c',
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'supports checkbox lists',
                        expected: '<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" disabled=""> Foo</li>\n<li class="task-list-item"><input type="checkbox" disabled=""> Bar</li>\n</ul>\n<hr>\n<ul>\n<li>Foo</li>\n<li>Bar</li>\n</ul>',
                        props: {
                                source: '- [ ] Foo\n- [x] Bar\n\n---\n\n- Foo\n- Bar',
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should pass index of a node under its parent to components if `includeElementIndex` option is enabled',
                        expected: '<p>Foo</p>\n<p>Bar</p>\n<p>Baz</p>',
                        props: {
                                source: 'Foo\n\nBar\n\nBaz',
                                includeElementIndex: true,
                                components: {
                                        p({ node, ...props }, { slots }) {
                                                expect(props.index).toBeTypeOf(
                                                        'number'
                                                )
                                                return h('p', slots.default?.())
                                        }
                                } as Components
                        }
                },
                {
                        desc: 'should be able to render components with forwardRef in HOC',
                        expected: '<p><a href="https://example.com/" node="[object Object]">Link</a></p>',
                        props: {
                                source: '[Link](https://example.com/)',
                                components: {
                                        a(
                                                {
                                                        node,
                                                        index,
                                                        siblingCount,
                                                        sourcePosition,
                                                        ...props
                                                },
                                                { slots }
                                        ) {
                                                const myRef = ref(null)
                                                return h(
                                                        'a',
                                                        {
                                                                ...props,
                                                                node,
                                                                ref: myRef
                                                        },
                                                        slots.default?.()
                                                )
                                        }
                                } as Components
                        }
                },
                {
                        desc: 'should render table of contents plugin',
                        expected: '<h1>Header</h1>\n<h2>Table of Contents</h2>\n<ul>\n<li>\n<p><a href="#first-section">First Section</a></p>\n</li>\n<li>\n<p><a href="#second-section">Second Section</a></p>\n<ul>\n<li><a href="#subsection">Subsection</a></li>\n</ul>\n</li>\n<li>\n<p><a href="#third-section">Third Section</a></p>\n</li>\n</ul>\n<h2>First Section</h2>\n<h2>Second Section</h2>\n<h3>Subsection</h3>\n<h2>Third Section</h2>',
                        props: {
                                source: [
                                        '# Header',
                                        '## Table of Contents',
                                        '## First Section',
                                        '## Second Section',
                                        '### Subsection',
                                        '## Third Section'
                                ].join('\n'),
                                remarkPlugins: [toc]
                        }
                },
                {
                        desc: 'should pass `node` as prop to all non-tag/non-fragment components',
                        expected: "<h1>So, headers... they're cool</h1>",
                        props: {
                                source: "# So, *headers... they're _cool_*\n\n",
                                // @ts-expect-error
                                components: {
                                        h1(props) {
                                                let text = ''
                                                visit(
                                                        props.node,
                                                        'text',
                                                        (child) => {
                                                                text +=
                                                                        child.value
                                                        }
                                                )
                                                return h('h1', text)
                                        }
                                }
                        }
                },
                {
                        desc: 'should support formatting at the start of a GFM tasklist (GH-494)',
                        expected: '<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" disabled=""> <em>a</em></li>\n</ul>',
                        props: {
                                source: '- [ ] *a*',
                                remarkPlugins: remarkGfm
                        }
                },
                {
                        desc: 'should support aria properties',
                        expected: '<input id="a" aria-describedby="b" required=""><p>c</p>',
                        props: {
                                source: 'c',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'element',
                                                        tagName: 'input',
                                                        properties: {
                                                                id: 'a',
                                                                ariaDescribedBy:
                                                                        'b',
                                                                required: true
                                                        },
                                                        children: []
                                                })
                                        }
                                ]
                        }
                },
                {
                        desc: 'should support data properties',
                        expected: '<i data-whatever="a"></i><p>b</p>',
                        props: {
                                source: 'b',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'element',
                                                        tagName: 'i',
                                                        properties: {
                                                                dataWhatever:
                                                                        'a',
                                                                dataIgnoreThis:
                                                                        undefined
                                                        },
                                                        children: []
                                                })
                                        }
                                ]
                        }
                },
                {
                        desc: 'should support comma separated properties',
                        expected: '<i accept="a, b"></i><p>c</p>',
                        props: {
                                source: 'c',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'element',
                                                        tagName: 'i',
                                                        properties: {
                                                                accept: [
                                                                        'a',
                                                                        'b'
                                                                ]
                                                        },
                                                        children: []
                                                })
                                        }
                                ]
                        }
                },
                {
                        desc: 'should support `style` properties',
                        expected: '<i style="color: red; font-weight: bold;"></i><p>a</p>',
                        props: {
                                source: 'a',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'element',
                                                        tagName: 'i',
                                                        properties: {
                                                                style: 'color: red; font-weight: bold'
                                                        },
                                                        children: []
                                                })
                                        }
                                ]
                        }
                },
                /**
                 * Vue style auto support vendor prefix
                 * so we don't need this test cases
                 * Reference: https://vuejs.org/guide/essentials/class-and-style.html#binding-inline-styles
                 */
                // {
                // 	desc: 'should support `style` properties w/ vendor prefixes',
                // 	expected: '<i style="-ms-b:1;-webkit-c:2"></i><p>a</p>',
                // 	props: {
                // 		source: 'a',
                // 		rehypePlugins: [
                // 			() => (root) => {
                // 				root.children.unshift({
                // 					type: 'element',
                // 					tagName: 'i',
                // 					properties: {
                // 						style: 'display: "-ms-flexbox"; box-direction: "-webkit-reverse"'
                // 					},
                // 					children: []
                // 				})
                // 			}
                // 		]
                // 	}
                // },
                {
                        desc: 'should support broken `style` properties',
                        expected: '<i></i><p>a</p>',
                        props: {
                                source: 'a',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'element',
                                                        tagName: 'i',
                                                        properties: {
                                                                style: 'broken'
                                                        },
                                                        children: []
                                                })
                                        }
                                ]
                        }
                },
                {
                        desc: 'should support SVG elements',
                        expected: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><title>SVG `&lt;circle&gt;` element</title><circle cx="120" cy="120" r="100"></circle><path strokeMiterlimit="-1"></path></svg><p>a</p>',
                        props: {
                                source: 'a',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'element',
                                                        tagName: 'svg',
                                                        properties: {
                                                                xmlns: 'http://www.w3.org/2000/svg',
                                                                viewBox: '0 0 500 500'
                                                        },
                                                        children: [
                                                                {
                                                                        type: 'element',
                                                                        tagName: 'title',
                                                                        properties: {},
                                                                        children: [
                                                                                {
                                                                                        type: 'text',
                                                                                        value: 'SVG `<circle>` element'
                                                                                }
                                                                        ]
                                                                },
                                                                {
                                                                        type: 'element',
                                                                        tagName: 'circle',
                                                                        properties: {
                                                                                cx: 120,
                                                                                cy: 120,
                                                                                r: 100
                                                                        },
                                                                        children: []
                                                                },
                                                                // `strokeMiterLimit` in hast, `strokeMiterlimit` in React.
                                                                {
                                                                        type: 'element',
                                                                        tagName: 'path',
                                                                        properties: {
                                                                                'stroke-miterlimit':
                                                                                        -1
                                                                        },
                                                                        children: []
                                                                }
                                                        ]
                                                })
                                        }
                                ]
                        }
                },
                {
                        desc: 'should support (ignore) comments',
                        expected: '<p>a</p>',
                        props: {
                                source: 'a',
                                rehypePlugins: [
                                        () => (root) => {
                                                root.children.unshift({
                                                        type: 'comment',
                                                        value: 'things!'
                                                })
                                        }
                                ]
                        }
                },
                {
                        desc: 'should support table cells w/ style',
                        expected: '<table><thead><tr><th style="color: red; text-align: left;">a</th></tr></thead></table>',
                        props: {
                                source: '| a  |\n| :- |',
                                rehypePlugins: [
                                        () => (root) => {
                                                visit(
                                                        root,
                                                        {
                                                                type: 'element',
                                                                tagName: 'th'
                                                        },
                                                        (node) => {
                                                                node.properties =
                                                                        {
                                                                                ...node.properties,
                                                                                style: 'color: red'
                                                                        }
                                                        }
                                                )
                                        }
                                ],
                                remarkPlugins: remarkGfm
                        }
                }
        ]

        for (let index = 0, len = table.length; index < len; index++) {
                const { desc, expected, props } = table[index]
                it(desc, () => {
                        const wrapper = mount(VueMarkdown, { props })
                        expect(wrapper.element.innerHTML).toEqual(expected)
                })
        }

        it('should pass class for root component', () => {
                const wrapper = mount(VueMarkdown, {
                        props: { source: 'Test', class: 'test-class' }
                })
                expect(wrapper.element.outerHTML).toEqual(
                        '<div class="test-class"><p>Test</p></div>'
                )
        })

        it('should throw if both allowed and disallowed props is specified', () => {
                assert.throws(() => {
                        mount(VueMarkdown, {
                                props: {
                                        source: '',
                                        allowedElements: ['p'],
                                        disallowedElements: ['a']
                                }
                        })
                }, /only one of/i)
        })

        it.skip('should render the whole specturm of markdown within a single run', async () => {
                const inputUrl = new URL(
                        'fixtures/runthrough.md',
                        import.meta.url
                )
                const expectedUrl = new URL(
                        'fixtures/runthrough.html',
                        import.meta.url
                )
                const promises = await Promise.all([
                        fs.readFile(inputUrl),
                        fs.readFile(expectedUrl)
                ])
                const [input, expected] = promises.map((promise) =>
                        String(promise)
                )
                const actual = mount(VueMarkdown, {
                        props: {
                                source: input,
                                remarkPlugins: remarkGfm,
                                rehypePlugins: rehypeRaw
                        }
                })

                expect(actual.element.innerHTML + '\n').toEqual(expected)
        })

        it('should sanitizes certain dangerous urls for links by default', () => {
                const error = console.error

                console.error = () => {}

                const input = [
                        '# [Much fun](javascript:alert("foo"))',
                        "Can be had with [XSS links](vbscript:foobar('test'))",
                        '> And [other](VBSCRIPT:bap) nonsense... [files](file:///etc/passwd) for instance',
                        '## [Entities]( javascript&#x3A;alert("bazinga")) can be tricky, too',
                        'Regular [links](https://foo.bar) must [be]() allowed',
                        '[Some ref][xss]',
                        '[xss]: javascript:alert("foo") "Dangerous stuff"',
                        'Should allow [mailto](mailto:ex@ample.com) and [tel](tel:13133) links tho',
                        'Also, [protocol-agnostic](//google.com) should be allowed',
                        'local [paths](/foo/bar) should be [allowed](foo)',
                        'allow [weird](?javascript:foo) query strings and [hashes](foo#vbscript:orders)'
                ].join('\n\n')

                const actual = mount(VueMarkdown, { props: { source: input } })
                assert.equal(
                        actual.element.innerHTML,
                        '<h1><a href="javascript:alert(%22foo%22)">Much fun</a></h1>\n<p>Can be had with <a href="vbscript:foobar(\'test\')">XSS links</a></p>\n<blockquote>\n<p>And <a href="VBSCRIPT:bap">other</a> nonsense... <a href="file:///etc/passwd">files</a> for instance</p>\n</blockquote>\n<h2><a href="javascript:alert(%22bazinga%22)">Entities</a> can be tricky, too</h2>\n<p>Regular <a href="https://foo.bar">links</a> must <a href="">be</a> allowed</p>\n<p><a href="javascript:alert(%22foo%22)" title="Dangerous stuff">Some ref</a></p>\n<p>Should allow <a href="mailto:ex@ample.com">mailto</a> and <a href="tel:13133">tel</a> links tho</p>\n<p>Also, <a href="//google.com">protocol-agnostic</a> should be allowed</p>\n<p>local <a href="/foo/bar">paths</a> should be <a href="foo">allowed</a></p>\n<p>allow <a href="?javascript:foo">weird</a> query strings and <a href="foo#vbscript:orders">hashes</a></p>'
                )

                console.error = error
        })

        it('should crash on a plugin replacing `root`', () => {
                const plugin = () => () => ({
                        type: 'comment',
                        value: 'things!'
                })
                assert.throws(() => {
                        mount(VueMarkdown, {
                                props: { source: 'a', rehypePlugins: [plugin] }
                        })
                }, /Expected a `root` node/)
        })

        it('should support remark plugins with array parameter', () => {
                const error = console.error
                let message = ''

                console.error = (d: string) => {
                        message = d
                }

                const plugin = () => () => {}

                const actual = mount(VueMarkdown, {
                        props: {
                                source: 'a',
                                remarkPlugins: [[plugin, ['foo', 'bar']]]
                        }
                })
                const expected = '<p>a</p>'
                assert.equal(actual.element.innerHTML, expected)
                assert.notMatch(
                        message,
                        /Warning: Failed/,
                        'Prop types should be valid'
                )
                console.error = error
        })

        it('should support rehype plugins with array parameter', async () => {
                const error = console.error
                let message = ''

                console.error = (d: string) => {
                        message = d
                }

                const plugin = () => () => {}

                const actual = mount(VueMarkdown, {
                        props: {
                                source: 'a',
                                rehypePlugins: [[plugin, ['foo', 'bar']]]
                        }
                })
                const expected = '<p>a</p>'
                assert.equal(actual.element.innerHTML, expected)

                assert.notMatch(
                        message,
                        /Warning: Failed/,
                        'Prop types should be valid'
                )
                console.error = error
        })
})
