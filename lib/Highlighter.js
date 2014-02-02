var util = require('util');

var highlighters = {
	'.js': JsHighlighter,
	'.php': PhpHighlighter
};

function escapeHtml(input) {
	return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function Highlighter() { }

Highlighter.prototype.highlight = function(code) {
	this._comments = {};
	this._strings = {};
	this._commentsCounter = 0;
	this._stringsCounter = 0;
	code = escapeHtml(code);
	code = this._replaceComments(code);
	code = this._replaceStrings(code);
	code = this.highlightKeywords(code);
	code = this.highlightStrings(code);
	code = this.highlightComments(code);
	return code;
};

Highlighter.prototype.getKeywords = function(code) {
	return [];
};

Highlighter.prototype.highlightKeywords = function(code) {
	var keywords = this.getKeywords();
	if (keywords.length) {
		var regExp = new RegExp('(\\b(?:' + keywords.join('|') + ')\\b)', 'g');
		code = code.replace(regExp, '<span class="keyword">$1</span>');
	}
	return code;
};

Highlighter.prototype.highlightStrings = function(code) {
	var me = this;
	return code.replace(/<<s(\d+)>>/g, function(match, g1) {
		return '<span class="string">' + me._restoreStrings(me._strings[g1]) + '</span>';
	});
};

Highlighter.prototype.highlightComments = function(code) {
	var me = this;
	return code.replace(/<<c(\d+)>>/g, function(match, g1) {
		return '<span class="comment">' + me._comments[g1] + '</span>';
	});
};

Highlighter.prototype._replaceComments = function(code) {
	var me = this;
	return code.replace(/(\/\/.*$)/g, function(match, g1) {
		var index = me._commentsCounter++;
		me._comments[index] = g1;
		return '<<c' + index + '>>';
	});
};

Highlighter.prototype._replaceStrings = function(code) {
	var me = this;
	var replacer = function(match, g1) {
		var index = me._stringsCounter++;
		me._strings[index] = g1;
		return '<<s' + index + '>>';
	};
	return code.replace(/("((?:[^"\\]+|\\\\|\\"|\\)*)")/g, replacer)
			.replace(/('((?:[^'\\]+|\\\\|\\'|\\)*)')/g, replacer);
};

Highlighter.prototype._restoreStrings = function(code) {
	var me = this;
	return code.replace(/<<s(\d+)>>/g, function(match, g1) {
		return me._strings[g1];
	});
};



function JsHighlighter() {
	Highlighter.call(this);
}

util.inherits(JsHighlighter, Highlighter);

JsHighlighter.prototype.getKeywords = function() {
	return ["new", "this", "function", "var", "return", "if", "else", "while", "for", "switch", "break", "case", 
			"default", "continue", "do", "let", "const", "yield", "true", "false", "null"];
};



function PhpHighlighter() {
	Highlighter.call(this);
}

util.inherits(PhpHighlighter, Highlighter);

PhpHighlighter.prototype.getKeywords = function() {
	return ["new", "function", "public", "private", "protected", "class", "interface", "extends", "implements", "return", 
			"if", "else", "while", "for", "switch", "break", "case", 
			"default", "continue", "do", "const", "use", "true", "false", "null"];
};



module.exports = {
	getInstance: function(language) {
		return highlighters[language] ? new highlighters[language] : null;
	},
	highlightConflict: function(lineText) {
		return lineText.replace(/^((?:<<<<<<<\s*\w+)|(?:=======)|(?:>>>>>>>\s*\w+))$/, function(match, g1) {
			return '<span class="conflict">' + escapeHtml(g1) + '</span>';
		});
	},
	Highlighter: Highlighter,
	JsHighlighter: JsHighlighter,
	PhpHighlighter: PhpHighlighter
};