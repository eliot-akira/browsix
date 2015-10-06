/// <reference path="../../typings/node/node.d.ts" />
/// <reference path="../../typings/promise.d.ts" />
/// <reference path="../../node_modules/ts-stream/ts-stream.d.ts" />

'use strict';

import { now } from './ipc';
import { syscall, SyscallResponse } from './syscall';

import * as bindingBuffer from './binding/buffer';
import * as bindingUV from './binding/uv';
import * as bindingFs from './binding/fs';
import * as bindingFsEventWrap from './binding/fs_event_wrap';
import * as bindingConstants from './binding/constants';
import * as bindingContextify from './binding/contextify';

class Process {
	argv: string[];
	env: Environment;

	constructor(argv: string[], environ: Environment) {
		this.argv = argv;
		this.env = environ;
	}

	exit(code: number): void {
		syscall.exit(code);
	}

	binding(name: string): any {
		switch (name) {
		case 'buffer':
			return bindingBuffer;
		case 'uv':
			return bindingUV;
		case 'fs':
			return bindingFs;
		case 'fs_event_wrap':
			return bindingFsEventWrap;
		case 'constants':
			return bindingConstants;
		case 'contextify':
			return bindingContextify;
		default:
			console.log('TODO: unimplemented binding ' + name);
		}
		return null;
	}
}
let process = new Process(undefined, {});
(<any>self).process = process;

import * as fs from './fs';


declare var thread: any;
// node-WebWorker-threads doesn't support setTimeout becuase I think
// they want me to sink into depression.
function superSadSetTimeout(cb: any, ms: any): void {
	'use strict';
	return (<any>thread).nextTick(cb);
}

interface Environment {
	[name: string]: string;
}

function _require(moduleName: string): any {
	'use strict';

	switch (moduleName) {
	case 'fs':
		return fs;
	default:
		throw new ReferenceError('unknown module ' + moduleName);
	}
}

syscall.addEventListener('init', init.bind(this));
console.log('add init listener');
function init(data: SyscallResponse): void {
	'use strict';
	console.log('received init message');

	let args = data.args.slice(0, -1);
	let environ = data.args[data.args.length - 1];
	process.argv = args;
	process.env = environ;

	if (typeof (<any>self).setTimeout === 'undefined')
		(<any>self).setTimeout = superSadSetTimeout;

	(<any>self).process = process;
	(<any>self).require = _require;
	try {
		(<any>self).importScripts(args[1]);
	} catch (e) {
		console.log(''+e.fileName + ':' + e.lineNumber + '- ' + e);
	}
}