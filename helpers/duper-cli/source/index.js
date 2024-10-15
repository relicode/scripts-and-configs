#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';

import App from './app.js';
import loadDupeFile from './duper.js';

const dupes = await loadDupeFile(process.argv[2]);

if (!Array.isArray(dupes)) {
	console.error('Invalid dupes:');
	console.error(JSON.stringify(dupes, null, 2));
}

render(<App dupes={dupes} />);
