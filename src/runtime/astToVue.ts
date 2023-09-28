import { svg, find, hastToReact } from 'property-information'
import { stringify as spaces } from 'space-separated-tokens'
import { stringify as commas } from 'comma-separated-tokens'
import style from 'style-to-object'
import { h, VNodeArrayChildren } from 'vue'
import { Context } from './types'
import { Element, Root } from 'hast'
import uriTransformer from './uriTransformer'
import { Position } from 'unist'

const own = {}.hasOwnProperty

// The table-related elements that must not contain whitespace text according
// to React.
const tableElements = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr'])

export function childrenToVue(context: Context, node: Root | Element) {
        const children: VNodeArrayChildren = []
        let childIndex = -1

        while (++childIndex < node.children.length) {
                const child = node.children[childIndex]

                if (child.type === 'element') {
                        children.push(toVue(context, child, childIndex, node))
                } else if (child.type === 'text') {
                        if (
                                node.type !== 'element' ||
                                !tableElements.has(node.tagName) ||
                                child.value !== '\n'
                        ) {
                                children.push(child.value)
                        }
                        // @ts-ignore
                } else if (child.type === 'raw' && !context.options.skipHtml) {
                        // Default behavior is to show (encoded) HTML.
                        // @ts-ignore
                        children.push(child.value)
                }
        }

        return children
}

function toVue(
        context: Context,
        node: Element,
        index: number,
        parent: Element | Root
) {
        const options = context.options
        const transform =
                options.transformLinkUri === undefined
                        ? uriTransformer
                        : options.transformLinkUri
        const parentSchema = context.schema
        const name = node.tagName
        const properties: Record<string, unknown> = {}
        let schema = parentSchema
        let property

        if (parentSchema.space === 'html' && name === 'svg') {
                schema = svg
                context.schema = schema
        }

        if (node.properties) {
                for (property in node.properties) {
                        if (own.call(node.properties, property)) {
                                addProperty(
                                        properties,
                                        property,
                                        node.properties[property],
                                        context
                                )
                        }
                }
        }

        if (name === 'ol' || name === 'ul') {
                context.listDepth++
        }

        const children = childrenToVue(context, node)

        if (name === 'ol' || name === 'ul') {
                context.listDepth--
        }

        // Restore parent schema.
        context.schema = parentSchema

        // Nodes created by plugins do not have positional info, in which case we use
        // an object that matches the position interface.
        const position = node.position || {
                start: { line: null, column: null, offset: null },
                end: { line: null, column: null, offset: null }
        }
        const component =
                options.components && own.call(options.components, name)
                        ? options.components[name]
                        : name
        const basic = typeof component === 'string'

        /*
Figure out how to check valid functional component in vue 3 later
for now we will rely on typescript type check
*/
        // if (
        // 	typeof component === 'function' &&
        // 	!isVueComponent(component)
        // ) {
        // 	throw new TypeError(
        // 		`Component for name \`${name}\` is not defined or is not renderable`
        // 	)
        // }

        properties.key = [
                name,
                position.start.line,
                position.start.column,
                index
        ].join('-')

        if (name === 'a' && options.linkTarget) {
                properties.target =
                        typeof options.linkTarget === 'function'
                                ? options.linkTarget(
                                          String(properties.href || ''),
                                          node.children,
                                          typeof properties.title === 'string'
                                                  ? properties.title
                                                  : null
                                  )
                                : options.linkTarget
        }

        if (name === 'a' && transform) {
                properties.href = transform(
                        String(properties.href || ''),
                        node.children,
                        typeof properties.title === 'string'
                                ? properties.title
                                : null
                )
        }

        if (
                !basic &&
                name === 'code' &&
                parent.type === 'element' &&
                parent.tagName !== 'pre'
        ) {
                properties.inline = true
        }

        if (
                !basic &&
                (name === 'h1' ||
                        name === 'h2' ||
                        name === 'h3' ||
                        name === 'h4' ||
                        name === 'h5' ||
                        name === 'h6')
        ) {
                properties.level = Number.parseInt(name.charAt(1), 10)
        }

        if (name === 'img' && options.transformImageUri) {
                properties.src = options.transformImageUri(
                        String(properties.src || ''),
                        String(properties.alt || ''),
                        typeof properties.title === 'string'
                                ? properties.title
                                : null
                )
        }

        if (!basic && name === 'li' && parent.type === 'element') {
                const input = getInputElement(node)
                properties.checked =
                        input && input.properties
                                ? Boolean(input.properties.checked)
                                : null
                properties.index = getElementsBeforeCount(parent, node)
                properties.ordered = parent.tagName === 'ol'
        }

        if (!basic && (name === 'ol' || name === 'ul')) {
                properties.ordered = name === 'ol'
                properties.depth = context.listDepth
        }

        if (name === 'td' || name === 'th') {
                if (properties.align) {
                        if (!properties.style) properties.style = {}
                        // @ts-expect-error assume `style` is an object
                        properties.style.textAlign = properties.align
                        delete properties.align
                }

                if (!basic) {
                        properties.isHeader = name === 'th'
                }
        }

        if (!basic && name === 'tr' && parent.type === 'element') {
                properties.isHeader = Boolean(parent.tagName === 'thead')
        }

        // If `sourcePos` is given, pass source information (line/column info from markdown source).
        if (options.sourcePos) {
                properties['data-sourcepos'] = flattenPosition(position)
        }

        if (!basic && options.rawSourcePos) {
                properties.sourcePosition = node.position
        }

        // If `includeElementIndex` is given, pass node index info to components.
        if (!basic && options.includeElementIndex) {
                properties.index = getElementsBeforeCount(parent, node)
                properties.siblingCount = getElementsBeforeCount(parent)
        }

        if (!basic) {
                properties.node = node
        }

        if (children.length > 0) {
                if (basic) {
                        return h(component, properties, children)
                }

                // @ts-expect-error
                return h(component, properties, () => children)
        }

        // @ts-expect-error
        return h(component, properties)
}

function getInputElement(node: Element | Root): Element | null {
        let index = -1

        while (++index < node.children.length) {
                const child = node.children[index]

                if (child.type === 'element' && child.tagName === 'input') {
                        return child
                }
        }

        return null
}

function getElementsBeforeCount(
        parent: Element | Root,
        node?: Element
): number {
        let index = -1
        let count = 0

        while (++index < parent.children.length) {
                if (parent.children[index] === node) break
                if (parent.children[index].type === 'element') count++
        }

        return count
}

function addProperty(
        props: Record<string, unknown>,
        prop: string,
        value: unknown,
        ctx: Context
): void {
        const info = find(ctx.schema, prop)
        let result = value

        // Ignore nullish and `NaN` values.
        // eslint-disable-next-line no-self-compare
        if (result === null || result === undefined || result !== result) {
                return
        }

        // Accept `array`.
        // Most props are space-separated.
        if (Array.isArray(result)) {
                result = info.commaSeparated ? commas(result) : spaces(result)
        }

        if (info.property === 'style' && typeof result === 'string') {
                result = parseStyle(result)
        }

        if (info.space && info.property) {
                props[
                        own.call(hastToReact, info.property)
                                ? hastToReact[info.property]
                                : info.property
                ] = result
        } else if (info.attribute) {
                props[info.attribute] = result
        }
}

function parseStyle(value: string) {
        const result: Record<string, string> = {}

        try {
                style(value, (name, v) => {
                        const k =
                                name.slice(0, 4) === '-ms'
                                        ? `ms-${name.slice(4)}`
                                        : name
                        result[k] = v
                })
        } catch {
                // Silent.
        }

        return result
}

function flattenPosition(
        pos:
                | Position
                | {
                          start: {
                                  line: null
                                  column: null
                                  offset: null
                          }
                          end: { line: null; column: null; offset: null }
                  }
) {
        return [
                pos.start.line,
                ':',
                pos.start.column,
                '-',
                pos.end.line,
                ':',
                pos.end.column
        ]
                .map(String)
                .join('')
}
