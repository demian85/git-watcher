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
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.add('visible');
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
			$('#dialog').classList.remove('visible', 'empty');
		}
	};
	return function() {
		if (!instance) instance = new Dialog();
		return instance;
	};
})();



var BranchCheckoutDialog = (function() {
	function doCheckout(branchName) {
		commander.checkoutBranch(branchName, gitErrHandler.intercept(function(output) {
			Dialog().writeOutput(output);
		}));
	}
	function selectRow() {
		var row = this, items = $$('.branchList tbody > tr');
		items.forEach(function(item) {
			if (row === item) item.classList.add('selected');
			else item.classList.remove('selected');
		});
	}
	return function() {
		commander.getLocalBranches(gitErrHandler.intercept(function(branches) {
			var node = document.importNode($('#branchCheckoutTpl').content, true).querySelector('.branchCheckout');
			Dialog().open('Checkout branch', node);
			var branchListNode = $('.branchList tbody');
			branches.forEach(function(branch) {
				var row = document.importNode($('#branchCheckoutItemTpl').content, true).querySelector('tr');
				row.addEventListener('click', selectRow);
				row.dataset.branchName = branch.name;
				row.dataset.upstreamBranch = branch.upstream;
				var commitContents = [
					'<div><strong>Commit</strong> ' + branch.lastCommit.objectName + '</div>',
					'<div><em>' + branch.lastCommit.date + '</em></div>',
					'<div>by <em>' + branch.lastCommit.authorName + ' &lt;' + branch.lastCommit.authorEmail + '&gt;</em></div>',
					'<div class="branchCheckoutItemCommitSubject">' + branch.lastCommit.subject + '</div>'
				];
				$('.branchCheckoutItemName', row).textContent = branch.name;
				$('.branchCheckoutItemCommit', row).innerHTML = commitContents.join('');
				branchListNode.appendChild(row);
			});
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
		}));
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



var FileStatisticsDialog = (function() {
	return function(file) {
		commander.getFileTopCommitters(file, 20, gitErrHandler.intercept(function(items) {
			var node = document.importNode($('#fileStatisticsTpl').content, true).querySelector('.fileStatistics');
			Dialog().open(file.name + ' statistics', node);
			$('.fileStatisticsTopCommitters tbody').innerHTML = items.map(function(item) {
				return '<tr><td>' + item.count + '</td><td>' + item.name + '</td><td>' + item.email + '</td></tr>';
			}).join('');
		}));
	};
})();
