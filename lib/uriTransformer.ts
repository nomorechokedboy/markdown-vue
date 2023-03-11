const protocols = ['http', 'https', 'mailto', 'tel']

export default function uriTransformer(uri: string): string {
	const url = (uri || '').trim()
	const first = url.charAt(0)

	if (first === '#' || first === '/') {
		return url
	}

	const colon = url.indexOf(':')
	if (colon === -1) {
		return url
	}

	let index = -1

	while (++index < protocols.length) {
		const protocol = protocols[index]

		if (
			colon === protocol.length &&
			url.slice(0, protocol.length).toLowerCase() === protocol
		) {
			return url
		}
	}

	index = url.indexOf('?')
	if (index !== -1 && colon > index) {
		return url
	}

	index = url.indexOf('#')
	if (index !== -1 && colon > index) {
		return url
	}

	return 'javascript:void(0)'
}
