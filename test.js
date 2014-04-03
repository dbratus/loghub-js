// Copyright (C) 2014 Dmitry Bratus
//
// The use of this source code is governed by the license
// that can be found in the LICENSE file.

var http = require('http'),
	loghub = require('./loghub');

var hub = loghub.connect(10000, 'localhost');
var log = loghub.connect(10001, 'localhost');

var srv = http.createServer(function (req, resp) {
	log.write(1, 'HTTP', 'Got request ' + req.url + '.');

	if (req.url === '/read') {
		var now = dateToTimestamp(new Date());

		log.read(now - minutes(1), now, 0, 255, null, function (ent) {
			if (ent) {
				resp.write(ent.Msg + '\n');
			} else {
				resp.end();
			}
		});
	} else if (req.url === '/truncate') {
		log.truncate('', dateToTimestamp(new Date()));
		resp.end();
	} else if (req.url === '/stat') {
		hub.stat(function (stat) {
			if (stat) {
				resp.write(stat.Addr + ': ' + stat.Sz + '/' + stat.Lim + '\n');
			} else {
				resp.end();
			}
		});
	} else {
		resp.write('OK');
		resp.end();
	}
});

srv.listen(8080);

function dateToTimestamp(date) {
	return date.valueOf() * 1000 * 1000;
}

function minutes(val) {
	return val * 60 * 1000 * 1000 * 1000;
}