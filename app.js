var GitWatcher = require('./lib/GitWatcher'),
	Git = require('./lib/Git'),
	Highlighter = require('./lib/Highlighter'),
	baseRepoDirectory = null, 
	currentModulePath = null, 
	currentModuleName = null, 
	gitWatcher = null,
	appTray;
	
var gitErrHandler = require('domain').create();
gitErrHandler.on('error', function(err) {
	UI.showError(err);
});

function init() {
	initApp();
	
	baseRepoDirectory = gui.App.argv[0] || config.defaultRepository || null;
	
	if (!baseRepoDirectory && isValidRepository(process.env.PWD)) {
		openRepository(process.env.PWD);
	} else if (baseRepoDirectory) {
		openRepository(baseRepoDirectory);
	}
}

function initApp() {
	appTray = new gui.Tray({
		title: 'Git Watcher',
		icon: 'icons/git-watcher.png'
	});
	appTray.on('click', function(e) {
		gui.Window.get().focus();
	});
    
    $('#repositoryChooser').setAttribute('nwworkingdir', process.env.HOME);
	$('#repositoryChooser').addEventListener('change', function(e) {
		openRepository(this.value);
	}, false);
    
	AppMenus.init();
	
	gui.Window.get().on('close', function() {
		Config.save();
		this.close(true);
	});
}

function updateCurrentModuleStatus() {
	log('Updating current module status...');
	gitWatcher.getModuleStatus(currentModuleName, function(err, status) {
		if (err) throw err;
		UI.updateModule(currentModuleName, status);
	});
}

function isValidRepository(path) {
    return require('fs').existsSync(require('path').join(path, '.git'));
}

function openRepository(repositoryPath) {
	closeRepository();
    
    if (!isValidRepository(repositoryPath)) {
        UI.showError('Invalid repository path given!\n\nPlease select a valid Git repository.');
        chooseRepository();
        return;
    }
    
	$('#loadingImage').classList.add('visible');
    
	baseRepoDirectory = repositoryPath;
    
	gitWatcher = new GitWatcher(repositoryPath);
	gitWatcher.on('change', function(status) {
		log('Event: change', status);
		UI.updateModule(status.module, status.status);
	});
	gitWatcher.on('error', function(err) {
		logError('Event: error', err);
		UI.showError(err);
		throw err;
	});
	gitWatcher.on('ready', function() {
		log('Event: ready');
		UI.load();
	});
	gitWatcher.init();
	
	AppMenus.enableRepoMenu(true);
	
	$('#main').classList.remove('empty');
}

function chooseRepository() {
    gui.Window.get().focus();
	$('#repositoryChooser').click();
}

function closeRepository() {
	if (baseRepoDirectory && gitWatcher !== null) {
		gitWatcher.close();
        gitWatcher.removeAllListeners();
		gitWatcher = null;
		baseRepoDirectory = null;
		
        AppMenus.enableRepoMenu(false);
		
		$$('.module').forEach(function(node) {
			node.parentNode.removeChild(node);
		});
		$('#gitModules').innerHTML = '';
        $('#main').classList.add('empty');
		$('#repositoryChooser').value = '';
	}
}

var UI = {
	load: function() {
		gitWatcher.getStatus(function(err, status) {
			if (err) throw err;
			log('Status:', status);
			$('#loadingImage').classList.remove('visible');
			var modules = gitWatcher.getModules();
			modules.forEach(function(module) {
				UI.createModule(module);
			});
			UI.showModule(modules[0]);
			for (var module in status) {
				UI.updateModule(module, status[module]);
			}
		});
	},
	
	showModule: function(moduleName) {
		currentModuleName = moduleName;
		currentModulePath = require('path').dirname(baseRepoDirectory) + moduleName;
		$$('.moduleLabel, .module').forEach(function(node) {
			if (node.dataset.name === currentModuleName) {
				node.classList.add('visible');
			} else {
				node.classList.remove('visible');
			}
		});
	},
	
	updateModule: function(moduleName, status) {
		this._updateModuleBranch(moduleName, status.branch);
		this._updateModuleFilesDiff(moduleName, status);
		this._updateModuleFileList(moduleName, status);
		this._addFileSelectionEvents(moduleName);
	},
	
	createModule: function(moduleName) {
		var module = document.importNode($('#gitModuleTpl').content, true).querySelector('.module');
		module.dataset.name = moduleName;
		$('#main').appendChild(module);
		this._addModuleControlEvents(moduleName);
		var moduleLabel = document.importNode($('#gitModuleLabelTpl').content, true).querySelector('li');
		moduleLabel.textContent = moduleName.replace(/^\//, '');
		moduleLabel.dataset.name = moduleName;
		moduleLabel.addEventListener('focus', function(e) {
			UI.showModule(this.dataset.name);
		}, false);
		$('#gitModules').appendChild(moduleLabel);
	},
	
	showError: function(err) {
		alert(err.toString());
	},
	
	selectFile: function(name, type) {
		var me = this;
		var items = $$('.fileList > li, .file');
		items.forEach(function(node) {
			if (node.dataset.name === name && node.dataset.type === type) {
				node.classList.add('selected');
				me._scrollFileIntoView(node);
			} else {
				node.classList.remove('selected');
			}
		});
	},
	
	_scrollFileIntoView: function(fileNode) {
		var y0 = fileNode.offsetTop,
			y1 = y0 + fileNode.offsetHeight,
			parent = fileNode.parentNode;
		if (y0 < parent.scrollTop) {
			fileNode.scrollIntoView(true);
		} else if (y1 > (parent.clientHeight + parent.scrollTop)) {
			fileNode.scrollIntoView(false);
		}
	},
	
	_updateModuleFileList: function(moduleName, status) {
		var selectedFileNode = $m(moduleName, '.fileList > li.selected');
		var fileToSelect = selectedFileNode ? {
			name: selectedFileNode.dataset.name, 
			type: selectedFileNode.dataset.type
		} : null;
		function update(type) {
			var listNode = $m(moduleName, '.' + type + 'Files');
			listNode.innerHTML = '';
			status[type].map(function(file) {
				return _renderFileListItem(file, type);
			}).forEach(function(node) {
				listNode.appendChild(node);
			});
		}
		update('unstaged');
		update('staged');
		if (fileToSelect) {
			this.selectFile(fileToSelect.name, fileToSelect.type);
		}
	},
	
	_updateModuleFilesDiff: function(moduleName, status) {
		var diffNode = $m(moduleName, '.filesDiff');
		diffNode.innerHTML = '';
		function add(type) {
			status[type].filter(function(file) {
				return file.type !== 'submodule';
			}).map(function(file) {
				return _renderFileDiff(file, type);
			}).forEach(function(node) {
				diffNode.appendChild(node);
			});
		}
		add('unstaged');
		add('staged');
	},
	
	_updateModuleBranch: function(moduleName, branch) {
		var html = branch.name ? 'On branch <strong>' + branch.name + '</strong>. ' : 'Not currently on any branch.';
		if (branch.ahead > 0) html += 'Ahead of ' + branch.remote + ' by ' + branch.ahead + ' commits.';
		else if (branch.behind > 0) html += 'Behind of ' + branch.remote + ' by ' + branch.behind + ' commits.';
		$m(moduleName, '.branchInfo').innerHTML = html;
	},
	
	_addFileSelectionEvents: function(moduleName) {
		var me = this;
		var items = $$m(moduleName, '.fileList > li, .file');
		items.forEach(function(node) {
			node.addEventListener('mousedown', function(e) {
				if (!this.classList.contains('selected')) {
					me.selectFile(this.dataset.name, this.dataset.type);
				}
			}, false);
		});
	},
	
	_addModuleControlEvents: function(moduleName) {
		$m(moduleName,'.stageButton').addEventListener('click', function(e) {
			Git.stageAll(currentModulePath, _handleGitResponse);
		}, false);
		$m(moduleName,'.unstageButton').addEventListener('click', function(e) {
			Git.unstageAll(currentModulePath, _handleGitResponse);
		}, false);
		$m(moduleName,'.commitButton').addEventListener('click', function(e) {
			var textarea = $m(moduleName, '.commitMessage');
			var message = textarea.value.trim();
			if (!message) {
				alert('Please enter a valid commit message!');
				textarea.focus();
				return;
			}
			Git.commit(currentModulePath, message, gitErrHandler.intercept(function() {
				textarea.value = '';
				updateCurrentModuleStatus();
			}));
		}, false);
		$m(moduleName,'.pushButton').addEventListener('click', function(e) {
			Git.push(currentModulePath, _handleGitResponse);
		}, false);
	}
};

/**
 * 
 * @param {object} file {name, path, status, type, diff}
 * @param {String} type unstaged|staged
 * @returns {String}
 */
function _renderFileDiff(file, type) {
	var fileNode = document.importNode($('#gitModuleFileTpl').content, true).querySelector('.file');
	fileNode.classList.add(type);
	fileNode.dataset.type = type;
	fileNode.dataset.name = file.name;
	fileNode.dataset.path = file.path;
	fileNode.querySelector('.fileName').textContent = file.name;
	fileNode.querySelector('.fileName').title = 'Open file';
	fileNode.querySelector('.fileStatus').classList.add(file.status);
	fileNode.querySelector('.fileStatus').textContent = '[' + file.status + ']';
	fileNode.querySelector('.fileType').textContent = file.info.mimeType || '';
	var diffHtml = '';
	if (file.diff) {
		diffHtml += '<table class="fileDiff">';
		diffHtml += file.diff.map(function(range) {
			return '<tbody class="range">' + range.map(function(line) {
				var lineTypeStr = (line.type === '-' ? 'deleted' : (line.type === '+' ? 'added' : 'neutral'));
				var symbol = (line.type === '-' ? '-' : (line.type === '+' ? '+' : ' '));
				return '<tr class="lineRow ' + lineTypeStr + '"><td class="line oldLine">' + (line.type === '-' ? line.oldLine : '') + '</td><td class="line newLine">' + (line.type !== '-' ? line.newLine : '') + '</td><td>' + symbol + '</td><td>' + _renderFileDiffLine(file, line.content) + '</td></tr>';
			}).join('\n') + '</tbody>';
		}).join('');
		diffHtml += '<table>';
	} else {
		diffHtml += file.info.isBinary ? '<div class="emptyLabel">[binary]</div>' : '<div class="emptyLabel">[empty]</div>';
	}
	fileNode.querySelector('.fileDiffContents').innerHTML = diffHtml;
	
	// events
	fileNode.addEventListener('click', function(e) {
		if (e.target.webkitMatchesSelector('.fileName, .newLine')) {
			gui.Shell.openItem(file.path);
		}
	}, false);
	fileNode.addEventListener('contextmenu', function(e) {
		AppMenus.showFileListMenu(file, type, e.clientX, e.clientY);
		e.preventDefault();
	}, false);
	
	return fileNode;
}

/**
 * 
 * @param {object} file
 * @param {String} lineText
 * @returns {String}
 */
function _renderFileDiffLine(file, lineText) {
	var hlConf = config.diff.highlight;
	if (file.unmerged && (lineText.indexOf('<<<<<<<') === 0 || lineText.indexOf('=======') === 0 || lineText.indexOf('>>>>>>>') === 0)) {
		return Highlighter.highlightConflict(lineText);
	}
	if (hlConf.enabled) {
		var ext = require('path').extname(file.name);
		if (hlConf.byFileExtension[ext] === undefined || hlConf.byFileExtension[ext]) {
			var hl = Highlighter.getInstance(ext);
			if (hl) {
				return hl.highlight(lineText);
			}
		}
	}
	return lineText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 
 * @param {object} file
 * @param {string} type staged|unstaged
 * @returns {HTMLElement}
 */
function _renderFileListItem(file, type) {
	var node = document.importNode($('#gitFileListItemTpl').content, true).querySelector('li');
	node.querySelector('.fileListItemLabel').textContent = file.name;
	node.classList.add(file.type + '-' + file.status);
	node.dataset.name = file.name;
	node.dataset.type = type;
	node.addEventListener('dblclick', function(e) {
		if (type === 'staged') {
			Git.unstageFile(currentModulePath, file, _handleGitResponse);
		} else {
			Git.stageFile(currentModulePath, file, _handleGitResponse);
		}
	}, false);
	
	// file list context menu
	node.addEventListener('contextmenu', function(e) {
		AppMenus.showFileListMenu(file, type, e.clientX, e.clientY);
		e.preventDefault();
	}, false);
	return node;
}

function _handleGitResponse(err, response) {
	if (err) UI.showError(err);
	updateCurrentModuleStatus();
}
