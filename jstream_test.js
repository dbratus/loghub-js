// Copyright (C) 2014 Dmitry Bratus
//
// The use of this source code is governed by the license
// that can be found in the LICENSE file.

var jstream = require('./loghub/jstream.js');

var objsCnt = 0;
var parser = new jstream.Parser(function(obj) {
	if (obj) {
		console.log(JSON.stringify(obj));
		objsCnt++;
	} else {
		console.log('<end>');
	}
});

var chunks = [
	new Buffer('{ "a": 1 }\0', 'utf8'),
	new Buffer('{ "b": ', 'utf8'),
	new Buffer('2 }\0{ "c": 3 }\0', 'utf8'),
	new Buffer('\0', 'utf8')
];

for (var tries = 0; tries < 10; tries++) {
	for (var i = 0; i < chunks.length; i++) {
		try {
			parser.write(chunks[i]);
		} catch(e) {
			console.log(e.message);
		}
	}
}

console.log('Objects read: ' + objsCnt);