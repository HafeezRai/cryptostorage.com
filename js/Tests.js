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
 * Encapsulates application tests.
 * 
 * File import tests can only be run on browsers which support the File constructor.
 */
function Tests() {
	
	var PASSPHRASE = "MySuperSecretPassphraseAbcTesting123";
	var REPEAT_KEYS = 1;             // number of keys to test per plugin without encryption throughout tests
	var REPEAT_KEYS_ENCRYPTION = 1;  // number of keys to test per plugin with encryption throughout tests
	var TEST_MAX_PARTS = true;			 // computationally intensive
	var NUM_PARTS = 5;
	var MIN_PARTS = 3;
	
	// list of invalid private keys to test per plugin
	var INVALID_PKS = [" ", "ab", "abctesting123", "abc testing 123", 12345, "U2FsdGVkX1+41CvHWzRBzaBdh5Iz/Qu42bV4t0Q5WMeuvkiI7bzns76l6gJgquKcH2GqHjHpfh7TaYmJwYgr3QYzNtNA/vRrszD/lkqR2+uRVABUnfVziAW1JgdccHE", "U2FsdGVkX19kbqSAg6GjhHE+DEgGjx2mY4Sb7K/op0NHAxxHZM34E6eKEBviUp1U9OC6MdG fEOfc9zkAfMTCAvRwoZu36h5tpHl7TKdQvOg3BanArtii8s4UbvXxeGgy", "3b20836520fe2e8eef1fd3f898fd97b5a3bcb6702fae72e3ca1ba8fb6e1ddd75b12f74dc6422606d1750e40"];
	
	/**
	 * Runs minimum tests to verify key generation and dividing.
	 * 
	 * @param onDone(err) is invoked when done
	 */
	this.runMinimumTests = function(onDone) {
		
		// build key generation configuration
		var config = {};
		config.numParts = 5;
		config.minParts = 3;
		config.keypairs = [];
		config.keypairs.push({
			ticker: AppUtils.getCryptoPlugin("BTC").getTicker(),
			numKeypairs: 1,
		});
		config.keypairs.push({
			ticker: AppUtils.getCryptoPlugin("XMR").getTicker(),
			numKeypairs: 1,
		});
		config.keypairs.push({
			ticker: AppUtils.getCryptoPlugin("ETH").getTicker(),
			numKeypairs: 1,
		});
		
		// generate pieces and test
		var pieceGenerator = new PieceGenerator(config);
		pieceGenerator.generatePieces(null, function(err, pieces, pieceRenderers) {
			if (err) onDone(err);
			else {
				try {
					assertEquals(3, pieces.length);
					assertEquals(3, pieces[0].getKeypairs().length);
					assertUndefined(pieceRenderers);
				} catch (err) {
					onDone(err);
				}
				onDone(null);
			}
		});
	},

	/**
	 * Runs the test suite.
	 * 
	 * @param onDone(err) is invoked when done
	 */
	this.runTestSuite = function(onDone) {
		var plugins = getTestPlugins();
		
		// collect test functions
		var funcs = [];
		funcs.push(function(onDone) { testUtils(); onDone(); });
		funcs.push(function(onDone) { testPlugins(plugins, onDone); });
		funcs.push(function(onDone) { testPieceAllPlugins(plugins); onDone(); });
		funcs.push(function(onDone) { testBackwardsCompatibility(onDone); });
		funcs.push(function(onDone) { testFileImport(plugins, onDone); });
		funcs.push(function(onDone) { testTextImport(AppUtils.getCryptoPlugins(), onDone); });
		funcs.push(function(onDone) { testGeneratePieces(plugins, onDone); });
		funcs.push(function(onDone) { testDestroyPieceGenerator(plugins, onDone); });
		funcs.push(function(onDone) { testPluginsEncryption(plugins, onDone); });
		
		// execute in series
		async.series(funcs, function(err) {
			if (err) throw err;
			if (onDone) onDone();
		});
	}
	
	// --------------------------------- PRIVATE --------------------------------
	
	function getTestPlugins() {
		return AppUtils.getCryptoPlugins();
//		var plugins = [];
//		plugins.push(AppUtils.getCryptoPlugin("BCH"));
//		plugins.push(AppUtils.getCryptoPlugin("ETC"));
//		plugins.push(AppUtils.getCryptoPlugin("XMR"));
//		plugins.push(AppUtils.getCryptoPlugin("BTC"));
//		plugins.push(AppUtils.getCryptoPlugin("LTC"));
//		plugins.push(AppUtils.getCryptoPlugin("DOGE"));
//		plugins.push(AppUtils.getCryptoPlugin("NEO"));
//		plugins.push(AppUtils.getCryptoPlugin("DASH"));
//		plugins.push(AppUtils.getCryptoPlugin("XZC"));
//		plugins.push(AppUtils.getCryptoPlugin("ZEC"));
//		plugins.push(AppUtils.getCryptoPlugin("WAVES"));
//		plugins.push(AppUtils.getCryptoPlugin("XLM"));
//		plugins.push(AppUtils.getCryptoPlugin("XRP"));
//		plugins.push(AppUtils.getCryptoPlugin("ETC"));
//		plugins.push(AppUtils.getCryptoPlugin("OMG"));
//		plugins.push(AppUtils.getCryptoPlugin("BAT"));
//		plugins.push(AppUtils.getCryptoPlugin("BIP39"));
//		plugins.push(AppUtils.getCryptoPlugin("UBIQ"));
//		return plugins;
	}
	
	function testUtils() {
		console.log("Testing utils");
		assertTrue(isString("abctesting123"));
		assertFalse(isString(null));
		assertFalse(isString(undefined));
		assertFalse(isString(123));
		
		// test valid versions
		var validVersions = [[0, 0, 1], [12, 23, 4], [16, 1, 5]];
		for (var i = 0; i < validVersions.length; i++) {
			var versionNumbers = AppUtils.getVersionNumbers(validVersions[i][0] + "." + validVersions[i][1] + "." + validVersions[i][2]);
			for (var j = 0; j < validVersions[0].length; j++) {
				assertEquals(validVersions[i][j], versionNumbers[j], "Unexpected version number at [" + i + "][" + j + "]: " + validVersions[i][j] + " vs " + versionNumbers[j]);
			}
		}
		
		// test invalid versions
		var invalidVersions = ["3.0.1.0", "3.0.-1", "3.0", "4", "asdf", "4.f.2", "0.0.0"];
		for (var i = 0; i < invalidVersions.length; i++) {
			try {
				AppUtils.getVersionNumbers(invalidVersions[i]);
				throw new Error("fail");
			} catch (err) {
				if (err.message === "fail") throw new Error("Should have thrown exception on version string: " + invalidVersions[i]);
			}
		}
		
		// test base encoding
		assertFalse(isHex(false));
		assertFalse(isHex(true));
		assertFalse(isHex("hello there"));
		assertTrue(isBase58("abcd"))
		assertFalse(isBase58("abcd0"))
		assertTrue(isHex("fcc256cbc5a180831956fba7b9b7de5f521037c39980921ebe6dbd822f791007"));
		var keypair = new CryptoKeypair({plugin: getTestPlugins()[0]});
    testBaseConversion("070115462b1f10cd83733218cd5f720ae66891aa2d1cad4eb9", 16);
    testBaseConversion(keypair.getPrivateHex(), 16);
		testBaseConversion("0142e0bd5032652e3d01248cede2afe96a0f372cd85a3005de5d308a45cce598c797d22b3082789ba5d1ab", 16);
		function testBaseConversion(str, base) {
			assertNumber(base);
			
			// test to/from all base combinations
			var bases = [16, 58, 64];
			var combinations = getCombinations(bases, 2);
			for (var i = 0; i < combinations.length; i++) {
				var srcStr = base === combinations[i][0] ? str : AppUtils.toBase(base, combinations[i][0], str);
				testToFrom(combinations[i][0], combinations[i][1], srcStr);
			}
			
			function testToFrom(srcBase, tgtBase, srcStr) {
        if (srcBase === 16) srcStr = srcStr.toUpperCase();
				var tgtStr = AppUtils.toBase(srcBase, tgtBase, srcStr);
				var endStr = AppUtils.toBase(tgtBase, srcBase, tgtStr);
				assertEquals(endStr, srcStr, "Conversion from base " + srcBase + " to " + tgtBase + " started with " + srcStr + " ended with " + endStr);
			}
		}
	}
	
	function testPlugins(plugins, onDone) {
		console.log("Testing plugins");
		var testFuncs = [];
		for (var i = 0; i < plugins.length; i++) testFuncs.push(getTestFunc(plugins[i]));
		function getTestFunc(plugin) {
			return function(onDone) {
				testPlugin(plugin, onDone);
			}
		}
		async.series(testFuncs, onDone);
	}
	
	function testPlugin(plugin, onDone) {
		assertInitialized(plugin.getName());
		assertInitialized(plugin.getTicker());
		assertInitialized(plugin.getLogo());
		
		// test invalid addresses
		assertFalse(plugin.isAddress("invalidAddress123"));
		assertFalse(plugin.isAddress(undefined));
		plugin.isPublicApplicable() ? assertFalse(plugin.isAddress(null)) : assertTrue(plugin.isAddress(null));
		assertFalse(plugin.isAddress([]));
		
		// test invalid private keys
    var invalids = copyArray(INVALID_PKS);
    for (var i = 0; i < REPEAT_KEYS; i++) {
      invalids.push(new CryptoKeypair({plugin: plugin}).getPublicAddress());  // test public address is not recognized
    }
    for (var i = 0; i < invalids.length; i++) {
      var invalid = invalids[i];
      if (isString(invalid)) {
        assertNull(plugin.decode(invalid)); 
      } else {
        try {
          plugin.decode(invalid);
          fail("fail");
        } catch (err) {
          if (err.message === "fail") throw new Error(plugin.getTicker() + " should throw exception if decoding non-string");
        }
      }
      var keypair;
      try {
        keypair = new CryptoKeypair({plugin: plugin, privateKey: invalid});
        fail("fail");
      } catch (err) {
        if (err.message === "fail") {
          console.log(keypair._state);
          throw new Error("Should not create " + plugin.getTicker() + " keypair from invalid private key: " + invalid);
        }
      }
    }
		
		// bitcoin specific tests
		if (plugin.getTicker() === "BTC") {
			
			// verify shamirs initialized with 7 bits
			var keypair = new CryptoKeypair({plugin: plugin});
			var parts = secrets.share(keypair.getPrivateHex(), NUM_PARTS, MIN_PARTS);
			for (var j = 0; j < parts.length; j++)  {
				var b58 = AppUtils.toBase(16, 58, parts[j]);
				assertTrue(b58.startsWith("3X") || b58.startsWith("3Y"));
			}
			
			// import uncompressed keypair from bitaddress.org
			keypair = new CryptoKeypair({plugin: plugin, privateKey: "5HyajPXtXY46WEQheAtqL6VmQPW22iKuzUZdAfycQqFtxQPran2"});
	    assertEquals("1CUyCk8GjFzzYE9ctaZ1PuHNEyZi8zKApX", keypair.getPublicAddress());
			assertEquals("Kwvjt6TLRn4fJ2BcP4fnKHFxzEK5YZQUtgezdh2sJBzkKDCVJfXo", keypair.getPrivateWif());
			var piece = new CryptoPiece({keypairs: keypair});
			testPieceEncryption(piece, [AppUtils.EncryptionScheme.BIP38], function(err, encryptedPiece) {
			  assertNull(err);
			  assertEquals("1CUyCk8GjFzzYE9ctaZ1PuHNEyZi8zKApX", encryptedPiece.getKeypairs()[0].getPublicAddress());
        assertEquals("6PYLFYzzG9NAz2s8y4KutrdDh18iwmAJmSR4uoUirSAvUsgMFXBz4kEFPK", encryptedPiece.getKeypairs()[0].getPrivateWif());
        
        // import uncompressed bip38 from bitaddress.org
        keypair = new CryptoKeypair({plugin: plugin, privateKey: "6PnRUF3GnHeNpiN6dbsempHokmkpJmM2AvGZvKuchWCCwWS8LF6pevcxPD"});
        assertEquals("6PnRUF3GnHeNpiN6dbsempHokmkpJmM2AvGZvKuchWCCwWS8LF6pevcxPD", keypair.getPrivateWif());
        assertEquals(AppUtils.EncryptionScheme.BIP38, keypair.getEncryptionScheme());
        keypair.decrypt(PASSPHRASE, null, function(err, decryptedKeypair) {
          assertEquals("1MRwFRLXHn53z2mWCDJDWtkScnAUsGPRaK", keypair.getPublicAddress());
          assertEquals("L4SmSt2n58xNuu45CwJgFu9eN9uo9osqcsEgwp95CSJ2Bq4t8b3Y", keypair.getPrivateWif());
          onDone();
        });
			});
		}
		
		// litecoin specific tests
		else if (plugin.getTicker() === "LTC") {
		  
		  // test that hexidecimal format is padded (this private key converts to 62 character hex if not padded)
		  var keypair = new CryptoKeypair({plugin: plugin, privateKey: "T34MuTEaRxt3kj6dn2MMHbvSPQHrsBjKrdz6WtwrLe1KzCzYkMup"});
		  assertEquals("T34MuTEaRxt3kj6dn2MMHbvSPQHrsBjKrdz6WtwrLe1KzCzYkMup", keypair.getPrivateWif());
		  assertEquals("003294FBF83EE27CB46ECBC6D86DC5E1B254AF2B9058597278A957E99154A065", keypair.getPrivateHex());
		  assertEquals("LgCNyq7GfXBLgUbxRq7w6qFfkomJoYxZKP", keypair.getPublicAddress());
      var piece = new CryptoPiece({keypairs: keypair});
		  testPieceEncryption(piece, [AppUtils.EncryptionScheme.V1_CRYPTOJS], function(err, encryptedPiece) {
        assertNull(err);
        onDone();
      });
		}
		
		// otherwise done
		else onDone();
	}
	
	function testPieceAllPlugins(plugins) {
		console.log("Testing piece with all plugins");
		
		// create and test keypairs
		var keypairs = [];
		for (var i = 0; i < plugins.length; i++) {
			var plugin = plugins[i];
			for (var j = 0; j < REPEAT_KEYS; j++) {
				var keypair = new CryptoKeypair({plugin: plugin});
				assertInitialized(keypair.getPrivateHex());
				assertInitialized(keypair.getPrivateWif());
				assertFalse(keypair.isEncrypted());
				assertNull(keypair.getEncryptionScheme());
				assertFalse(keypair.isDivided());
				assertNull(keypair.getMinParts());
				assertTrue(plugin.isAddress(keypair.getPublicAddress()));
				var copy = new CryptoKeypair({plugin: plugin, privateKey: keypair.getPrivateHex()});
				assertTrue(keypair.equals(copy));
				copy = new CryptoKeypair({plugin: plugin, privateKey: keypair.getPrivateWif()});
				assertTrue(keypair.equals(copy));
				keypairs.push(keypair);
			}
		}
		
		// create and test piece
		var piece = new CryptoPiece({keypairs: keypairs});
		testPieceWithoutEncryption(piece);
	}
	
	function testPluginsEncryption(plugins, onDone) {
		
		// skip if intensive operations disabled
		if (REPEAT_KEYS_ENCRYPTION === 0) {
			onDone();
			return;
		}
		
		// collect test functions
		var testFuncs = [];
		for (var i = 0; i < plugins.length; i++) {
			testFuncs.push(testFunc(plugins[i]));
		}
		function testFunc(plugin) {
			return function(onDone) {
				testPluginEncryption(plugin, onDone);
			}
		}
		
		// execute test functions
		async.series(testFuncs, function(err) {
			if (err) throw err;
			onDone();
		});
		
		function testPluginEncryption(plugin, onDone) {
			console.log("Testing " + plugin.getTicker() + " encryption and dividing");
			
			// collect keypair per encryption scheme
			var keypairs = [];
			var schemes = [];
			for (var i = 0; i < plugin.getEncryptionSchemes().length; i++) {
				for (var j = 0; j < REPEAT_KEYS_ENCRYPTION; j++) {
					keypairs.push(new CryptoKeypair({plugin: plugin}));
					schemes.push(plugin.getEncryptionSchemes()[i]);
				}
			}
			
			// test piece created from keypairs
	    var piece = new CryptoPiece({keypairs: keypairs});
	    testPieceEncryption(piece, schemes, onDone);
		}
	}
	
	/**
	 * Tests piece division, encryption, decryption, initialization, and conversion.
	 * 
	 * @param piece is the piece to test
	 * @param schemes are the encryption schemes for each keypair to test
	 * @param onDone(err, encryptedPiece) is invoked when done
	 */
	function testPieceEncryption(piece, schemes, onDone) {
	  
	  // preserve original
    var original = piece.copy();
    
    // test piece
    assertFalse(piece.isEncrypted());
    assertFalse(piece.isDivided());
    testPieceWithoutEncryption(piece);
    testDestroyPiece(piece, function() {
      
      // encrypt piece
      var progressStarted = false;
      var progressComplete = false;
      var lastPercent = 0;
      piece.encrypt(PASSPHRASE, schemes, function(percent, label) {
        if (percent === 0) progressStarted = true;
        if (percent === 1) progressComplete = true;
        assertEquals("Encrypting keypairs", label);
        assertTrue(percent >= lastPercent);
        lastPercent = percent;
        
        // cannot encrypt encrypting piece
        try {
          piece.encrypt(PASSPHRASE, schemes);
          fail("fail");
        } catch (err) {
          if (err.message === "fail") throw new Error("Consecutive encryption should fail");
          assertEquals("Piece is in the process of encrypting", err.message);
        }
      }, function(err, encryptedPiece) {
        if (err) throw err;
        var encryptedPieceCopy = encryptedPiece.copy();
        
        // test state
        assertTrue(piece === encryptedPiece);
        assertTrue(progressStarted, "Progress was not started");
        assertTrue(progressComplete, "Progress was not completed");
        assertTrue(piece.isEncrypted());
        assertFalse(piece.isDivided());
        assertNull(piece.getPartNum());
        testPieceWithoutEncryption(encryptedPiece);
        testDestroyPiece(encryptedPiece, function() {
          
          // cannot encrypt encrypted piece
          try {
            piece.encrypt(PASSPHRASE, schemes, function(percent, label) {}, function(err, encryptedPiece) { fail("fail"); });
            fail("fail");
          } catch (err) {
            if (err.message === "fail") throw new Error("Cannot encrypt encrypted piece");
          }
          
          // decrypt with wrong password
          piece.decrypt("wrongPassphrase123", null, function(err, decryptedPiece) {
            assertInitialized(err);
            assertEquals("Incorrect passphrase", err.message);
            assertUndefined(decryptedPiece);
            assertInitialized(piece.isEncrypted());
                        
            // decrypt piece
            progressStarted = false;
            progressCompleted = false;
            piece.decrypt(PASSPHRASE, function(percent, label) {
              if (percent === 0) progressStarted = true;
              if (percent === 1) progressComplete = true;
              assertEquals("Decrypting", label);
              
              // cannot decrypt decrypting piece
              try {
                piece.decrypt(PASSPHRASE);
                fail("fail");
              } catch (err) {
                if (err.message === "fail") throw new Error("Consecutive decryption should fail");
                assertEquals("Piece is in the process of decrypting", err.message);
              }
            }, function(err, decryptedPiece) {
              if (err) throw err;
              
              // test state
              assertTrue(progressStarted, "Progress was not started");
              assertTrue(progressComplete, "Progress was not completed");
              assertTrue(piece.equals(original));
              assertFalse(piece.isEncrypted());
              assertFalse(piece.isDivided());
              assertNull(piece.getPartNum());
              
              // done testing
              onDone(null, encryptedPieceCopy);
            });
          });
        });
      });
    });
	}
	
	// tests piece dividing, initialization, and conversion
	function testPieceWithoutEncryption(piece) {
		assertObject(piece, CryptoPiece);
    testPieceState(piece);
		if (piece.isDivided() === false) testPieceDivide(piece);
		testPieceInit(piece);
		testPieceRemoval(piece);
		testNotApplicableAddressExports(piece);
	}
	
	function testPieceDivide(undividedPiece) {
		assertObject(undividedPiece, CryptoPiece);
		assertFalse(undividedPiece.isDivided());
				
		// copy original for later testing
		var original = undividedPiece.copy();
		assertTrue(original.equals(undividedPiece));
		
		// divide piece
		var dividedPieces = undividedPiece.divide(NUM_PARTS, MIN_PARTS);
		assertEquals(dividedPieces.length, NUM_PARTS);
		for (var i = 0; i < dividedPieces.length; i++) {
			
			// test divided piece state
			testPieceState(dividedPieces[i]);
			assertTrue(dividedPieces[i].isDivided());
			assertEquals(i + 1, dividedPieces[i].getPartNum());
			assertEquals(undividedPiece.getKeypairs().length, dividedPieces[i].getKeypairs().length);
			
			// test that public addresses are equal
			for (var j = 0; j < undividedPiece.getKeypairs().length; j++) {
				assertEquals(undividedPiece.getKeypairs()[j].getPublicAddress(), dividedPieces[i].getKeypairs()[j].getPublicAddress());
			}
		}
		
		// cannot encrypt divided pieces
		try {
			dividedPieces[0].encrypt(PASSPHRASE, [], function(percent, label) {}, function(err, encryptedPiece) { fail("fail"); });
			fail("fail");
		} catch (err) {
			if (err.message === "fail") throw new Error("Cannot encrypt divided undivided piece");
		}
		
		// cannot divide divided piece
		try {
			var temps = dividedPieces[0].divide(NUM_PARTS, MIN_PARTS);
			fail("fail");
		} catch (err) {
			if (err.message === "fail") throw new Error("Cannot divide divided piece");
		}
		
		// test combining insufficient parts
		for (var combinationSize = 1; combinationSize < MIN_PARTS; combinationSize++) {
			var combinations = getCombinations(dividedPieces, combinationSize);
			for (var i = 0; i < combinations.length; i++) {
				var combination = combinations[i];
				try {
					var combined = new CryptoPiece({dividedPieces: combination});
					fail("fail");
				} catch (err) {
					if (err.message === "fail") throw new Error("Should not be able to create piece with insufficient parts");
				}
			}
		}
				
		// test combining duplicate parts
		var invalidCombination = [];
		for (var i = 0; i < MIN_PARTS; i++) invalidCombination.push(dividedPieces[0]);
		try {
			new CryptoPiece({dividedPieces: invalidCombination});
			throw new Error("fail");
		} catch (err) {
			if (err.message === "fail") throw new Error("Cannot create piece from duplicate parts");
		}
		
		// test each piece combination
		var combinations = getCombinations(dividedPieces, MIN_PARTS);
		for (var i = 0; i < combinations.length; i++) {
			var combination = combinations[i];
			var combined = new CryptoPiece({dividedPieces: combination});
			if (!original.hasPublicAddresses()) combined.removePublicAddresses();
			assertTrue(original.equals(combined));
		}
				
		// combine all pieces
		var combined = new CryptoPiece({dividedPieces: dividedPieces});
		if (!original.hasPublicAddresses()) {
		  combined.removePublicAddresses();
		  assertFalse(combined.hasPublicAddresses());
		} else {
		  assertTrue(combined.hasPublicAddresses());
		}
		assertTrue(original.equals(combined));

		// test divided with more than max parts
		try {
			combined.divide(AppUtils.MAX_PARTS + 1, AppUtils.MAX_PARTS - 10);
			fail("fail");
		} catch (err) {
			if (err.message === "fail") throw new Error("Cannot divide piece with more than MAX_PARTS");
			assertEquals("Cannot divide into more than " + AppUtils.MAX_PARTS + " parts", err.message);
		}
		
		// test divide with max parts
		if (TEST_MAX_PARTS) {
			dividedPieces = combined.divide(AppUtils.MAX_PARTS, AppUtils.MAX_PARTS - 10);
			var combined = new CryptoPiece({dividedPieces: dividedPieces});
			if (!original.hasPublicAddresses()) combined.removePublicAddresses();
			assertTrue(original.equals(combined));
		}
	}
	
	function testPieceState(piece) {
		for (var i = 0; i < piece.getKeypairs().length; i++) {
			testKeypairState(piece.getKeypairs()[i]);
		}
	}
	
	function testKeypairState(keypair) {
		assertInitialized(keypair.getPlugin());
		
		// test public address
		if (!keypair.isPublicApplicable()) assertNull(keypair.getPublicAddress());
    else if (keypair.hasPublicAddress()) assertInitialized(keypair.getPublicAddress());
    else assertUndefined(keypair.getPublicAddress());
		
		// test divided keypair
		if (keypair.isDivided()) {
			assertInitialized(keypair.getPrivateHex());
      assertTrue(isUpperCase(keypair.getPrivateHex()), "Hex is not uppercase: " + keypair.getPrivateHex());
			assertInitialized(keypair.getPrivateWif());
			assertEquals(undefined, keypair.isEncrypted());
			assertEquals(undefined, keypair.getEncryptionScheme());
			if (isNumber(keypair.getMinParts())) {
				assertTrue(keypair.getMinParts() >= 2);
				assertTrue(keypair.getMinParts() <= AppUtils.MAX_PARTS);
			} else {
				assertUndefined(keypair.getMinParts());
			}
		}
		
		// test encrypted keypair
		else if (keypair.isEncrypted()) {
		  assertInitialized(keypair.getPrivateHex());
		  assertTrue(isUpperCase(keypair.getPrivateHex()), "Hex is not uppercase: " + keypair.getPrivateHex());
      assertInitialized(keypair.getPrivateWif());
			assertFalse(keypair.isDivided());
			assertNull(keypair.getMinParts());
			assertNull(keypair.getPartNum());
		}
		
		// test unencrypted keypair
		else if (keypair.isEncrypted() === false) {
			assertInitialized(keypair.getPrivateHex());
      assertTrue(isUpperCase(keypair.getPrivateHex()), "Hex is not uppercase: " + keypair.getPrivateHex());
			assertInitialized(keypair.getPrivateWif());
			assertFalse(keypair.isEncrypted());
			assertNull(keypair.getEncryptionScheme());
			assertFalse(keypair.isDivided());
			assertNull(keypair.getMinParts());
		}
		
		// test keypair without private keys
		else if (!keypair.hasPrivateKey()) {
			assertUndefined(keypair.getPrivateHex());
			assertUndefined(keypair.getPrivateWif());
			assertUndefined(keypair.isEncrypted());
			assertUndefined(keypair.getEncryptionScheme());
			assertUndefined(keypair.isDivided());
			assertUndefined(keypair.getMinParts());
		}
		
		// invalid state
		else {
			console.log(keypair.toJson());
			throw new Error("Keypair has invalid state");
		}
	}
	
	function testPieceInit(piece) {
		assertObject(piece, CryptoPiece);
		
		// test init from keypairs
		var piece2 = new CryptoPiece({keypairs: piece.getKeypairs()});
		assertTrue(piece.equals(piece2));
		
		// test init from piece
		piece2 = new CryptoPiece({piece: piece});
		assertTrue(piece.equals(piece2));
		for (var i = 0; i < piece.getKeypairs().length; i++) {
			assertFalse(piece.getKeypairs()[i] === piece2.getKeypairs()[i]);
		}
		
		// test init from divided pieces
		if (piece.isDivided() === false) {
			var dividedPieces = piece.divide(NUM_PARTS, MIN_PARTS);
			
			// test ability to assign part num one time if not previously assigned
			var dividedKeypair = new CryptoKeypair({plugin: dividedPieces[0].getKeypairs()[0].getPlugin(), privateKey: dividedPieces[0].getKeypairs()[0].getPrivateWif()});
			var dividedPiece = new CryptoPiece({keypairs: [dividedKeypair]});
			assertUndefined(dividedPiece.getPartNum());
			dividedPiece.setPartNum(5);
			assertEquals(5, dividedPiece.getPartNum());
			var canSetEqual = false;
			try {
				dividedPiece.setPartNum(5);
				canSetEqual = true;
				dividedPiece.setPartNum(6);
				fail("fail");
			} catch (err) {
				if (err.message === "fail") throw new Error("Should not be able to override previously set part num");
				assertTrue(canSetEqual);
			}
			
			// test init from divided pieces
			for (var i = 0; i < dividedPieces.length; i++) {
				assertEquals(i + 1, dividedPieces[i].getPartNum());
				var dividedPiece = new CryptoPiece({piece: dividedPieces[i]});
				assertEquals(i + 1, dividedPiece.getPartNum());
				testPieceInit(dividedPieces[i]);
			}
			piece2 = new CryptoPiece({dividedPieces: dividedPieces});
			if (!piece.hasPublicAddresses()) piece2.removePublicAddresses();
			assertTrue(piece.equals(piece2));
			
			/**
			 * Tests init with parts with different minimum thresholds.
			 * 
			 * This test is commented out because parts from different keys can appear
			 * valid, so this test is invalid without knowing part threshold which was
			 * removed by default in v0.3.0.
			 */
//			var dividedPieces1 = piece.divide(3, 2);
//			var dividedPieces2 = piece.divide(5, 3);
//			try {
//				new CryptoPiece({dividedPieces: [dividedPieces1[0], dividedPieces2[0]]});
//				fail("fail");
//			} catch (err) {
//				if (err.message === "fail") throw new Error("Cannot initialize piece from incompatible parts");
//			}
		}
		
		// test init with invalid partNum
		try {
			new CryptoPiece({keypairs: keypairs, partNum: 2});
			throw new Error("fail");
		} catch (err) {
			if (err.message === "fail") throw new Error("Should not be able to set partNum on unencrypted keys");
		}
		
		// test init with invalid public address
		try {
			new CryptoPiece({plugin: piece.getKeypairs()[0].getPlugin(), privateKey: piece.getKeypairs[0].getPrivateWif(), publicAddress: "invalid123"});
			throw new Error("fail");
		} catch (err) {
			if (err.message === "fail") throw new Error("Should not be able create piece with invalid address");
		}
		
		// test init from json
		piece2 = new CryptoPiece({json: piece.toJson()});
		if (!piece.hasPublicAddresses()) piece2.removePublicAddresses();
		assertTrue(piece.equals(piece2));
		
		// test init from json string
		piece2 = new CryptoPiece({json: piece.toString(AppUtils.FileType.JSON)});
		if (!piece.hasPublicAddresses()) piece2.removePublicAddresses();
		assertTrue(piece.equals(piece2));
		
		// test init from csv
		piece2 = new CryptoPiece({csv: piece.toCsv()});
		if (!piece.hasPublicAddresses()) piece2.removePublicAddresses();
		assertTrue(piece.equals(piece2));
		
		// test init from txt
		assertString(piece.toTxt());
		piece2 = new CryptoPiece({txt: piece.toTxt()});
		if (!piece.hasPublicAddresses()) piece2.removePublicAddresses();
		if (piece.getPartNum()) piece2.setPartNum(piece.getPartNum());
		assertTrue(piece.equals(piece2));
	}
	
	function testPieceRemoval(piece) {
		assertObject(piece, CryptoPiece);
		
		// determine if public addresses apply to any keypairs
		var anyPublicsApply = false;
		for (var i = 0; i < piece.getKeypairs().length; i++) {
			if (piece.getKeypairs()[i].isPublicApplicable()) {
				anyPublicsApply = true;
				break;
			}
		}
		
		// don't test removal if public or private missing
		if (!piece.hasPrivateKeys()) return;
		if (!piece.hasPublicAddresses() && anyPublicsApply) return;
		
		// test remove public addresses
		var modified = piece.copy();
		modified.removePublicAddresses();
		for (var i = 0; i < modified.getKeypairs().length; i++) {
			var keypair = modified.getKeypairs()[i];
			if (keypair.isPublicApplicable()) assertUndefined(keypair.getPublicAddress());
			else assertNull(keypair.getPublicAddress());
			assertTrue(keypair.hasPrivateKey());
			testKeypairState(keypair);
			if (piece.getPartNum()) assertEquals(piece.getPartNum(), modified.getPartNum());
		}
		if (anyPublicsApply) testPieceWithoutEncryption(modified);
		
		// test remove private keys
		modified = piece.copy();
		modified.removePrivateKeys();
		for (var i = 0; i < modified.getKeypairs().length; i++) {
			var keypair = modified.getKeypairs()[i];
			keypair.isPublicApplicable() ? assertDefined(keypair.getPublicAddress()) : assertNull(keypair.getPublicAddress());
			assertFalse(keypair.hasPrivateKey());
			assertUndefined(keypair.isEncrypted());
			assertUndefined(keypair.getMinParts());
			assertUndefined(keypair.getPartNum());
			testKeypairState(keypair);
		}
		if (anyPublicsApply) testPieceWithoutEncryption(modified);
	}
	 
  function testNotApplicableAddressExports(piece) {
    
    // ensure piece contains keypair whose address is not applicable
    var naIdx = -1;
    for (var i = 0; i < piece.getKeypairs().length; i++) {
      if (!piece.getKeypairs()[i].isPublicApplicable()) {
        naIdx = i;
        break;
      }
    }
    if (naIdx < 0) return;
    
    // test json
    var json = piece.toJson();
    assertEquals(undefined, json.keypairs[naIdx].publicAddress);
    
    // test csv
    var csv = piece.toCsv();
    if (piece.hasPublicAddresses()) {
      assertTrue(csv.indexOf("Not applicable") >= 0);
    } else {
      assertFalse(csv.indexOf("Not applicable") >= 0);
    }
    
    // test txt
    var txt = piece.toTxt();
    if (piece.hasPublicAddresses()) {
      assertTrue(txt.indexOf("Not applicable") >= 0);
    } else {
      assertFalse(txt.indexOf("Not applicable") >= 0);
    }
  }
	
	function testGeneratePieces(plugins, onDone) {
		console.log("Testing generate pieces from config");
		
		// simple config
		var config = {};
		config.keypairs = [];
		for (var i = 0; i < plugins.length; i++) {
			config.keypairs.push({
				ticker: plugins[i].getTicker(),
				numKeypairs: REPEAT_KEYS
			});
		}
		config.pieceRendererClass = StandardPieceRenderer;
		testGenerateConfig(config, function(err) {
			if (err) {
				onDone(err);
				return;
			}
			
			// config with encryption and divided
			config.passphrase = PASSPHRASE;
			for (var i = 0; i < config.keypairs.length; i++) {
				config.keypairs[i].encryption = AppUtils.EncryptionScheme.V0_CRYPTOJS;
			}
			config.numParts = NUM_PARTS;
			config.minParts = MIN_PARTS;
			testGenerateConfig(config, function(err) {
				if (err) {
					onDone(err);
					return;
				}
				onDone();
			});
		});
		
		function testGenerateConfig(config, onDone) {
			
			// generate pieces
			var progressStart = false;
			var progressMiddle = false;
			var progressEnd = false;
			var lastPercent = 0;
			var generator = new PieceGenerator(config);
			generator.generatePieces(function(percent, label) {
				if (percent === 0) progressStart = true;
				else if (percent === 1) progressEnd = true;
				else if (percent > 0 && percent < 1) progressMiddle = true;
				else throw new Error("Invalid progress percent: " + percent);
				
				// assert percent increases
				assertTrue(percent >= lastPercent, "Percent " + percent + " is less than last percent " + lastPercent);
				lastPercent = percent;
				
				// test label
				assertString(label);
				switch (label) {
					case "Generating keypairs":
					case "Encrypting keypairs":
					case "Rendering keypairs":
						break;
					default: throw new Error("Unrecognized progress label: " + label);
				}
			}, function (err, pieces, pieceRenderers) {
				assertNull(err);
				assertTrue(progressStart);
				assertTrue(progressMiddle);
				assertTrue(progressEnd);
				assertEquals(pieces.length, pieceRenderers.length);
				if (config.numParts) assertEquals(config.numParts, pieces.length);
				else assertEquals(1, pieces.length);
				assertEquals(plugins.length * REPEAT_KEYS, pieces[0].getKeypairs().length);
				for (var i = 0; i < pieces.length; i++) {
					testPieceWithoutEncryption(pieces[i]);
					assertInitialized(pieceRenderers[i].getDiv());
				}
				onDone();
			});
		}
	}
	
	function testFileImport(plugins, onDone) {
		console.log("Testing file import");
		
		// check if browser supports File constructor
		try {
			new File([""], "filename.txt", {type: "text/plain"});
		} catch (err) {
			console.log("Skipping file import tests because browser does not support the File constructor");
			onDone();
			return;
		}		
		
		// initialize controller
		var fileImporter = new ImportFileController($("<div>"), false);
		fileImporter.render(function() {
			
			// get test functions
			var funcs = [];
			funcs.push(testUnencryptedJson());
			funcs.push(testEncryptedJson());
			funcs.push(testEncryptedCsv());
			funcs.push(testCompatibleParts1());
	    funcs.push(testCompatibleParts2());
			funcs.push(testInvalidPieces());
			funcs.push(testIncompatibleParts());
			funcs.push(testDuplicateNames());
			funcs.push(testUnsupportedFileTypes());
			funcs.push(testZip());
			funcs.push(testPartThenUnencrypted());
			funcs.push(testNoPrivateKeys());
//		funcs.push(testInvalidZip());
			
			// run tests async
			async.series(funcs, function(err, results) {
				onDone(err);
			});
		});
		
		function getFile(str, name, type) {
			assertString(str);
			return new File([str], name, {type: type});
		}
		
		function testUnencryptedJson() {
			return function(onDone) {
				fileImporter.startOver();
				var file = getFile('{"keypairs":[{"ticker":"XMR","privateHex":"a233f87d3050d6a4d8c592e8bd617c34b832dab5e9c274a0b6d640e174190501"}]}', "file.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file], function() {
					assertEquals("", fileImporter.getWarning());
					onDone();
				});
			}
		}
		
		function testEncryptedJson() {
			return function(onDone) {
				fileImporter.startOver();
				var file = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"6PYUMuHUt6qtKDZ3EKdf5M5qMWnXiCrKTXJDDePAuGn2bTZ7afZnBGkpT4","publicAddress":"qzfwsjdlrvwtax9jrsfez996wg2ms2rh4sp2fsnk4k"}]}', "file.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file], function() {
					assertEquals("", fileImporter.getWarning());
					onDone();
				});
			}
		}
		
		function testEncryptedCsv() {
			return function(onDone) {
				fileImporter.startOver();
				var file = getFile('TICKER,PRIVATE_WIF,PUBLIC_ADDRESS\nBCH,6PYUMuHUt6qtKDZ3EKdf5M5qMWnXiCrKTXJDDePAuGn2bTZ7afZnBGkpT4,qzfwsjdlrvwtax9jrsfez996wg2ms2rh4sp2fsnk4k', "file.csv", AppUtils.FileType.CSV);
				fileImporter.addFiles([file], function() {
					assertEquals("", fileImporter.getWarning());
					onDone();
				});
			}
		}
		
		function testCompatibleParts1() {
			return function(onDone) {
				
				// add parts at same time
				fileImporter.startOver();
				var file1 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"Sne9W4vwiVbBJfpSCFdUMCH1jjr8e3tKUNKyLsvWAPaHQCuo"}]}', "file1.json", AppUtils.FileType.JSON);
				var file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"SneCaD85wAWaLRggV6jqeKoYh1qeadp1WWG85Hgmgvf5Sf36"}]}', "file2.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file1, file2], function() {
					assertEquals(2, fileImporter.getNamedPieces().length);
					assertEquals("", fileImporter.getWarning());
					
					// add parts one at a time
					fileImporter.startOver();
					fileImporter.addFiles([file1], function() {
						assertEquals(1, fileImporter.getNamedPieces().length);
						assertEquals("Need 1 additional part to recover private keys", fileImporter.getWarning());
						fileImporter.addFiles([file2], function() {
							assertEquals(2, fileImporter.getNamedPieces().length);
							assertEquals("", fileImporter.getWarning());
							onDone();
						});
					});
				});
			}
		}
		
		function testCompatibleParts2() {
      return function(onDone) {
        
        // add parts at same time
        fileImporter.startOver();
        var file1 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"3XyNhuJwKyRbvfXeCgCUEREnTgUmvtuvDGwL6sb66DLomvB"}]}', "file1.json", AppUtils.FileType.JSON);
        var file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"3Y37PFVGgLhRoL2H9rVjimTaz5MnCM9imTBhapQeG3BEy5z"}]}', "file2.json", AppUtils.FileType.JSON);
        fileImporter.addFiles([file1, file2], function() {
          assertEquals(2, fileImporter.getNamedPieces().length);
          assertEquals("", fileImporter.getWarning());
          
          // add parts one at a time
          fileImporter.startOver();
          fileImporter.addFiles([file1], function() {
            assertEquals(1, fileImporter.getNamedPieces().length);
            assertEquals("Need additional parts to recover private keys", fileImporter.getWarning());
            fileImporter.addFiles([file2], function() {
              assertEquals(2, fileImporter.getNamedPieces().length);
              assertEquals("", fileImporter.getWarning());
              onDone();
            });
          });
        });
      }
    }

		function testInvalidPieces() {	
			return function(onDone) {
				fileImporter.startOver();
				
				// test invalid address
				var file = getFile('{"keypairs":[{"ticker":"BTC","privateWif":"Kx4vXtwwNsoAgXcdpnsDH88hZJLcfV9MDQGoMMUPFut1X8SxxWZS","publicAddress":"qzgcajsew55vwjm5e7990mc2rhnqzx5qu59t3el4lj"}]}', "file.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file], function() {
					assertEquals("file.json is not a valid piece", fileImporter.getWarning());
					assertEquals(0, fileImporter.getNamedPieces().length);
					
					// test incorrect address
					file = getFile('{"keypairs":[{"ticker":"BTC","privateWif":"Kx4vXtwwNsoAgXcdpnsDH88hZJLcfV9MDQGoMMUPFut1X8SxxWZS","publicAddress":"1C4HXwb7tAF86ZwRARMBPuPo4Aa9cF6FTh"}]}', "file.json", AppUtils.FileType.JSON);
					fileImporter.addFiles([file], function() {
						assertEquals("file.json is not a valid piece", fileImporter.getWarning());
						assertEquals(0, fileImporter.getNamedPieces().length);
						
						// test multiple invalid files
						var file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"L1M7y3uauihKeEQG1gGFk4mwakktNSL97oajEs3jnz5cV11s8xNz","publicAddress":"qzj2w0f8jlck5syrm5c86le30sfzldkcj507djaj3k"}]}', "file2.json", AppUtils.FileType.JSON);
						fileImporter.addFiles([file, file2], function() {
							assertEquals("file2.json is not a valid piece", fileImporter.getWarning());
							assertEquals(0, fileImporter.getNamedPieces().length);
							
							// test invalid json
							fileImporter.startOver();
							file = getFile('Invalid json! {"keypairs":[{"ticker":"BTC","privateWif":"Kx4vXtwwNsoAgXcdpnsDH88hZJLcfV9MDQGoMMUPFut1X8SxxWZS","publicAddress":"qzgcajsew55vwjm5e7990mc2rhnqzx5qu59t3el4lj"}]}', "file.json", AppUtils.FileType.JSON);
							fileImporter.addFiles([file], function() {
								assertEquals("file.json is not a valid piece", fileImporter.getWarning());
								assertEquals(0, fileImporter.getNamedPieces().length);
								onDone();
							});
						});
					});
				});
			}
		}
		
		function testIncompatibleParts() {
			return function(onDone) {
				fileImporter.startOver();
				
				// test undivided different currencies
				var file1 = getFile('{"keypairs":[{"ticker":"BTC","privateWif":"L5WpQ4Nn7P7bWMXr7LbvTWo9iYJQYTbLJPfLt1CdyS4hmsBo7xEd"}]}', "file1.json", AppUtils.FileType.JSON);
				var file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"L1ncoCWShq4M5HS4csnFD6uiMZnjQTbpGjVASxowbLkSyJ8ocSkL"}]}', "file2.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file1, file2], function() {
					assertEquals(2, fileImporter.getNamedPieces().length);
					assertEquals("Parts are not compatible", fileImporter.getWarning());
					
					// test undivided same currency
					fileImporter.startOver();
					file2 = getFile('{"keypairs":[{"ticker":"BTC","privateWif":"KxL6QF8gb4aZX6Nm2udUzkeaA69HE2gsYJLpQ16N5jhRY5Tbqixf"}]}', "file2.json", AppUtils.FileType.JSON);
					fileImporter.addFiles([file1, file2], function() {
						assertEquals(2, fileImporter.getNamedPieces().length);
						assertEquals("Parts are not compatible", fileImporter.getWarning());
						
						// test divided with incompatible addresses
						fileImporter.startOver();
						file1 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"Sne9G9sJN1tqPwYwN5uXug42P9KqQrNjVrUyZV61oZphPnGi","publicAddress":"qqqam8u2tdsll4n5enrnky8h5p2t6r6tdvkhvmdm53"}]}', "file1.json", AppUtils.FileType.JSON);
						file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"SneDDq8GxWUgUUo2Ju3jmZvEcf5vQFXsgydBnb4uzmL2aYdt","publicAddress":"qz0g46c6lj9k2nrh6jw28sm3vw3entqfys0hxxjnqx"}]}', "file2.json", AppUtils.FileType.JSON);
						fileImporter.addFiles([file1, file2], function() {
							assertEquals(2, fileImporter.getNamedPieces().length);
							assertEquals("Parts are not compatible", fileImporter.getWarning());
							
							// test divided with incompatible private parts
							fileImporter.startOver();
							file1 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"Sne8yTZQdrxKRfanFop628APvbfqysYFfsEQhJFYhEjE7vJ5"}]}', "file1.json", AppUtils.FileType.JSON);
							file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"Sne9jYhr4zgKrvDRvJuCe8X4w9w6vTJvbWmVDZ8ZcN1jzBNp"}]}', "file2.json", AppUtils.FileType.JSON);
							fileImporter.addFiles([file1, file2], function() {
								assertEquals(2, fileImporter.getNamedPieces().length);
								assertEquals("Need additional parts to recover private keys", fileImporter.getWarning());
								onDone();
							});
						});
					});
				});
			}
		}
		
		function testDuplicateNames() {
			return function(onDone) {
				fileImporter.startOver();
				
				// add files at same time
				var file1 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"Sne9W4vwiVbBJfpSCFdUMCH1jjr8e3tKUNKyLsvWAPaHQCuo"}]}', "file1.json", AppUtils.FileType.JSON);
				var file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"SneCaD85wAWaLRggV6jqeKoYh1qeadp1WWG85Hgmgvf5Sf36"}]}', "file1.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file1, file2], function() {
					assertEquals(1, fileImporter.getNamedPieces().length);
					assertEquals("Need 1 additional part to recover private keys", fileImporter.getWarning());
					assertEquals("Sne9W4vwiVbBJfpSCFdUMCH1jjr8e3tKUNKyLsvWAPaHQCuo", fileImporter.getNamedPieces()[0].piece.getKeypairs()[0].getPrivateWif());
					
					// add files one at a time
					fileImporter.startOver();
					fileImporter.addFiles([file1], function() {
						assertEquals(1, fileImporter.getNamedPieces().length);
						assertEquals("Need 1 additional part to recover private keys", fileImporter.getWarning());
						assertEquals("Sne9W4vwiVbBJfpSCFdUMCH1jjr8e3tKUNKyLsvWAPaHQCuo", fileImporter.getNamedPieces()[0].piece.getKeypairs()[0].getPrivateWif());
						fileImporter.addFiles([file2], function() {
							assertEquals(1, fileImporter.getNamedPieces().length);
							assertEquals("file1.json already imported", fileImporter.getWarning());
							onDone();
						});
					});
				});
			}
		}
		
		function testZip() {
			return function(onDone) {
				
				// build piece
				var keypairs = [];
				for (var i = 0; i < plugins.length; i++) keypairs.push(new CryptoKeypair({plugin: plugins[i]}));
				var piece = new CryptoPiece({keypairs: keypairs});
				
				// divided piece
				var dividedPieces = piece.divide(NUM_PARTS, MIN_PARTS);
				
				// convert to zip file
				AppUtils.piecesToBlob(dividedPieces, AppUtils.FileType.CSV, function(err, blob, name) {
					assertNull(err);
					blob.lastModifiedDate = new Date();
			    blob.name = name;
					
			    // import
			    fileImporter.startOver();
			    fileImporter.addFiles([blob], function() {
						assertEquals(NUM_PARTS, fileImporter.getNamedPieces().length);
						assertEquals("", fileImporter.getWarning());
						onDone();
					});
				});
			}
		}
		
		function testUnsupportedFileTypes() {
			return function(onDone) {
				fileImporter.startOver();
				var file1 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"Sne9W4vwiVbBJfpSCFdUMCH1jjr8e3tKUNKyLsvWAPaHQCuo"}]}', "file1.jpg", "image/jpg");
				var file2 = getFile('{"keypairs":[{"ticker":"BCH","privateWif":"SneCaD85wAWaLRggV6jqeKoYh1qeadp1WWG85Hgmgvf5Sf36"}]}', "file2.png", "image/png");
				fileImporter.addFiles([file1, file2], function() {
					assertEquals(0, fileImporter.getNamedPieces().length);
					assertEquals("file2.png is not a json, csv, txt, or zip file", fileImporter.getWarning());
					onDone();
				});
			}
		}
		
		function testPartThenUnencrypted() {
			return function(onDone) {
				fileImporter.startOver();
				var file1 = getFile('{"keypairs":[{"ticker":"XMR","privateWif":"StRy32d5vCnoDQE1S7GLviyTRaZmhgTnHL4YwjdUheBVu5ev"}]}', "file1.json", AppUtils.FileType.JSON);
				var file2 = getFile('{"keypairs":[{"ticker":"XMR","privateWif":"scamper framed voted taken espionage dosage nomad point unnoticed oscar uneven mesh plotting huge dice luxury oilfield orphans fitting alerts goodbye unafraid daily divers dice"}]}', "file2.json", AppUtils.FileType.JSON);
				fileImporter.addFiles([file1, file2], function() {
					assertEquals(2, fileImporter.getNamedPieces().length);
					assertEquals("Parts are not compatible", fileImporter.getWarning());
					onDone();
				});
			}
		}
		
		function testNoPrivateKeys() {
			return function(onDone) {
				var file1 = getFile('{"keypairs":[{"ticker":"XMR","publicAddress":"49dq3hfvNua4bSrjHEa2MBEcQjMG2r2hdHRKRd8dWf6LTARrLgxoZCw4vWnvqHo47J86QYyBuQfPzSNWywq7BnRGVcQaVpU"}]}', "file1.json", AppUtils.FileType.JSON);
				var file2 = getFile('{"keypairs":[{"ticker":"XMR","publicAddress":"46wcKVhuMTjSrxDLdiNvDtZn4Wivk7qzVSEtmGyvuNHpSFZjqno3QvyRrG1CQGtSUwYtUHtdg2mWzCpVArHdtz7G5QBbMk8"}]}', "file2.json", AppUtils.FileType.JSON);
				
				// test one file
				fileImporter.startOver();
				fileImporter.addFiles([file1], function() {
					assertEquals(1, fileImporter.getNamedPieces().length);
					assertEquals("", fileImporter.getWarning());
					
					// test two files
					fileImporter.startOver();
					fileImporter.addFiles([file1, file2], function() {
						assertEquals(2, fileImporter.getNamedPieces().length);
						assertEquals("Parts are not compatible", fileImporter.getWarning());
						onDone();
					});
				});
			}
		}
	}
	
	function testTextImport(plugins, onDone) {
		console.log("Testing text import");
		
		// initialize controller
		var textImporter = new ImportTextController($("<div>"), plugins, false);
		textImporter.render(function() {
			
			// get test functions
			var funcs = [];
			funcs.push(testIncompatibleParts());
			funcs.push(testJsonNoPrivateKeys());
			funcs.push(testListOfPrivateKeys());
			funcs.push(testDividedParts());
			funcs.push(testPublicAddress());
			
			// run tests async
			async.series(funcs, function(err, results) {
				onDone(err);
			});
		});
		
		function testIncompatibleParts() {
			return function(onDone) {
				textImporter.startOver();
				textImporter.setSelectedCurrency("XMR");
				textImporter.addText("Sne8L5gQB5isnKcCPfF6SA514f5PE97QJ6yA8AEoo4hLtaao");
				assertEquals("Need 1 additional part to recover private keys", textImporter.getWarning());
				assertEquals(1, textImporter.getImportedPieces().length);
				textImporter.addText("aunt useful womanly vixen vowels business obtains weekday warped doorway sniff molten coexist enigma aplomb wallets value taunts makeup opposite joyous muzzle physics pledge doorway");
				assertEquals("Parts are not compatible", textImporter.getWarning());
				assertEquals(2, textImporter.getImportedPieces().length);
				onDone();
			}
		}
		
		function testJsonNoPrivateKeys() {
			return function(onDone) {
				textImporter.startOver();
				textImporter.addText('{"keypairs":[{"ticker":"XMR","publicAddress":"49dq3hfvNua4bSrjHEa2MBEcQjMG2r2hdHRKRd8dWf6LTARrLgxoZCw4vWnvqHo47J86QYyBuQfPzSNWywq7BnRGVcQaVpU"}]}');
				assertEquals(1, textImporter.getImportedPieces().length);
				assertEquals("", textImporter.getWarning());
				onDone();
			}
		}
		
		function testListOfPrivateKeys() {
			return function(onDone) {
				textImporter.startOver();
				textImporter.setSelectedCurrency("BTC");
				textImporter.addText("KwnC8xcepANRQtT1VKdcp4cJQpwznWjyjkRroA7xC2DDgGQpSUFm\nL5BDzGnsVDXUQTfWeo65XHnJpExExTs8u3EjUJVQgxp4sGdqMrZe\nL4EHcLncgutBYD3AMuYnMR4Mm4ZqopxQCe3afKeBXNxa1HrZp1kH");
				assertEquals("", textImporter.getWarning());
				assertEquals(1, textImporter.getImportedPieces().length);
				assertEquals(3, textImporter.getImportedPieces()[0].getKeypairs().length);
				onDone();
			}
		}
		
		function testDividedParts() {
			return function(onDone) {
				textImporter.startOver();
				textImporter.setSelectedCurrency("BTC");
				textImporter.addText("Sne8qX2HPiBQe62QN5MvRSbABVWcTzfVJG4BbibDLrqGN4DE");
				assertEquals("Need 1 additional part to recover private keys", textImporter.getWarning());
				assertEquals(1, textImporter.getImportedPieces().length);
				textImporter.addText("SneEBeRMJRQ5K5BCd64LE6jDPHi1hWzJqBKY7pAeawuvhRJC");
				assertEquals(2, textImporter.getImportedPieces().length);
				assertEquals("", textImporter.getWarning());
				onDone();
			}
		}
		
    function testPublicAddress() {
      return function(onDone) {
        textImporter.startOver();
        textImporter.setSelectedCurrency("BTC");
        textImporter.addText("14EPDSsGsipnjTmsd8S2s3df69q8wpg3Ex");
        assertEquals("Input text is not a private key or part", textImporter.getWarning());
        assertEquals(0, textImporter.getImportedPieces().length);
        onDone();
      }
    }
	}
	
	function testDestroyPiece(piece, onDone) {
		
		// only continue if piece is known to be undivided
		if (piece.isDivided() !== false) {
			onDone();
			return;
		}
		
		// don't destroy original piece
		piece = piece.copy();
		
		// start encrypting or decrypting
		var isDestroyed = false;
		if (!piece.isEncrypted()) {
			var schemes = [];
			for (var i = 0; i < piece.getKeypairs().length; i++) schemes.push(piece.getKeypairs()[i].getPlugin().getEncryptionSchemes()[0])
			var isDestroyed = false;
			piece.encrypt(PASSPHRASE, schemes, onProgressCb, onDoneCb);
		} else {
			piece.decrypt(PASSPHRASE, onProgressCb, onDoneCb);
		}
		
		// called on intermediate progress
		function onProgressCb(percent, label) {
			assertFalse(isDestroyed, "Should not call progress after being destroyed");
			
			// destroy after first keypair complete or progress exceeds 10%
			if (percent > 1 / piece.getKeypairs().length || percent > 0.1) {
			  piece.destroy();
	      isDestroyed = true;
	      assertTrue(piece.isDestroyed());
	      try {
	        piece.copy();
	        fail("fail");
	      } catch (err) {
	        if (err.message === "fail") throw new Error("Cannot use destroyed piece");
	      }
	      onDone();
			}
		}
		
		// test on done
		function onDoneCb(err, piece) {
			if (isDestroyed) throw new Error("Should not call done after being destroyed");
			onDone();	// destroy could not be tested because never intermediate progress
		}
	}
	
	function testDestroyPieceGenerator(plugins, onDone) {
		console.log("Testing destroy piece generator");
		
		// pre-generate a piece
		var keypairs = [];
		for (var i = 0; i < plugins.length; i++) keypairs.push(plugins[i].newKeypair());
		var piece = new CryptoPiece({keypairs: keypairs});
		
		// get generation config with encryption
		var config = {};
		config.pieces = [piece];
		config.passphrase = PASSPHRASE;
		config.encryptionSchemes = [];
		for (var i = 0; i < piece.getKeypairs().length; i++) config.encryptionSchemes.push(piece.getKeypairs()[i].getPlugin().getEncryptionSchemes()[0]);
		
		// start generating
		var isDestroyed = false;
		var pieceGenerator = new PieceGenerator(config);
		pieceGenerator.generatePieces(function(percent, label) {
			assertFalse(isDestroyed, "Progress should not be invoked after being destroyed");

			// destroy when progress exceeds 25%
			if (percent > .25) {
				var keypairs = piece.getKeypairs();
				pieceGenerator.destroy(true);
				isDestroyed = true;
				assertTrue(pieceGenerator.isDestroyed());
				assertTrue(piece.isDestroyed());
				for (var i = 0; i < keypairs.length; i++) assertTrue(keypairs[i].isDestroyed());
				
				// cannot use destroyed generator
				try {
					pieceGenerator.generatePieces();
					fail("fail");
				} catch (err) {
					if (err.message === "fail") throw new Error("Cannot use destroyed generator");
					assertEquals("Piece generator is destroyed", err.message);
				}
				
				// cannot use destroyed piece
				try {
					piece.copy();
					fail("fail");
				} catch (err) {
					if (err.message === "fail") throw new Error("Cannot use destroyed piece");
					assertEquals("Piece is destroyed", err.message);
				}
				
				// test destroying repeatedly to ensure no runaway threads
				testRepeatDestroy(function() {
					onDone();
				})
			}
		}, function(err, pieces, pieceRenderers) {
			throw new Error("onDone should not be invoked after being destroyed");
		});
		
		function testRepeatDestroy(onDone) {
			
			// collect test functions
			var funcs = [];
			var repeatDestroy = 5;
			for (var i = 0; i < repeatDestroy; i++) {
				funcs.push(function(onDone) { testDestroyImmediate(); onDone(); });
				funcs.push(function(onDone) { testDestroyDuring("Generating", getGenConfig(plugins, 1000, false), onDone); });
				funcs.push(function(onDone) { testDestroyDuring("Rendering", getGenConfig(plugins, 1, false), onDone); });
				funcs.push(function(onDone) { testDestroyDuring("Encrypting", getGenConfig(plugins, 1, true), onDone); });
			}
			
			// execute in series
			async.series(funcs, function(err) {
				if (err) throw err;
				onDone(err);
			})
		}
		
		function testDestroyImmediate() {
			var pieceGenerator = new PieceGenerator(getGenConfig(plugins, 1, false));
			pieceGenerator.generatePieces();
			pieceGenerator.destroy(true);
		}
		
		function testDestroyDuring(progressSubstring, genConfig) {
			var isDestroyed = false;
			var progressSeen = false;
			var progressSeenPercent;
			var pieceGenerator = new PieceGenerator(genConfig);
			pieceGenerator.generatePieces(function(percent, label) {
				if (isDestroyed) throw new Error("Should not invoke onProgress() after generator destroyed");
				if (strContains(label, progressSubstring)) {
					if (progressSeen && percent > progressSeenPercent) {
						pieceGenerator.destroy(true);
						isDestroyed = true;
						onDone();
						return;
					}
					progressSeen = true;
					progressSeenPercent = percent;
				}
			}, function(err, pieces, pieceRenderers) {
				assertTrue(isDestroyed, "Generator should have been destroyed for progress substring " + progressLabelSubstring);
				throw new Error("Should not invoke onDone() after generator destroyed")
			});
		}
		
		function getGenConfig(plugins, numKeypairs, useEncryption) {
			var config = {};
			config.keypairs = [];
			if (useEncryption) config.passphrase = PASSPHRASE;
			for (var i = 0; i < plugins.length; i++) {
				config.keypairs.push({
					ticker: plugins[i].getTicker(),
					numKeypairs: numKeypairs,
					encryption: useEncryption ? plugins[i].getEncryptionSchemes()[0] : undefined
				});
			}
			config.pieceRendererClass = StandardPieceRenderer;
			return config;
		}
	}
	
	function testBackwardsCompatibility(onDone) {
		console.log("Testing backwards compatibility")
		
		// 0.0.1 unencrypted which had 1.0 as version
		var json = {"version":"1.0","keys":[{"ticker":"BCH","address":"qzzyasm98rlzp49xy9ckyw5hpm62ha8p3slncram4x","wif":"Kzc8vfQ45ymDvoeLBSnZsHJC9f5FgWx5JUFKqK8PU9ew8MnPq2Gn","encryption":null}]};
		var piece1 = new CryptoPiece({json: json});
		var piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BCH", publicAddress: "qzzyasm98rlzp49xy9ckyw5hpm62ha8p3slncram4x", privateKey: "Kzc8vfQ45ymDvoeLBSnZsHJC9f5FgWx5JUFKqK8PU9ew8MnPq2Gn"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.1.0 unencrypted
		var json = {"version":"0.1.0","keys":[{"ticker":"BCH","address":"qzzyasm98rlzp49xy9ckyw5hpm62ha8p3slncram4x","wif":"Kzc8vfQ45ymDvoeLBSnZsHJC9f5FgWx5JUFKqK8PU9ew8MnPq2Gn","encryption":null}]};
		piece1 = new CryptoPiece({json: json});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BCH", publicAddress: "qzzyasm98rlzp49xy9ckyw5hpm62ha8p3slncram4x", privateKey: "Kzc8vfQ45ymDvoeLBSnZsHJC9f5FgWx5JUFKqK8PU9ew8MnPq2Gn"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.1.0 json encrypted
		json = {"version":"0.1.0","keys":[{"ticker":"XMR","address":"4ArXGi8gnxZA7Y9j1nK8ZmbspwCFcWLxyYeZkAnyCsYZ38c8FbyVvNfe3dAcp9Bk9P8Fa9fVp1gzz6v3B84rFW3SK9J7KPi","wif":"U2FsdGVkX19mwVwGQhm8jrqGIroOYfA4ckFDgBRhgGaQEE/uRpFXwFJlwwZ4DAGTTXTaAMEW6KSSzdsrjB7GE41U5L+Na5uuMK9wweoaoGH6j5rVTkRvToHYka4hAr9F","encryption":"CryptoJS"}]};
		piece1 = new CryptoPiece({json: json});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "XMR", publicAddress: "4ArXGi8gnxZA7Y9j1nK8ZmbspwCFcWLxyYeZkAnyCsYZ38c8FbyVvNfe3dAcp9Bk9P8Fa9fVp1gzz6v3B84rFW3SK9J7KPi", privateKey: "U2FsdGVkX19mwVwGQhm8jrqGIroOYfA4ckFDgBRhgGaQEE/uRpFXwFJlwwZ4DAGTTXTaAMEW6KSSzdsrjB7GE41U5L+Na5uuMK9wweoaoGH6j5rVTkRvToHYka4hAr9F"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.1.0 json encrypted and divided
		json = {"pieceNum":1,"version":"0.1.0","keys":[{"ticker":"XMR","address":"45KxzuKQKv1WsyFcfVdspsKzMW5JSbzw2Qb8LtXzMVHU6xX7SqXnx9GbqEjuaoEeRJBLTaCUB72LTQCsyuettu4SGGGWEXm","wif":"2cDy5mHRcbVUyk2HxT7R4JKMNd4MwydtvDoDProeJaTFou8KLffnwYrRM66JbLHQfEnTcRMPNkDDEZKjyPu8VYWFrnw2R2x7n2QPFtG7d2atNyXq6hzNZCTSUNhWUwGGQLT2xMez","encryption":"CryptoJS"}]};
		piece1 = new CryptoPiece({json: json});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "XMR", partNum: 1, publicAddress: "45KxzuKQKv1WsyFcfVdspsKzMW5JSbzw2Qb8LtXzMVHU6xX7SqXnx9GbqEjuaoEeRJBLTaCUB72LTQCsyuettu4SGGGWEXm", privateKey: "2cDy5mHRcbVUyk2HxT7R4JKMNd4MwydtvDoDProeJaTFou8KLffnwYrRM66JbLHQfEnTcRMPNkDDEZKjyPu8VYWFrnw2R2x7n2QPFtG7d2atNyXq6hzNZCTSUNhWUwGGQLT2xMez"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.1.6 json encrypted and split bip39
		json = {"pieceNum":2,"version":"0.1.6","keys":[{"ticker":"BIP39","address":"Not applicable","wif":"2cDy7cp3VXN1gts7JdJkMFQjF1eJ3L1AT8fqXWxwRydd7GsVtE3dEnn2ugSkgKpP2vuS52fZhV6zyNYbKXCE9xY5c8Z8zQ1fFzRx1p4zXuRZPeKTpiyA2rBZ4NVUCV6wVqUNzrHk","encryption":"V0_CRYPTOJS"}]};
		piece1 = new CryptoPiece({json: json});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BIP39", partNum: 2, privateKey: "2cDy7cp3VXN1gts7JdJkMFQjF1eJ3L1AT8fqXWxwRydd7GsVtE3dEnn2ugSkgKpP2vuS52fZhV6zyNYbKXCE9xY5c8Z8zQ1fFzRx1p4zXuRZPeKTpiyA2rBZ4NVUCV6wVqUNzrHk"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 json unencrypted
		json = {"version":"0.2.3","keys":[{"ticker":"LTC","address":"LSo2GTgwyhuaMAPh9PcuC7ANivTEW9pHpB","wif":"T6JEJvLyyy2EeCzH4daNJ2g32U7EPqRftY5dgAvf22t5YotF3s4J","encryption":null}]};
		piece1 = new CryptoPiece({json: json});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "LTC", publicAddress: "LSo2GTgwyhuaMAPh9PcuC7ANivTEW9pHpB", privateKey: "T6JEJvLyyy2EeCzH4daNJ2g32U7EPqRftY5dgAvf22t5YotF3s4J"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 json encrypted
		json = {"version":"0.2.3","keys":[{"ticker":"XMR","address":"49J6bLmRd5nUxMquQkBpDkTuPFgJ3dva8LcpWYnBWpMjCRN7u4KXGczNBenRfc7fHQcSpUPNHPXviXcf6cz5aB5621xrcTd","wif":"6ihMiRRf7NgYhVpHyAAFuoZd17Jf5SNwbUxVD9qg2FuZfbKmsKu4i5ErfZfRPttgksuhArNhG6ajRs5f64o2aviEGZFhJ7PpADFitjNq9ukzWpR5JLmyJVXBGCYTBYGo2T5","encryption":"V1_CRYPTOJS"}]};
		piece1 = new CryptoPiece({json: json});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "XMR", publicAddress: "49J6bLmRd5nUxMquQkBpDkTuPFgJ3dva8LcpWYnBWpMjCRN7u4KXGczNBenRfc7fHQcSpUPNHPXviXcf6cz5aB5621xrcTd", privateKey: "6ihMiRRf7NgYhVpHyAAFuoZd17Jf5SNwbUxVD9qg2FuZfbKmsKu4i5ErfZfRPttgksuhArNhG6ajRs5f64o2aviEGZFhJ7PpADFitjNq9ukzWpR5JLmyJVXBGCYTBYGo2T5"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 json encrypted and divided
		json = {"pieceNum":1,"version":"0.2.3","keys":[{"ticker":"BTC","address":"19LbxpV9eMtSppiVhxibHDfPJYCLY7YFJZ","wif":"3Gz5MbtY98FdKoFYLF1QcXvGszwPnBtUsvKRpNfEzhvDma3noDETGqYJRXFL4oCRemJyHDoSmmnUPvLSawKFJvEER2Q7ixbsr6BtYZdXr4kDWnLy8NiYhMEHKcD86oskjzpD1MWz"}]};
		piece1 = new CryptoPiece({json: json}); 
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BTC", partNum: 1, publicAddress: "19LbxpV9eMtSppiVhxibHDfPJYCLY7YFJZ", privateKey: "3Gz5MbtY98FdKoFYLF1QcXvGszwPnBtUsvKRpNfEzhvDma3noDETGqYJRXFL4oCRemJyHDoSmmnUPvLSawKFJvEER2Q7ixbsr6BtYZdXr4kDWnLy8NiYhMEHKcD86oskjzpD1MWz"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 json no private key and divided
		json = {"pieceNum":1,"version":"0.2.3","keys":[{"ticker":"BTC","address":"1AiWGJRuCkt1WP3N1B3Yo73t5kgNP3J17Q"}]}
		piece1 = new CryptoPiece({json: json}); 
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BTC", publicAddress: "1AiWGJRuCkt1WP3N1B3Yo73t5kgNP3J17Q"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 csv unencrypted
		var csv = "TICKER,ADDRESS,WIF,ENCRYPTION\nBCH,qr0ye8lqf9qwfhs28nsqu4xvsnx374ps3c5x4fje6m,KwhdDnzSuYQgjTyrdBmBDrM9ehJ9NzvnwdWiYFkjyk35AwzpeSKs,NULL";
		piece1 = new CryptoPiece({csv: csv});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BCH", publicAddress: "qr0ye8lqf9qwfhs28nsqu4xvsnx374ps3c5x4fje6m", privateKey: "KwhdDnzSuYQgjTyrdBmBDrM9ehJ9NzvnwdWiYFkjyk35AwzpeSKs"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 csv encrypted
		csv = "TICKER,ADDRESS,WIF,ENCRYPTION\nXMR,48zYRRTqfVpEKW2JFh4vbpbm2NsYEhwcJBwhaZGDkctyho5kpSbdx4SDFfNZLZxySgDaSrzuxNmtZ5VvVDDVLDXmBvNFQK5,9FqGDi3vAQV6nCobhuKyFr8FDormZ4dzt5mSX2GgYA1q8nQVniRQ4KrBfVXrLbzf1LUwgqVRnFzmhFWx5yZaarrHwM4ucczJGJwPPYNLoTZZUXGKGdvEPwEkDE2eu9ExBok,V1_CRYPTOJS";
		piece1 = new CryptoPiece({csv: csv});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "XMR", publicAddress: "48zYRRTqfVpEKW2JFh4vbpbm2NsYEhwcJBwhaZGDkctyho5kpSbdx4SDFfNZLZxySgDaSrzuxNmtZ5VvVDDVLDXmBvNFQK5", privateKey: "9FqGDi3vAQV6nCobhuKyFr8FDormZ4dzt5mSX2GgYA1q8nQVniRQ4KrBfVXrLbzf1LUwgqVRnFzmhFWx5yZaarrHwM4ucczJGJwPPYNLoTZZUXGKGdvEPwEkDE2eu9ExBok"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 csv divided
		csv = "TICKER,ADDRESS,WIF,PIECE_NUM\nXMR,49NR7bLTrAtPgVYtx8F1MUe3PZFiYC8sKFGB8VfuBK44KhUXrEoDtQkP77KgdirP4BDGSRJSinoUD5MzdyqaDzc9JYw4Zpw,Sne9BnjFn4fgGA3UFLpDGn6o5r9Eo9T7p11mJYX2Gdw2mMCs,1";
		piece1 = new CryptoPiece({csv: csv});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "XMR", partNum: 1, publicAddress: "49NR7bLTrAtPgVYtx8F1MUe3PZFiYC8sKFGB8VfuBK44KhUXrEoDtQkP77KgdirP4BDGSRJSinoUD5MzdyqaDzc9JYw4Zpw", privateKey: "Sne9BnjFn4fgGA3UFLpDGn6o5r9Eo9T7p11mJYX2Gdw2mMCs"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 csv no private keys divided
		csv = "TICKER,ADDRESS,PIECE_NUM\nXMR,475DC8KdSQgTEq5CbGeZvFhGX7f4qMYdC1eABNY2Vu3xTFEBnHfqfA3EYyyirXsy6a8MiBsjMWYVAfyhHM3UoFHMUN3giDG,1";
		piece1 = new CryptoPiece({csv: csv});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "XMR", publicAddress: "475DC8KdSQgTEq5CbGeZvFhGX7f4qMYdC1eABNY2Vu3xTFEBnHfqfA3EYyyirXsy6a8MiBsjMWYVAfyhHM3UoFHMUN3giDG"})]});
		assertTrue(piece1.equals(piece2));
		
		// 0.2.3 csv bip39
		csv = "TICKER,ADDRESS,WIF,ENCRYPTION\nBIP39,Not applicable,tomato domain essence fat velvet robot bring index slab daughter artist cover book image disease divert used paddle hire put index spare busy clap,NULL";
		piece1 = new CryptoPiece({csv: csv});
		piece2 = new CryptoPiece({keypairs: [new CryptoKeypair({plugin: "BIP39", privateKey: "tomato domain essence fat velvet robot bring index slab daughter artist cover book image disease divert used paddle hire put index spare busy clap"})]});
		assertTrue(piece1.equals(piece2));
    assertTrue(piece1.toCsv().indexOf("Not applicable") < 0);
		
		// done testing compatibility
		onDone();
	}
}