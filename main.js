var GitWatcher = require('./lib/GitWatcher'),
	Commander = require('./lib/Commander'),
	Highlighter = require('./lib/Highlighter'),
	baseRepoDirectory = null, 
	currentModulePath = null, 
	currentModuleName = null, 
	gitWatcher = null,
	commander = null,
	appTray;
	
var gitErrHandler = require('domain').create();
gitErrHandler.on('error', function(err) {
	UI.showError(err);
});

function init() {
	initApp();
	
	window.addEventListener('resize', function() {
		if (currentModuleName) UI.updateModuleLayout(currentModuleName);
	});
	
	commander = new Commander();
	commander.on('cmdstart', function() {
		log('cmdstart');
		$$('.actionBtn, .actionInput').forEach(function(node) {
			node.disabled = true;
		});
	});
	commander.on('cmdend', function() {
		log('cmdend');
		$$('.actionBtn, .actionInput').forEach(function(node) {
			node.disabled = false;
		});
	});
	
	var baseRepoDirectory = gui.App.argv[0] || config.defaultRepository || null;
	
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

function updateGlobalStatus() {
	gitWatcher.getStatus(function(err, status) {
		if (err) throw err;
		for (var module in status) {
			UI.updateModule(module, status[module]);
		}
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
	gitWatcher.on('error', function(err) {
		logError('Event: error', err);
		UI.showError(err);
		throw err;
	});
	gitWatcher.on('ready', function() {
		log('Event: ready');
		UI.load();
		gitWatcher.on('change', function(status) {
			log('Event: change', status);
			UI.updateModule(status.module, status.status);
		});
		gitWatcher.on('merge', function(data) {
			log('Event: merge', data);
			UI._updateModuleMergeMsg(data.module, data.msg);
		});
	});
	gitWatcher.init();
	
	gui.Window.get().title = gui.App.manifest.window.title + ' :: ' + repositoryPath;
	
	AppMenus.pushRecentRepository(repositoryPath);
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
		
		gui.Window.get().title = gui.App.manifest.window.title;
        AppMenus.enableRepoMenu(false);
		
		$$('.module').forEach(function iterator(node) {
			node.parentNode.removeChild(node);
		});
		$('#gitModules').innerHTML = '';
        $('#main').classList.add('empty');
		$('#repositoryChooser').value = '';
	}
}

function commit() {
	var input = $m(currentModuleName, '.commitMessage');
	var message = input.value.trim();
	if (!message) {
		alert('Please enter a valid commit message!');
		input.focus();
		return;
	}
	commander.commit(message, gitErrHandler.intercept(function() {
		input.value = '';
	}));
}

function amendCommit() {
	var input = $m(currentModuleName, '.commitMessage');
	commander.softResetLastCommit(gitErrHandler.intercept(function(lastCommitMessage) {
		input.value = lastCommitMessage;
	}));
}

var UI = {
	load: function() {
		gitWatcher.getStatus(function getStatusCallback(err, status) {
			if (err) throw err;
			
			$('#loadingImage').classList.remove('visible');
			
			var modules = gitWatcher.getModules();
			modules.forEach(function createModule(module) {
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
		commander.setModulePath(currentModulePath);
		$$('.moduleLabel, .module').forEach(function iterator(node) {
			if (node.dataset.name === currentModuleName) {
				node.classList.add('visible');
			} else {
				node.classList.remove('visible');
			}
		});
		this.updateModuleLayout(currentModuleName);
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
		moduleLabel.addEventListener('focus', function onModuleFocus(e) {
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
		items.forEach(function iterator(node) {
			if (node.dataset.name === name && node.dataset.type === type) {
				node.classList.add('selected');
				me._scrollFileIntoView(node);
			} else {
				node.classList.remove('selected');
			}
		});
	},
	
	/**
	 * Adjust files max-height according to its container clientHeight
	 */
	updateModuleLayout: function(moduleName) {
		var diffNode = $m(moduleName, '.filesDiff');
		var fileNodes = $$m(moduleName, '.file');
		var maxHeight = diffNode.clientHeight;
		fileNodes.forEach(function(node) {
			node.style.maxHeight = 'calc(' + maxHeight + 'px - ' + window.getComputedStyle(node).marginBottom + ')';
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
	
	_updateModuleMergeMsg: function(moduleName, mergeMsg) {
		var commitMessageInput = $m(moduleName, '.commitMessage');
		if (!commitMessageInput.value && mergeMsg) {
			commitMessageInput.value = mergeMsg;
		}
	},
	
	_updateModuleFileList: function(moduleName, status) {
		var fileToSelect = this._getModuleFile(moduleName, true);
		function update(type) {
			var listNode = $m(moduleName, '.' + type + 'Files');
			listNode.innerHTML = '';
			var documentFragment = document.createDocumentFragment();
			status[type].map(function mapper(file) {
				return _renderFileListItem(file, type);
			}).forEach(function iterator(node) {
				documentFragment.appendChild(node);
			});
			listNode.appendChild(documentFragment);
		}
		update('unstaged');
		update('staged');
		if (!fileToSelect) {
			fileToSelect = this._getModuleFile(moduleName);
		}
		if (fileToSelect) {
			this.selectFile(fileToSelect.name, fileToSelect.type);
		}
	},
	
	_updateModuleFilesDiff: function(moduleName, status) {
		var diffNode = $m(moduleName, '.filesDiff');
		diffNode.innerHTML = '';
		var documentFragment = document.createDocumentFragment();
		function add(type) {
			status[type].map(function mapper(file) {
				return _renderFileDiff(file, type);
			}).forEach(function iterator(node) {
				documentFragment.appendChild(node);
			});
		}
		add('unstaged');
		add('staged');
		diffNode.appendChild(documentFragment);
		this.updateModuleLayout(moduleName);
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
		items.forEach(function iterator(node) {
			node.addEventListener('mousedown', function(e) {
				if (!this.classList.contains('selected')) {
					me.selectFile(this.dataset.name, this.dataset.type);
				}
			}, false);
		});
	},
	
	_addModuleControlEvents: function(moduleName) {
		var msgInput = $m(moduleName, '.commitMessage');
		msgInput.addEventListener('keydown', function(e) {
			if (e.ctrlKey && e.keyCode === 13) {
				commit();
			}
		}, false);
		$m(moduleName,'.stageButton').addEventListener('click', function(e) {
			commander.stageAll(_handleGitResponse);
		}, false);
		$m(moduleName,'.unstageButton').addEventListener('click', function(e) {
			commander.unstageAll(_handleGitResponse);
		}, false);
		$m(moduleName,'.commitButton').addEventListener('click', commit, false);
		$m(moduleName,'.pushButton').addEventListener('click', function(e) {
			RemotePushDialog();
		}, false);
	},
	
	_getModuleFile: function(moduleName, selectedOnly) {
		var selector = selectedOnly ? '.fileList > li.selected' : '.fileList > li';
		var node = $m(moduleName, selector);
		return node ? {
			name: node.dataset.name, 
			type: node.dataset.type
		} : null;
	}
};

/**
 * 
 * @param {object} file {name, path, type, status, diff,staged, unstaged, unmerged, info, summary}
 * @param {String} type unstaged|staged
 * @returns {String}
 */
function _renderFileDiff(file, type) {
	var fileNode = document.importNode($('#gitModuleFileTpl').content, true).querySelector('.file');
	var isNewOrDeleted = ['new', 'deleted'].indexOf(file.status) > -1;
	var isSubmodule = file.type === 'submodule';
	fileNode.classList.add(type);
	if (isNewOrDeleted) {
		fileNode.classList.add('collapsed');
	}
	fileNode.dataset.type = type;
	fileNode.dataset.name = file.name;
	fileNode.dataset.path = file.path;
	fileNode.querySelector('.fileName').textContent = file.name;
	fileNode.querySelector('.fileName').title = 'Open file';
	fileNode.querySelector('.fileStatus').classList.add(file.status);
	fileNode.querySelector('.fileStatus').textContent = '[' + file.status + ']';
	fileNode.querySelector('.fileType').textContent = isSubmodule ? '[submodule]' : (file.info.mimeType || '');
	
	var diffHtml = '';
	if (file.diff) {
		diffHtml += '<table class="fileDiff">';
		diffHtml += file.diff.map(function processRange(range) {
			return '<tbody class="range">' + range.map(function processLine(line) {
				var lineTypeStr = (line.type === '-' ? 'deleted' : (line.type === '+' ? 'added' : 'neutral'));
				var symbol = line.type || ' ';
				return '<tr class="lineRow ' + lineTypeStr + '"><td class="line oldLine">' + (line.type === '-' ? line.oldLine : '') + '</td><td class="line newLine">' + (line.type !== '-' ? line.newLine : '') + '</td><td class="lineType">' + symbol + '</td><td>' + _renderFileDiffLine(file, line.content) + '</td></tr>';
			}).join('\n') + '</tbody>';
		}).join('');
		if (isNewOrDeleted) {
			diffHtml += '<tbody class="diffExpanderRow"><tr><td colspan="2"></td><td colspan="2"><span class="diffExpander">More...</span></td></tr></tbody>';
		}
		diffHtml += '</table>';
	} else if (isSubmodule && file.summary) {
		diffHtml += '<div class="summary">' + file.summary + '</div>';
	} else if (!isSubmodule) {
		diffHtml += file.info.isBinary ? '<div class="fileTypeLabel">[binary]</div>' : '<div class="fileTypeLabel">[empty]</div>';
	}
	fileNode.querySelector('.fileDiffContents').innerHTML = diffHtml;
	
	// events
	fileNode.addEventListener('click', function(e) {
		if (e.target.webkitMatchesSelector('.fileName, .newLine')) {
			var line = e.target.webkitMatchesSelector('.newLine') ? e.target.textContent : '';
			External.openFile(file, line);
		}
	}, false);
	
	fileNode.addEventListener('contextmenu', function(e) {
		var line = null;
		if (e.target.webkitMatchesSelector('.fileDiff .lineRow *')) {
			var node = e.target.parentNode;
			while (!node.webkitMatchesSelector('.lineRow')) {
				node = node.parentNode;
			}
			line = {
				type: node.querySelector('.lineType').textContent.trim() || null,
				number: parseInt(node.querySelector('.oldLine').textContent || node.querySelector('.newLine').textContent)
			};
		}
		AppMenus.showFileListMenu(file, type, e.clientX, e.clientY, line);
		e.preventDefault();
	}, false);
	
	var diffExpander = fileNode.querySelector('.diffExpander');
	if (diffExpander) {
		diffExpander.addEventListener('click', function(e) {
			if (fileNode.classList.contains('collapsed')) {
				fileNode.classList.remove('collapsed');
				UI.selectFile(file.name, type);
				this.textContent = '...Less';
			} else {
				fileNode.classList.add('collapsed');
				this.textContent = 'More...';
			}
		}, false);
	}
	
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
			commander.unstageFile(file, _handleGitResponse);
		} else {
			commander.stageFile(file, _handleGitResponse);
		}
	}, false);
	
	// file list context menu
	node.addEventListener('contextmenu', function(e) {
		AppMenus.showFileListMenu(file, type, e.clientX, e.clientY, null);
		e.preventDefault();
	}, false);
	return node;
}

function _handleGitResponse(err, response) {
	if (err) UI.showError(err);
	updateCurrentModuleStatus();
}
