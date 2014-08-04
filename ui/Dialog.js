var Dialog = (function() {
	var instance;
	function Dialog() {
		var node = document.importNode($('#dialogTpl').content, true).querySelector('#dialog');
		document.body.appendChild(node);
		window.getComputedStyle(node).cssText; // hack to trigger layout and make transitions work
		$('#dialogCloseBtn').addEventListener('click', function(e) {
			instance.close();
		});
	}
	function closeListener(e) {
		if (e.keyCode === 27) instance.close();
	}
	function handleCommandOutput(err) {
		var statusNode = $('#dialogOutputStatus');
		if (err) {
			statusNode.textContent = 'Error';
			statusNode.classList.remove('success');
			statusNode.classList.add('error');
		} else {
			statusNode.textContent = 'Success';
			statusNode.classList.add('success');
			statusNode.classList.remove('error');
		}
	}
	
	Dialog.prototype = {
		open: function(title, contentNode) {
			document.addEventListener('keydown', closeListener);
			$('#dialogTitle').textContent = title;
			$('#dialogMain').innerHTML = '';
			if (contentNode) {
				$('#dialogMain').appendChild(contentNode);
			} else {
				$('#dialog').classList.add('empty');
			}
			$('#dialog').classList.add('visible');
			
			commander.on('cmdend', handleCommandOutput);
		},
		clearOutput: function() {
			$('#dialogOutput').textContent = '';
		},
		writeOutput: function(str) {
			str = str.trim();
			if (str) $('#dialogOutput').textContent += str + '\n';
			$('#dialogOutput').scrollTop = $('#dialogOutput').scrollHeight;
		},
		close: function() {
			document.removeEventListener('keydown', closeListener);
			$('#dialogTitle').textContent = '';
			$('#dialogOutput').textContent = '';
			$('#dialogOutputStatus').textContent = '';
			$('#dialog').classList.remove('visible', 'empty');
			
			commander.removeListener('cmdend', handleCommandOutput);
		}
	};
	return function() {
		if (!instance) instance = new Dialog();
		return instance;
	};
})();



var DialogHelper = {
	getBranchListAsDocumentFragment: function(callback) {
		function selectRow() {
			var row = this, siblings = $$('tr', row.parentNode);
			siblings.forEach(function(item) {
				if (row === item) item.classList.add('selected');
				else item.classList.remove('selected');
			});
		}
		commander.getLocalBranches(gitErrHandler.intercept(function(branches) {
			var documentFragment = document.createDocumentFragment();
			branches.forEach(function(branch) {
				var row = document.importNode($('#branchListItemTpl').content, true).querySelector('tr');
				row.addEventListener('click', selectRow);
				row.dataset.branchName = branch.name;
				row.dataset.upstreamBranch = branch.upstream;
				var commitContents = [
					'<div><strong>Commit</strong> ' + branch.lastCommit.objectName + '</div>',
					'<div><em>' + branch.lastCommit.date + '</em></div>',
					'<div>by <em>' + branch.lastCommit.authorName + ' &lt;' + branch.lastCommit.authorEmail + '&gt;</em></div>',
					'<div class="branchListItemCommitSubject">' + branch.lastCommit.subject + '</div>'
				];
				$('.branchListItemName', row).textContent = branch.name;
				$('.branchListItemCommit', row).innerHTML = commitContents.join('');
				documentFragment.appendChild(row);
			});
			callback(documentFragment);
		}));
	}
};



var BranchCheckoutDialog = (function() {
	function doCheckout(branchName) {
		commander.checkoutBranch(branchName, gitErrHandler.intercept(function(output) {
			Dialog().writeOutput(output);
		}));
	}
	return function() {
		DialogHelper.getBranchListAsDocumentFragment(function(branchListFragment) {
			var node = document.importNode($('#branchCheckoutTpl').content, true).querySelector('.dialogMainSection');
			Dialog().open('Checkout branch', node);
			$('.branchList tbody').appendChild(branchListFragment);
			$('.branchCheckoutAccept').addEventListener('click', function() {
				var selectedBranch = $('.branchList tr.selected');
				if (!selectedBranch) return;
				var branchName = selectedBranch.dataset.branchName;
				var upstream = selectedBranch.dataset.upstreamBranch || '';
				var doFetch = $('.branchCheckoutFetchOption').checked && upstream;
				if (doFetch) {
					commander.fetch(upstream.split('/')[0], upstream.split('/')[1], gitErrHandler.intercept(function(output) {
						Dialog().writeOutput(output);
						doCheckout(branchName);
					}));
				} else {
					doCheckout(branchName);
				}
			});
			$('.branchCheckoutCancel').addEventListener('click', function() {
				Dialog().close();
			});
		});
	};
})();



var BranchDeleteDialog = (function() {
	function updateList() {
		DialogHelper.getBranchListAsDocumentFragment(function(branchListFragment) {
			var tbody = $('.branchList tbody');
			tbody.innerHTML = '';
			tbody.appendChild(branchListFragment);
		});
	}
	return function() {
		DialogHelper.getBranchListAsDocumentFragment(function(branchListFragment) {
			var node = document.importNode($('#branchDeleteTpl').content, true).querySelector('.dialogMainSection');
			Dialog().open('Delete branch', node);
			$('.branchList tbody').appendChild(branchListFragment);
			$('.branchDeleteAccept').addEventListener('click', function() {
				var selectedBranch = $('.branchList tr.selected');
				if (!selectedBranch) return;
				var branchName = selectedBranch.dataset.branchName;
				var options = {
					force: $('.branchDeleteForceOption').checked
				};
				commander.deleteBranch(branchName, options, gitErrHandler.intercept(function(output) {
					Dialog().writeOutput(output);
					updateList();
				}));
			});
			$('.branchDeleteCancel').addEventListener('click', function() {
				Dialog().close();
			});
		});
	};
})();



var BranchCreateDialog = (function() {
	return function() {
		var node = document.importNode($('#branchCreateTpl').content, true).querySelector('.branchCreate');
		Dialog().open('Create branch', node);
		$('.branchCreateAccept').addEventListener('click', function() {
			var branchName = $('.branchCreateName').value.trim();
			var doCheckout = $('.branchCreateCheckoutOption').checked;
			commander.createBranch(branchName, doCheckout, gitErrHandler.intercept(function(output) {
				Dialog().writeOutput(output);
				$('.branchCreateName').value = '';
			}));
		});
		$('.branchCreateCancel').addEventListener('click', function() {
			Dialog().close();
		});
	};
})();



var RemotePushDialog = (function() {
	function buildRemoteNamesOptions(remotes) {
		var documentFragment = document.createDocumentFragment();
		remotes.forEach(function(name) {
			var option = document.createElement('option');
			option.value = name;
			option.textContent = name;
			if (name === 'origin') option.selected = true;
			documentFragment.appendChild(option);
		});
		return documentFragment;
	}
	return function() {
		commander.getRemotes(gitErrHandler.intercept(function(remotes) {
			var node = document.importNode($('#remotePushTpl').content, true).querySelector('.dialogMainSection');
			Dialog().open('Push', node);
			$('.remotePushName').appendChild(buildRemoteNamesOptions(remotes));
			$('.remotePushAccept').addEventListener('click', function() {
				var remoteName = $('.remotePushName').value;
				var options = {
					includeTags: $('.remotePushIncludeTagsOption').checked
				};
				commander.push(remoteName, options, gitErrHandler.intercept(function(output) {
					Dialog().writeOutput(output);
					updateCurrentModuleStatus();
				}));
			});
			$('.remotePushCancel').addEventListener('click', function() {
				Dialog().close();
			});
		}));
	};
})();



var FileStatisticsDialog = (function() {
	function getData(file, callback) {
		var limitNumberNode = $('.fileStatisticsTopCommittersOptions input[name=fileStatisticsTopCommittersLimitOption]');
		commander.getFileTopCommitters(file, limitNumberNode ? limitNumberNode.value : 20, getExtraOptions(), gitErrHandler.intercept(callback));
	}
	function updateData(items) {
		$('.fileStatisticsTopCommitters tbody').innerHTML = items.map(function(item) {
			return '<tr><td>' + item.count + '</td><td>' + item.name + '</td><td><a href="mailto:' + item.email + '">' + item.email + '</a></td></tr>';
		}).join('');
	}
	function getExtraOptions() {
		var mergesOption = $('.fileStatisticsTopCommittersOptions input:checked');
		var extraOptions = [];
		if (mergesOption) extraOptions.push(mergesOption.value);
		return extraOptions;
	}
	return function(file) {
		var node = document.importNode($('#fileStatisticsTpl').content, true).querySelector('.fileStatistics');
		$$('.fileStatisticsTopCommittersOptions input', node).forEach(function(input) {
			input.addEventListener('change', function() {
				getData(file, updateData);
			});
		});
		getData(file, function(items) {
			Dialog().open(file.name + ' statistics', node);
			updateData(items);
		});
	};
})();
