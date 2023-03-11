import { describe, it, expect, assert } from 'vitest'
import { mount } from '@vue/test-utils'
import fs from 'fs/promises'
import VueMarkdown, { MarkdownOptions } from './VueMarkdown.vue'
import gfm from 'remark-gfm'
import raw from 'rehype-raw'
import { h } from 'vue'
import { Components } from './types'

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
let count = 0

describe('VueMarkdown', () => {
	const table: TestTable[] = [
		{
			desc: 'should render a single paragraph',
			expected: '<p>Test</p>',
			props: { source: 'Test' }
		},
		{
			desc: 'should pass class for root component',
			expected: '<div class="test-class"><p>Test</p></div>',
			props: { source: 'Test', class: 'test-class' }
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
				remarkPlugins: [gfm]
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
				remarkPlugins: [gfm]
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
				remarkPlugins: [gfm]
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
		}
	]

	for (let index = 0, len = table.length; index < len; index++) {
		const { desc, expected, props } = table[index]
		it(desc, () => {
			const wrapper = mount(VueMarkdown, { props })
			expect(wrapper.element.innerHTML).toEqual(expected)
		})
	}

	it('should render the whole specturm of markdown within a single run', async () => {
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
				remarkPlugins: [gfm],
				rehypePlugins: [raw]
			}
		})

		expect(actual.element.innerHTML + '\n').toEqual(expected)
	})
})
