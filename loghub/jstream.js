// Copyright (C) 2014 Dmitry Bratus
//
// The use of this source code is governed by the license
// that can be found in the LICENSE file.

var DEFAULT_BUFFER_SIZE = 256;

exports.Parser = function(callback) {
	var buf = new Buffer(DEFAULT_BUFFER_SIZE),
		offset = 0;

	this.write = function(data) {
		var newLength = offset + data.length,
			newBuf,
			i,
			shift,
			delimiterFound;

		if (newLength > buf.length) {
			newBuf = new Buffer(newLength);
			buf.copy(newBuf, 0, 0, offset);
			buf = newBuf;
		}

		data.copy(buf, offset);

		do {
			delimiterFound = false;

			for (i = 0; i < newLength; i++) {
				if (!buf[i]) {
					if (i) {
						callback(
							JSON.parse(
								buf.toString('utf8', 0, i)
							)
						);
					} else {
						callback(null);
					}

					shift = i + 1;
					buf.copy(buf, 0, shift, newLength);				
					newLength -= shift;

					delimiterFound = true;

					break;
				}
			}
		} while(delimiterFound);

		offset = newLength;
	};
};