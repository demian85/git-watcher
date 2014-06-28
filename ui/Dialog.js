var Dialog = (function() {
	var instance;
	function Dialog() {
		var node = document.importNode($('#dialogTpl').content, true).querySelector('#dialog');
		document.body.appendChild(node);
		window.getComputedStyle(node).cssText; // hack to trigger layout and make transitions work
		document.addEventListener('keydown', function(e) {
			if (e.keyCode === 27) instance.close();
		});
		$('#dialogCloseBtn').addEventListener('click', function(e) {
			instance.close();
		});
	}
	Dialog.prototype = {
		open: function(title, childNode) {
			$('#dialogTitle').textContent = title;
			$('#dialogMain').innerHTML = '';
			$('#dialogMain').appendChild(childNode);
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.add('visible');
		},
		writeOutput: function(str) {
			$('#dialogOutput').textContent += str.trim() + '\n';
			$('#dialogOutput').scrollTop = $('#dialogOutput').scrollHeight;
		},
		close: function() {
			$('#dialogTitle').textContent = '';
			$('#dialogOutput').textContent = '';
			$('#dialog').classList.remove('visible');
		}
	};
	return function() {
		if (!instance) instance = new Dialog();
		return instance;
	};
})();


var BranchCheckoutDialog = (function() {
	function doCheckout(branchName) {
		Git.checkoutBranch(currentModulePath, branchName, gitErrHandler.intercept(function(output) {
			Dialog().writeOutput(output);
		}));
	}
	return function() {
		Git.getLocalBranches(currentModulePath, gitErrHandler.intercept(function(branches) {
			var node = document.importNode($('#branchCheckoutTpl').content, true).querySelector('.branchCheckout');
			var listNode = $('.branchList', node);
			listNode.innerHTML = branches.map(function(branch) {
				return '<option value="' + branch.name + '" data-upstream="' + branch.upstream + '">' + branch.name + '</option>';
			}).join('');
			$('.branchCheckoutAccept', node).addEventListener('click', function() {
				if (listNode.selectedIndex === -1) return;
				var branchName = listNode.value;
				var upstream = listNode.options[listNode.selectedIndex].dataset.upstream || '';
				var doFetch = $('.branchCheckoutFetchOption', node).checked && upstream;
				if (doFetch) {
					Git.fetch(currentModulePath, upstream.split('/')[0], upstream.split('/')[1], gitErrHandler.intercept(function(output) {
						Dialog().writeOutput(output);
						doCheckout(branchName);
					}));
				} else {
					doCheckout(branchName);
				}
			});
			$('.branchCheckoutCancel', node).addEventListener('click', function() {
				Dialog().close();
			});
			Dialog().open('Checkout branch', node);
		}));
	};
})();

var BranchCreateDialog = (function() {
	return function() {
		var node = document.importNode($('#branchCreateTpl').content, true).querySelector('.branchCreate');
		$('.branchCreateAccept', node).addEventListener('click', function() {
			var branchName = $('.branchCreateName', node).value.trim();
			var doCheckout = $('.branchCreateCheckoutOption', node).checked;
			Git.createBranch(currentModulePath, branchName, doCheckout, gitErrHandler.intercept(function(output) {
				Dialog().writeOutput(output);
				$('.branchCreateName', node).value = '';
			}));
		});
		$('.branchCreateCancel', node).addEventListener('click', function() {
			Dialog().close();
		});
		Dialog().open('Create branch', node);
	};
})();
