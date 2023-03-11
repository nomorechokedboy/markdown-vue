import { Root } from 'hast'
import { visit } from 'unist-util-visit'
import { FilterOptions } from './types'

export default function rehypeFilter(options: FilterOptions) {
	if (options.allowedElements && options.disallowedElements) {
		throw new TypeError(
			'Only one of `allowedElements` and `disallowedElements` should be defined'
		)
	}

	if (
		options.allowedElements ||
		options.disallowedElements ||
		options.allowElement
	) {
		return (tree: Root) => {
			visit(tree, 'element', (node, index, parent) => {
				let remove: boolean | undefined

				if (options.allowedElements) {
					remove =
						!options.allowedElements.includes(
							node.tagName
						)
				} else if (options.disallowedElements) {
					remove =
						options.disallowedElements.includes(
							node.tagName
						)
				}

				if (
					!remove &&
					options.allowElement &&
					typeof index === 'number' &&
					parent
				) {
					remove = !options.allowElement(
						node,
						index,
						parent
					)
				}

				if (
					remove &&
					typeof index === 'number' &&
					parent
				) {
					if (
						options.unwrapDisallowed &&
						node.children
					) {
						parent.children.splice(
							index,
							1,
							...node.children
						)
					} else {
						parent.children.splice(index, 1)
					}

					return index
				}

				return undefined
			})
		}
	}
}
