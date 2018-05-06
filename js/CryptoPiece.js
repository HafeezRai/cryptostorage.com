/**
 * MIT License
 * 
 * Copyright (c) 2018 cryptostorage
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Encapsulates a collection of keypairs.
 * 
 * Initializes from the first non-null argument.
 * 
 * @param config specifies initialization configuration
 * 				config.keypairs keypairs are keypairs to initialize with
 * 				config.json is json to initialize from
 * 				config.csv is csv to initialize from
 * 				config.splitPieces are split pieces to combine and initialize from
 * 				config.piece is an existing piece to copy from
 *  			config.pieceNum is the pieceNumber to assign to each piece (optional)
 */
function CryptoPiece(config) {
	
	var that = this;
	var state;
	var _isDestroyed;
		
	this.getKeypairs = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		return state.keypairs;
	}
	
	this.hasPublicAddresses = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		var bool;
		for (var i = 0; i < state.keypairs.length; i++) {
			if (isUndefined(bool)) bool = state.keypairs[i].hasPublicAddress();
			else if (bool !== state.keypairs[i].hasPublicAddress()) throw new Error("Inconsistent hasPublicAddress() on keypair[" + i + "]");
		}
		return isDefined(bool) ? bool : false;
	}
	
	this.hasPrivateKeys = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		var bool;
		for (var i = 0; i < state.keypairs.length; i++) {
			if (isUndefined(bool)) bool = state.keypairs[i].hasPrivateKey();
			else if (bool !== state.keypairs[i].hasPrivateKey()) throw new Error("Inconsistent hasPrivateKey() on keypair[" + i + "]");
		}
		return bool;
	}
	
	this.encrypt = function(passphrase, schemes, onProgress, onDone) {
		assertFalse(_isDestroyed, "Piece is destroyed");
		
		// verify input
		assertFalse(that.isEncrypted());
		assertInitialized(passphrase);
		assertEquals(state.keypairs.length, schemes.length);
		assertInitialized(onDone);
		
		// track weights for progress
		var doneWeight = 0;
		var totalWeight = CryptoKeypair.getEncryptWeight(schemes);
		
		// collect encryption functions
		var funcs = [];
		for (var i = 0; i < state.keypairs.length; i++) {
			funcs.push(encryptFunc(state.keypairs[i], schemes[i], passphrase));
		}
		
		// encrypt async
		if (onProgress) onProgress(0, "Encrypting keypairs");
		setImmediate(function() {	// let browser breath
			async.parallelLimit(funcs, AppUtils.ENCRYPTION_THREADS, function(err, encryptedKeypairs) {
				if (err) onDone(err);
				else onDone(null, that);
			});
		});
		
		function encryptFunc(keypair, scheme, passphrase) {
			return function(onDone) {
				if (_isDestroyed) return;
				keypair.encrypt(scheme, passphrase, function(percent) {
					if (onProgress) onProgress((doneWeight +  CryptoKeypair.getEncryptWeight(scheme) * percent) / totalWeight, "Encrypting keypairs");
				}, function(err, keypair) {
					if (err) onDone(err);
					else {
						assertTrue(keypair.isEncrypted());
						doneWeight += CryptoKeypair.getEncryptWeight(scheme);
						if (onProgress) onProgress(doneWeight / totalWeight, "Encrypting keypairs");
						setImmediate(function() { onDone(null, keypair); });	// let UI breath
					}
				});
			}
		}
	}
	
	this.isEncrypted = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		var encryption = -1;
		for (var i = 0; i < state.keypairs.length; i++) {
			if (encryption === -1) encryption = state.keypairs[i].isEncrypted();
			else if (encryption !== state.keypairs[i].isEncrypted()) throw new Error("state.keypairs[" + i + "] encryption is inconsistent");
		}
		return encryption;
	}
	
	this.decrypt = function(passphrase, onProgress, onDone) {
		assertFalse(_isDestroyed, "Piece is destroyed");

		// validate input
		assertTrue(that.isEncrypted());
		assertTrue(state.keypairs.length > 0);
		assertInitialized(passphrase);
		assertInitialized(onDone);
		
		// compute total weight
		var totalWeight = 0;
		for (var i = 0; i < state.keypairs.length; i++) {
			totalWeight += CryptoKeypair.getDecryptWeight(state.keypairs[i].getEncryptionScheme());
		}
		
		// decrypt keys
		var funcs = [];
		for (var i = 0; i < state.keypairs.length; i++) funcs.push(decryptFunc(state.keypairs[i], passphrase));
		var doneWeight = 0;
		if (onProgress) onProgress(0, "Decrypting");
		setImmediate(function() {	// let browser breath
			async.parallelLimit(funcs, AppUtils.ENCRYPTION_THREADS, function(err, encryptedKeypairs) {
				if (err) onDone(err);
				else {
					assertEquals(doneWeight, totalWeight);
					onDone(null, that);
				}
			});
		});
		
		// decrypts one key
		function decryptFunc(keypair, passphrase) {
			return function(onDone) {
				if (_isDestroyed) return;
				var scheme = keypair.getEncryptionScheme();
				keypair.decrypt(passphrase, function(percent) {
					if (onProgress) onProgress((doneWeight + CryptoKeypair.getDecryptWeight(scheme) * percent) / totalWeight, "Decrypting");
				}, function(err, encryptedKeypair) {
					if (err) onDone(err);
					else {
						doneWeight += CryptoKeypair.getDecryptWeight(scheme);
						if (onProgress) onProgress(doneWeight / totalWeight, "Decrypting");
						setImmediate(function() { onDone(err, encryptedKeypair); });	// let UI breath
					}
				});
			}
		}
	}
	
	this.split = function(numShares, minShares) {
		assertFalse(_isDestroyed, "Piece is destroyed");
		
		// collect all split keypairs
		var allSplitKeypairs = [];
		for (var i = 0; i < numShares; i++) allSplitKeypairs.push([]);
		for (var i = 0; i < state.keypairs.length; i++) {
			var splitKeypairs = state.keypairs[i].split(numShares, minShares);
			for (var j = 0; j < splitKeypairs.length; j++) {
				allSplitKeypairs[j].push(splitKeypairs[j]);
			}
		}
		
		// build split pieces
		var splitPieces = [];
		for (var i = 0; i < allSplitKeypairs.length; i++) {
			splitPieces.push(new CryptoPiece({keypairs: allSplitKeypairs[i]}));
		}
		return splitPieces;
	}
	
	this.isSplit = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		assertTrue(state.keypairs.length > 0);
		return state.keypairs[0].isSplit();
	}
	
	this.getMinPieces = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		assertTrue(state.keypairs.length > 0);
		return state.keypairs[0].getMinShares();
	}
	
	this.getPieceNum = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		assertTrue(state.keypairs.length > 0);
		return state.keypairs[0].getShareNum();
	}
	
	this.setPieceNum = function(pieceNum) {
		assertFalse(_isDestroyed, "Piece is destroyed");
		for (var i = 0; i < state.keypairs.length; i++) state.keypairs[i].setShareNum(pieceNum);
		return this;
	}
	
	this.removePublicAddresses = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		for (var i = 0; i < state.keypairs.length; i++) state.keypairs[i].removePublicAddress();
		return this;
	}
	
	this.removePrivateKeys = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		for (var i = 0; i < state.keypairs.length; i++) state.keypairs[i].removePrivateKey();
		return this;
	}
	
	this.copy = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		var keypairCopies = [];
		for (var i = 0; i < state.keypairs.length; i++) keypairCopies.push(state.keypairs[i].copy());
		return new CryptoPiece({keypairs: keypairCopies});
	}
	
	this.toString = function(fileType) {
		assertFalse(_isDestroyed, "Piece is destroyed");
		switch (fileType) {
			case AppUtils.FileType.CSV:
				return that.toCsv();
			case AppUtils.FileType.TXT:
				return that.toTxt();
			case AppUtils.FileType.JSON:
				return that.toJsonStr();
			default:
				assertUndefined(fileType);
				return that.toJsonStr();
		}
	}
	
	this.toJson = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		var json = {};
		json.pieceNum = that.getPieceNum();
		json.version = AppUtils.VERSION;
		json.keypairs = [];
		for (var i = 0; i < state.keypairs.length; i++) json.keypairs.push(state.keypairs[i].toJson());
		return json;
	}
	
	this.toJsonStr = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		return JSON.stringify(that.toJson());
	}
	
	this.toCsv = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		
		// columns to exclude
		var excludes = [CryptoKeypair.CsvHeader.PRIVATE_HEX, CryptoKeypair.CsvHeader.MIN_SHARES];
		
		// collect headers
		var headers = [];
		for (prop in CryptoKeypair.CsvHeader) {
			if (arrayContains(excludes, prop.toString())) continue;
			if (CryptoKeypair.CsvHeader.hasOwnProperty(prop)) {
	    	headers.push(CryptoKeypair.CsvHeader[prop.toString()]);
	    }
		}
		
		// collect content
		var csvArr = [headers];
		for (i = 0; i < state.keypairs.length; i++) {
			var keypairValues = [];
			for (var j = 0; j < headers.length; j++) {
				var value = state.keypairs[i].getCsvValue(headers[j]);
				if (value === null) value = "null";
				if (value === undefined) value = "";
				keypairValues.push(value);
			}
			csvArr.push(keypairValues);
		}
		
		// convert array to csv
		return arrToCsv(csvArr);
	}
	
	this.toTxt = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		var str = "";
		for (var i = 0; i < state.keypairs.length; i++) {
			str += "===== #" + (i + 1) + " " + state.keypairs[i].getPlugin().getName() + " =====\n\n";
			var publicAddress = state.keypairs[i].getPublicAddress();
			if (isDefined(publicAddress)) {
				if (!state.keypairs[i].getPlugin().hasPublicAddress()) publicAddress = "Not applicable";
				str += "Public Address:\n" + publicAddress + "\n\n";
			}
			if (isDefined(state.keypairs[i].getPrivateWif())) str += state.keypairs[i].getPlugin().getPrivateLabel() + " " + (that.getPieceNum() ? "(split)" : (state.keypairs[i].isEncrypted() ? "(encrypted)" : "(unencrypted)")) + ":\n" + state.keypairs[i].getPrivateWif() + "\n\n";
		}
		return str.trim();
	}
	
	this.equals = function(piece) {
		assertFalse(_isDestroyed, "Piece is destroyed");
		assertObject(piece, CryptoPiece);
		var state2 = piece.getInternalState();
		if (state.version !== state2.version) return false;
		if (state.pieceNum !== state2.pieceNum) return false;
		if (state.keypairs.length !== state2.keypairs.length) return false;
		for (var i = 0; i < state.keypairs.length; i++) {
			if (!state.keypairs[i].equals(state2.keypairs[i])) return false;
		}
		return true;
	}
	
	this.getInternalState = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		return state;
	}
	
	this.getEncryptWeight = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		assertFalse(this.isEncryped(), "Cannot get encrypt weight if piece is unencrypted");
		throw new Error("Not implemented");
	}
	
	this.getDecryptWeight = function() {
		assertFalse(_isDestroyed, "Piece is destroyed");
		assertTrue(this.isEncrypted(), "Cannot get decrypt weight if piece is encrypted");
		var schemes = [];
		for (var i = 0; i < state.keypairs.length; i++) schemes.push(state.keypairs[i].getEncryptionScheme());
		return CryptoKeypair.getDecryptWeight(schemes);
	}
	
	this.destroy = function() {
		assertFalse(_isDestroyed, "Piece is already destroyed");
		for (var i = 0; i < state.keypairs.length; i++) state.keypairs[i].destroy();
		deleteProperties(state);
		_isDestroyed = true;
	}
	
	this.isDestroyed = function() {
		return _isDestroyed;
	}
	
	// -------------------------------- PRIVATE ---------------------------------
	
	init();
	function init() {
		_isDestroyed = false;
		state = {};
		if (config.keypairs) setKeypairs(config.keypairs);
		else if (config.json) fromJson(config.json);
		else if (config.splitPieces) combine(config.splitPieces);
		else if (config.piece) fromPiece(config.piece);
		else if (config.csv) fromCsv(config.csv);
		else if (config.txt) fromTxt(config.txt);
		else throw new Error("Config missing required fields");
		if (isDefined(config.pieceNum)) that.setPieceNum(config.pieceNum);
	}
	
	function setKeypairs(keypairs, pieceNum) {
		assertTrue(keypairs.length > 0);
		for (var i = 0; i < keypairs.length; i++) {
			assertObject(keypairs[i], CryptoKeypair);
			if (isDefined(pieceNum)) keypairs[i].setShareNum(pieceNum);
		}
		state.keypairs = keypairs;
	}
	
	function fromJson(json) {
		if (isString(json)) json = JSON.parse(json);
		assertArray(json.keypairs);
		assertTrue(json.keypairs.length > 0);
		var keypairs = [];
		for (var i = 0; i < json.keypairs.length; i++) keypairs.push(new CryptoKeypair({json: json.keypairs[i]}));
		setKeypairs(keypairs);
	}
	
	function fromCsv(csv) {
		assertString(csv);
		assertInitialized(csv);
		
		// convert csv to array
		var csvArr = csvToArr(csv);
		assertTrue(csvArr.length > 0);
		assertTrue(csvArr[0].length > 0);
		
		// build keypairs
		var keypairs = [];
		for (var row = 1; row < csvArr.length; row++) {
			var keypairConfig = {};
			for (var col = 0; col < csvArr[0].length; col++) {
				var value = csvArr[row][col];
				if (value === "") value = undefined;
				if (value === "null") value = null;
				switch (csvArr[0][col]) {
					case CryptoKeypair.CsvHeader.TICKER:
						keypairConfig.plugin = AppUtils.getCryptoPlugin(value);
						break;
					case CryptoKeypair.CsvHeader.PRIVATE_WIF:
					case CryptoKeypair.CsvHeader.PRIVATE_HEX:
						keypairConfig.privateKey = value;
						break;
					case CryptoKeypair.CsvHeader.PUBLIC_ADDRESS:
						keypairConfig.publicAddress = value;
						break;
					case CryptoKeypair.CsvHeader.SHARE_NUM:
						if (value) {
							value = parseInt(value, 10);
							assertTrue(isInt(value));
						}
						keypairConfig.shareNum = value;
						break;
				}
			}
			keypairs.push(new CryptoKeypair(keypairConfig));
		}
		
		// set internal keypairs
		setKeypairs(keypairs);
	}
	
	function fromTxt(txt) {
		assertString(txt);
		assertInitialized(txt);
		var piece = CryptoPiece.parseTextPiece(txt);
		assertObject(piece, CryptoPiece, "Could not parse piece from text");
		fromPiece(piece);
	}
	
	function combine(splitPieces) {
		
		// verify consistent min pieces and num keypairs
		var minPieces;
		var numKeypairs;
		for (var i = 0; i < splitPieces.length; i++) {
			assertTrue(splitPieces[0].isSplit());
			if (!minPieces) minPieces = splitPieces[i].getMinPieces();
			else if (minPieces !== splitPieces[i].getMinPieces()) throw new Error("config.splitPieces[" + i + "].getMinPieces() has inconsistent min pieces");
			if (!numKeypairs) numKeypairs = splitPieces[i].getKeypairs().length;
			else if (numKeypairs !== splitPieces[i].getKeypairs().length) throw new Error("config.splitPieces[" + i + "].getKeypairs() has inconsistent number of keypairs");
		}
		assertTrue(numKeypairs > 0);
		
		// check if min pieces met
		if (isNumber(minPieces) && splitPieces.length < minPieces) {
			var additional = minPieces - splitPieces.length;
			throw new Error("Need " + additional + " additional " + (additional === 1 ? "piece" : "pieces") + " to recover private keys");
		} else if (splitPieces.length < 2) {
			throw new Error("Need additional shares to recover private key");
		}
		
		// combine keypairs
		var combinedKeypairs = [];
		for (var i = 0; i < numKeypairs; i++) {
			var splitKeypairs = [];
			for (var j = 0; j < splitPieces.length; j++) splitKeypairs.push(splitPieces[j].getKeypairs()[i]);
			try {
				combinedKeypairs.push(new CryptoKeypair({splitKeypairs: splitKeypairs}));
			} catch (err) {
				if (err.message.indexOf("additional") > -1) throw new Error("Need additional pieces to recover private keys");
				else throw err;
			}
		}
		
		// set keypairs to combined keypairs
		setKeypairs(combinedKeypairs);
	}
	
	function fromPiece(piece) {
		var keypairCopies = [];
		for (var i = 0; i < piece.getKeypairs().length; i++) {
			keypairCopies.push(piece.getKeypairs()[i].copy());
		}
		setKeypairs(keypairCopies);
	}
}

/**
 * Returns the single common crypto plugin among the given pieces.
 * 
 * @param pieces is a piece or pieces to get a common plugin from
 * @returns CryptoPlugin if a single common plugin exists, null if multiple plugins are used
 */
CryptoPiece.getCommonPlugin = function(pieces) {
	pieces = listify(pieces);
	assertTrue(pieces.length > 0);
	var plugin;
	for (var i = 0; i < pieces.length; i++) {
		assertObject(pieces[i], CryptoPiece);
		for (var j = 0; j < pieces[i].getKeypairs().length; j++) {
			if (!plugin) plugin = pieces[i].getKeypairs()[j].getPlugin();
			else if (plugin.getTicker() !== pieces[i].getKeypairs()[j].getPlugin().getTicker()) return null;
		}
	}
	return plugin;
}

/**
 * Parses a string to a piece.
 * 
 * @param str is the string to parse to a piece
 * @param plugin is the plugin associated with the keys to parse
 * @returns a CryptoPiece parsed from the string, null if cannot parse
 */
CryptoPiece.parse = function(str, plugin) {
	
	// validate non-empty string
	assertTrue(isString(str));
	assertFalse(str.trim() === "");
	
	// try to parse json
	try { return new CryptoPiece({json: str}); }
	catch (err) { }
	
	// try to parse csv
	try { return new CryptoPiece({csv: str}); }
	catch (err) {}
	
	// try to parse txt
	try { return new CryptoPiece({txt: str}); }
	catch (err) {}
	
	// otherwise must have plugin
	if (!plugin) throw new Error("Plugin required to parse pieces");
	
	// get lines
	var lines = getLines(str);
	for (var i = 0; i < lines.length; i++) lines[i] = lines[i].trim();
	lines.removeVal("");
	
	// build keypairs treating lines as private keys
	var keypairs = [];
	for (var i = 0; i < lines.length; i++) {
		try {
			keypairs.push(new CryptoKeypair({plugin: plugin, privateKey: lines[i]}));
		} catch (err) {
			return null;	// bail if invalid key given
		}
	}
	
	// return piece
	try {
		return new CryptoPiece({keypairs: keypairs});
	} catch (err) {
		return null;
	}
}

/**
 * Parses a text piece.
 * 
 * @param txt is the text piece to parse
 */
CryptoPiece.parseTextPiece = function(txt) {
	assertString(txt);
	
	// annotate text
	var annotatedText = new AnnotatedText(txt.toLowerCase());			// going to be annotating text with metadata
	annotateCryptos(annotatedText, AppUtils.getCryptoPlugins());	// identify all crypo instances by name
	annotatedText.removeSubsumedAnnotations();										// remove any that are covered by a larger annotation
	annotatePublicPrivateLabels(annotatedText);										// identify all labels for public/private values
	annotatePublicPrivateValues(annotatedText);										// identify all private values
	annotatedText.removeSubsumedAnnotations();										// remove any that are covered by a larger annotation
	return annotatedTextToPiece(annotatedText);										// convert the annotated text to a crypo piece
	
	function annotateCryptos(annotatedText, plugins) {
		for (var i = 0; i < plugins.length; i++) {
			annotateInstances(annotatedText, plugins[i].getName().toLowerCase(), null, null, {plugin: plugins[i]}, true);
		}
	}
	
	function annotateInstances(annotatedText, str, startIdx, endIdx, metadata, tokensOnly) {
		while (true) {
			var idx = annotatedText.getText().indexOf(str, startIdx);
			if (idx === -1 || (endIdx && idx + str.length > endIdx)) return;
			var ann = new Annotation(annotatedText, idx, idx + str.length, metadata);
			if (!tokensOnly || isToken(ann)) annotatedText.addAnnotation(ann);
			startIdx = idx + 1;
		}
	}
	
	function isToken(annotation) {
		var txt = annotation.getAnnotatedText().getText();
		if (annotation.getStartIdx() > 0 && !isWhitespace(txt[annotation.getStartIdx() - 1])) return false;
		if (annotation.getEndIdx() < txt.length && !isWhitespace(txt[annotation.getEndIdx()])) return false;
		return true;
	}
	
	function annotatePublicPrivateLabels(annotatedText) {
		
		// get plugin annotations
		var pluginAnns = [];
		for (var i = 0; i < annotatedText.getAnnotations().length; i++) {
			var ann = annotatedText.getAnnotations()[i];
			if (ann.getMetadata().plugin) pluginAnns.push(ann);
		}
		
		// annotate public and private labels
		for (var i = 0; i < pluginAnns.length; i++) {
			var ann = pluginAnns[i];
			var endIdx = (i < pluginAnns.length - 1) ? pluginAnns[i + 1].getStartIdx() : undefined;
			annotatePublicPrivateLabelsAux(annotatedText, pluginAnns[i].getMetadata().plugin, pluginAnns[i].getStartIdx() + 1, endIdx);
		}
		
		function annotatePublicPrivateLabelsAux(annotatedText, plugin, startIdx, endIdx) {
			annotateInstances(annotatedText, "public address", startIdx, endIdx, {type: "public_label"});
			var privateLabel = plugin.getPrivateLabel().toLowerCase();
			annotateInstances(annotatedText, privateLabel, startIdx, endIdx, {type: "private_label"});
		}
	}
	
	function annotatePublicPrivateValues(annotatedText) {
		
		// collect annotated values
		var annotatedValues = [];
		for (var i = 0; i < annotatedText.getAnnotations().length; i++) {
			var ann = annotatedText.getAnnotations()[i];
			if (ann.getMetadata().type === "public_label") {
				var nextValue = getNextValueAnnotation(annotatedText, ann.getEndIdx() + 1);	// TODO: look for ':' for end index
				if (!nextValue) continue;
				nextValue.getMetadata().type = "public_value";
				annotatedValues.push(nextValue);
			} else if (ann.getMetadata().type === "private_label") {
				var nextValue = getNextValueAnnotation(annotatedText, ann.getEndIdx() + 1);	// TODO: look for ':' for end index
				if (!nextValue) continue;
				nextValue.getMetadata().type = "private_value";
				annotatedValues.push(nextValue);
			}
		}
		
		// add annotations
		for (var i = 0; i < annotatedValues.length; i++) annotatedText.addAnnotation(annotatedValues[i]);
	}
	
	function getNextValueAnnotation(annotatedText, startIdx) {
		var tokenStartIdx = -1;
		var lastNonWhitespace = -1;
		var whitespaceSeen = false;
		for (var i = startIdx; i < annotatedText.getText().length; i++) {
			if (isWhitespace(annotatedText.getText()[i])) {
				whitespaceSeen = true;
				if (isNewline(annotatedText.getText()[i]) && tokenStartIdx !== -1) return new Annotation(annotatedText, tokenStartIdx, lastNonWhitespace + 1);
			} else {
				lastNonWhitespace = i;
				if (tokenStartIdx === -1 && whitespaceSeen) tokenStartIdx = i;
			}
		}
		if (tokenStartIdx !== -1) return new Annotation(annotatedText, tokenStartIdx, annotatedText.getText().length);
	}
	
	function annotatedTextToPiece(annotatedText) {
		
		// collect raw keypairs
		var keypairsRaw = [];
		for (var i = 0; i < annotatedText.getAnnotations().length; i++) {
			var ann = annotatedText.getAnnotations()[i];
			if (ann.getMetadata().plugin) {
				keypairsRaw.push({plugin: ann.getMetadata().plugin});
			} else if (ann.getMetadata().type === "public_value") {
				assertTrue(keypairsRaw.length > 0);
				var prev = keypairsRaw[keypairsRaw.length - 1];
				var value = txt.substring(ann.getStartIdx(), ann.getEndIdx());
				if (value === "Not applicable") value = null;
				if (isDefined(prev.publicValue)) assertEquals(prev.publicValue, value);
				else prev.publicValue = value;
			} else if (ann.getMetadata().type === "private_value") {
				var prev = keypairsRaw[keypairsRaw.length - 1];
				var value = txt.substring(ann.getStartIdx(), ann.getEndIdx());
				if (isDefined(prev.privateValue)) assertEquals(prev.privateValue, value);
				else prev.privateValue = value;
			}
		}
		
		// build piece
		var keypairs = [];
		for (var i = 0; i < keypairsRaw.length; i++) {
			var keypairRaw = keypairsRaw[i];
			if (!isDefined(keypairRaw.publicValue) && !isDefined(keypairRaw.privateValue)) {	// public and private can be missing iff next keypair is same plugin
				if (i === keypairsRaw.length - 1 || keypairRaw.plugin !== keypairsRaw[i + 1].plugin) throw new Error("Keypair does not have public or private value");
			} else {
				keypairs.push(new CryptoKeypair({plugin: keypairRaw.plugin, privateKey: keypairRaw.privateValue, publicAddress: keypairRaw.publicValue}));
			}
		}
		return new CryptoPiece({keypairs: keypairs});
	}
	
	/**
	 * Encapsulates annotated text.
	 */
	function AnnotatedText(text) {
		assertString(text);
		
		var annotations = [];
		var sorted = true;
		
		this.getText = function() {
			return text;
		}
		
		/**
		 * Returns annotations in sorted order.
		 */
		this.getAnnotations = function() {
			if (!sorted) {
				annotations.sort(function(ann1, ann2) {
					if (ann1.getStartIdx() < ann2.getStartIdx()) return -1;
					if (ann1.getStartIdx() > ann2.getStartIdx()) return 1;
					return ann1.getEndIdx() - ann2.getEndIdx();
				});
				sorted = true;
			}
			return annotations;
		}
		
		this.addAnnotation = function(annotation) {
			assertTrue(annotation.getStartIdx() < text.length);
			assertTrue(annotation.getEndIdx() <= text.length);
			annotations.push(annotation);
			sorted = false;
		}
		
		this.removeAnnotation = function(annotation) {
			var found = annotations.removeVal(annotation);
			assertTrue(found, "Annotation was not found: " + annotation.toString());
		}
		
		this.removeSubsumedAnnotations = function() {
			var toRemoves = [];
			for (var i = 0; i < annotations.length; i++) {
				var ann = annotations[i];
				if (ann.getSubsumingAnnotations().length > 0) toRemoves.push(ann);
			}
			for (var i = 0; i < toRemoves.length; i++) toRemoves[i].remove();
		}
	}
	
	/**
	 * Encapsulates an annotation on annotated text.
	 * 
	 * @param annotatedText is the annotated text object to annotate
	 * @param startIdx is the start index of the annotation
	 * @param endIdx is the end index of the annotation
	 * @param metadata is metadata to set for the annotation (optional)
	 */
	function Annotation(annotatedText, startIdx, endIdx, metadata) {
		assertNumber(startIdx);
		assertTrue(startIdx >= 0);
		assertNumber(endIdx);
		assertTrue(endIdx >= 0);
		assertTrue(endIdx >= startIdx);
		
		// instance variables
		var that = this;
		metadata = Object.assign({}, metadata);
		
		this.getCoveredText = function() {
			return annotatedText.getText().substring(startIdx, endIdx);
		}
		
		this.getAnnotatedText = function() {
			return annotatedText;
		}
		
		this.getStartIdx = function() {
			return startIdx;
		}
		
		this.getEndIdx = function() {
			return endIdx;
		}
		
		this.getMetadata = function() {
			return metadata;
		}
		
		this.sameSpan = function(ann) {
			throw new Error("Not implemented");
		}
		
		this.overlaps = function(ann) {
			throw new Error("Not implemented");
		}
		
		this.subsumes = function(ann) {
			return that.getStartIdx() <= ann.getStartIdx() && that.getEndIdx() > ann.getEndIdx() ||
						 that.getStartIdx() < ann.getStartIdx() && that.getEndIdx() >= ann.getEndIdx();
		}
		
		this.subsumedBy = function(ann) {
			return ann.subsumes(that);
		}
		
		this.getSubsumingAnnotations = function() {
			var anns = [];
			for (var i = 0; i < annotatedText.getAnnotations().length; i++) {
				var ann = annotatedText.getAnnotations()[i];
				if (ann === that) continue;
				if (ann.subsumes(that)) anns.push(ann);
			}
			return anns;
		}
		
		this.remove = function() {
			annotatedText.removeAnnotation(that);
		}
		
		this.toString = function() {
			return annotatedText.getText().substring(startIdx, endIdx) + " [" + startIdx + ", " + endIdx + "]";
		}
	}
}