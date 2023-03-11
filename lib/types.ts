import { Element, ElementContent, Root } from 'hast'
import { Schema } from 'property-information'
import { Position } from 'unist'
import { SetupContext, VNode } from 'vue'

export type TransformLink = (
	href: string,
	children: Array<ElementContent>,
	title: string | null
) => string

export type TransformImage = (
	src: string,
	alt: string,
	title: string | null
) => string

export type TransformLinkTarget = (
	href: string,
	children: Array<ElementContent>,
	title: string | null
) => TransformLinkTargetType | undefined

export type TransformLinkTargetType =
	| '_self'
	| '_blank'
	| '_parent'
	| '_top'
	| (string & {})

export type TransformOptions = {
	sourcePos?: boolean
	rawSourcePos?: boolean
	skipHtml?: boolean
	includeElementIndex?: boolean
	transformLinkUri?: false | TransformLink | null
	transformImageUri?: TransformImage
	linkTarget?: TransformLinkTarget | TransformLinkTargetType
	components?: Components
}

export type Context = {
	options: TransformOptions
	schema: Schema
	listDepth: number
}

export type AllowElement = (
	element: Element,
	index: number,
	parent: Element | Root
) => boolean | undefined

export type FilterOptions = {
	allowedElements?: string[]
	disallowedElements?: string[]
	allowElement?: AllowElement
	unwrapDisallowed?: boolean
}

export type VueMarkdownProps = {
	node: Element
	sourcePosition?: Position
	index?: number
	siblingCount?: number
}

type VueFunctionalComponent<Props = VueMarkdownProps> = (
	props: Props,
	ctx: SetupContext
) => VNode

export type NormalComponents = {
	[Tagname in keyof JSX.IntrinsicElements]:
		| keyof JSX.IntrinsicElements
		| VueFunctionalComponent
}

type VueMarkdownNames = keyof JSX.IntrinsicElements

type CodeComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['code'] & VueMarkdownProps & { inline?: boolean }
>

type HeadingComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['h1'] & VueMarkdownProps & { level: number }
>

type LiComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['li'] &
		VueMarkdownProps & {
			checked: boolean | null
			index: number
			ordered: boolean
		}
>

type OrderedListComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['ol'] &
		VueMarkdownProps & { depth: number; ordered: true }
>

type TableCellComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['table'] &
		VueMarkdownProps & {
			style?: Record<string, unknown>
			isHeader: boolean
		}
>

type TableRowComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['tr'] & VueMarkdownProps & { isHeader: boolean }
>

type UnorderedListComponent = VueFunctionalComponent<
	JSX.IntrinsicElements['ul'] &
		VueMarkdownProps & { depth: number; ordered: false }
>

type SpecialComponents = {
	code: CodeComponent | VueMarkdownNames
	h1: HeadingComponent | VueMarkdownNames
	h2: HeadingComponent | VueMarkdownNames
	h3: HeadingComponent | VueMarkdownNames
	h4: HeadingComponent | VueMarkdownNames
	h5: HeadingComponent | VueMarkdownNames
	h6: HeadingComponent | VueMarkdownNames
	li: LiComponent | VueMarkdownNames
	ol: OrderedListComponent | VueMarkdownNames
	td: TableCellComponent | VueMarkdownNames
	th: TableCellComponent | VueMarkdownNames
	tr: TableRowComponent | VueMarkdownNames
	ul: UnorderedListComponent | VueMarkdownNames
}

export type Components = Partial<
	Omit<NormalComponents, keyof SpecialComponents>
> &
	Partial<SpecialComponents>
