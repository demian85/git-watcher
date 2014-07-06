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
		
		if (config.debugMode) {
			var devTools = gui.Window.get().showDevTools();
			devTools.resizeTo(900, 500);
			devTools.moveTo(0, 0);
		}
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
		}
		if (cmd) {
			args = args.map(function(value) {
				return value.replace(/\$FILE/, file.path).replace(/\$LINE/, line || 1);
			});
			this.openApp(cmd, args);
		} else {
			gui.Shell.openItem(file.path);
		}
	},
	
	openGitk: function(modulePath, file) {
		this.openApp('gitk', [file ? file.name : ''], modulePath);
	},
	
	openGitBlame: function(modulePath, file, line) {
		var args = ['gui', 'blame'];
		if (line !== null) args.push('--line=' + line);
		args.push('--');
		args.push(file.name);
		this.openApp('git', args, modulePath);
	},
	
	openApp: function(cmd, args, cwd) {
		var options = {
			detached: true,
			stdio: 'ignore'
		};
		if (cwd) options.cwd = cwd;
		var process = require('child_process').spawn(cmd, args || [], options);
		process.unref();
		process.on('error', function(err) {
			logError(err);
		});
	},
	
	execTool: function(modulePath, tool) {
		function output(str) {
			Dialog().writeOutput(str);
		}
		// FIXME: allow to cancel process?
		var process = require('child_process').spawn(tool.cmd, tool.args || [], {
			cwd: modulePath
		});
		process.on('error', function(err) {
			logError(err);
			UI.showError(err);
		});
		process.on('exit', function(code) {
			output('\nProcess exited with code: ' + code);
		});
		process.stdout.setEncoding('utf8');
		process.stdout.on('data', output);
		process.stderr.setEncoding('utf8');
		process.stderr.on('data', output);
		Dialog().open('Executing tool: ' + tool.name);
	}
};

Config.load();
