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

var External = {
	
	openFile: function(file, line) {
		var cmd, args;
		if (file.type === 'submodule' && config.external.directoryOpener) {
			cmd = config.external.directoryOpener.path;
			args = config.external.directoryOpener.args || [];
		} else if (file.type !== 'submodule' && config.external.fileOpener) {
			cmd = config.external.fileOpener.path;
			args = config.external.fileOpener.args || [];
		} else {
			gui.Shell.openItem(file.path);
		}
		if (cmd) {
			args = args.map(function(value) {
				return value.replace(/\$FILE/, file.path).replace(/\$LINE/, line);
			});
			var process = require('child_process').spawn(cmd, args, {
				detached: true,
				stdio: 'ignore'
			});
			process.unref();
			process.on('error', function(err) {
				console.error(err);
			});
		}
	}
};

Config.load();
