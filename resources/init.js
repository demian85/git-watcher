var config = require('loader').loadConfig();

function $(s, ctx) {
	ctx = ctx || document;
	return ctx.querySelector(s);
}

function $$(s, ctx) {
	ctx = ctx || document;
	return [].slice.call(ctx.querySelectorAll(s));
}

function $m(moduleName, selector) {
	return $('.module[data-name="' + moduleName + '"]').querySelector(selector);
}

function $$m(moduleName, selector) {
	return $$(selector, $('.module[data-name="' + moduleName + '"]'));
}

function log() {
	if (config.debugMode && console) {
		console.log.apply(console, arguments);
	}
}
function logError() {
	if (config.debugMode && console) {
		console.error.apply(console, arguments);
	}
}
