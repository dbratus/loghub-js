// Copyright (C) 2014 Dmitry Bratus
//
// The use of this source code is governed by the license
// that can be found in the LICENSE file.

var net = require('net'),
	jstream = require('./jstream.js');

function writeLog(sock, entries, callback) {
	sock.write(JSON.stringify({ Action: 'write' }) + '\0');

	for (var i = 0; i < entries.length; i++) {
		sock.write(JSON.stringify(entries[i]) + '\0');
	}

	sock.write('\0', void 0, function() { callback(); });
}

function readLog(sock, queries, callback) {	
	var parser = new jstream.Parser(onEntry);

	sock.on('data', onData);

	sock.write(JSON.stringify({ Action: 'read' }) + '\0');
	
	for (var i = 0; i < queries.length; i++) {
		sock.write(JSON.stringify(queries[i]) + '\0');
	}

	sock.write('\0');

	function onData(data) {
		parser.write(data);
	}

	function onEntry(ent) {
		if (ent) {
			callback({
				timestamp: ent.Ts,
				severity: ent.Sev,
				source: ent.Src,
				message: ent.Msg
			});
		} else {
			callback();
			sock.removeListener('data', onData);
		}
	}
}

function truncateLog(sock, source, limit, callback) {
	sock.write(JSON.stringify({ Action: 'truncate' }) + '\0');
	sock.write(JSON.stringify({ Src: source, Lim: limit }) + '\0', void 0, function() { callback(); });
}

function getStat(sock, callback) {
	var parser = new jstream.Parser(onEntry);

	sock.on('data', onData);

	sock.write(JSON.stringify({ Action: 'stat' }) + '\0');
	
	function onData(data) {
		parser.write(data);
	}

	function onEntry(ent) {
		if (ent) {
			callback({
				address: ent.Addr,
				size: ent.Sz,
				limit: ent.Lim
			});
		} else {
			callback();
			sock.removeListener('data', onData);
		}
	}
}

exports.connect = function(port, host, options) {
	var sock = null,
		tailOp = null,
		headOp = null,
		curOp = null;

	var connectSock = function(callback) {
		if (!sock) {
			var opt = {
				host: host,
				port: port
			};

			sock = net.connect(opt, function() {
				callback(sock);
			});

			sock.on('error', function() {
				sock = null;
				callback(null);
			});
			sock.on('end', function() { sock = null; })
		} else {
			callback(sock);
		}
	};

	var pushOp = function(action, callback) {
		var newOp = {
			action: action,
			prev: null
		};

		callback(newOp);

		if (!headOp) {
			headOp = newOp;
		}

		if (tailOp) {
			tailOp.prev = newOp;
		}

		tailOp = newOp;
	};

	var popOp = function() {
		if (headOp) {
			var oldHead = headOp;

			headOp = headOp.prev;

			if (!headOp) {
				tailOp = null;
			}

			return oldHead;
		}

		return null;
	};

	var processOperations = function() {
		if (headOp) {
			while (!curOp) {
				curOp = popOp();

				switch (curOp.action) {
					case 'write':
						connectSock(function (sock) {
							if (sock) {
								writeLog(sock, curOp.entries, function() {
									curOp = null;
									processOperations();
								});
							} else {
								curOp = null;
							}
						});
						break;
					case 'read':
						connectSock(function (sock) {
							if (sock) {
								readLog(sock, curOp.queries, function(ent) {
									curOp.callback(ent);

									if (!ent) {
										curOp = null;
										processOperations();
									}
								});
							} else {
								curOp = null;
							}
						});
						break;
					case 'truncate':
						connectSock(function (sock) {
							if (sock) {
								truncateLog(sock, curOp.source, curOp.limit, function() {
									curOp = null;
									processOperations();
								});
							} else {
								curOp = null;
							}
						});
						break;
					case 'stat':
						connectSock(function (sock) {
							if (sock) {
								getStat(sock, function(stat) {
									curOp.callback(stat);

									if (!stat) {
										curOp = null;
										processOperations();
									}
								});
							} else {
								curOp = null;
							}
						});
						break;
				}
			}
		}
	};

	var opTimer = setInterval(processOperations, 100);

	return {
		write: function(sev, src, msg) {
			var newEntry = {
				Sev: sev,
				Src: src,
				Msg: msg,
			};

			if (tailOp && tailOp.action === 'write') {
				tailOp.entries.push(newEntry);
			} else {
				pushOp('write', function(newOp) {
					newOp.entries = [newEntry];
				});
			}
		},

		read: function(rangeStart, rangeEnd, minSev, maxSev, sources, callback) {
			pushOp('read', function(newOp) {
				if (sources) {
					var queries = [];

					for (var i = 0; i < sources.length; i++) {
						queries.push({
							From: rangeStart,
							To: rangeEnd,
							MinSev: minSev,
							MaxSev: maxSev,
							Src: sources[i],
						});
					}

					newOp.queries = queries;
				} else {
					newOp.queries = [{
						From: rangeStart,
						To: rangeEnd,
						MinSev: minSev,
						MaxSev: maxSev,
						Src: '',
					}];
				}

				newOp.callback = callback;
			});
		},

		truncate: function(limit, source) {
			pushOp('truncate', function(newOp) {
				newOp.limit = limit;
				newOp.source = source || '';
			});
		},

		stat: function(callback) {
			pushOp('stat', function(newOp) {
				newOp.callback = callback;
			});
		},

		close: function() {
			clearInterval(opTimer);

			if (sock) {
				sock.close()
			}
		}
	};
}