var gui = require('nw.gui'),
	Utils = require('./lib/Utils'),
	config;

var Config = {
	
	load: function() {
		var configFile = require('path').join(gui.App.dataPath, 'config.json');
		var defaultConfig = this._getDefaultConfig();
		try {
			var userConfig = JSON.parse(require('fs').readFileSync(configFile));
			config = Utils.merge(defaultConfig, userConfig);
		} catch(e) {
			config = defaultConfig;
		}
		global.config = config;
	},
	
	save: function() {
		var json = require("json-toolkit");
		var configFile = require('path').join(gui.App.dataPath, 'config.json');
		require('fs').writeFileSync(configFile, json.prettify(config), {encoding: 'utf8'});
	},
	
	_getDefaultConfig: function() {
		var configFile = require('path').normalize('./config.json');
		return JSON.parse(require('fs').readFileSync(configFile));
	}
};

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

Config.load();
