function merge(a, b) {
	for (var property in a) {
		if (typeof a[property] === 'object' && !require('util').isArray(a[property]) && b[property] !== undefined) {
			a[property] = merge(a[property], b[property]);
		} else if (b[property] !== undefined) {
			a[property] = b[property];
		}
	}
	return a;
}

module.exports = {
	merge: merge
};
