import { IncomingMessage } from 'http';
import * as https from 'https';

export interface RequestBody {
	content: string | Buffer;
	contentType?: string;
}

export interface RequestData {
	headers?: Record<string, string>;
	body?: RequestBody;
}

export async function requestStream(url: URL, method: string, requestData?: RequestData): Promise<IncomingMessage> {
	return new Promise((resolve, reject) => {
		try {
			const req = https.request(url, { method });
		
			req
				.on('response', (incomingMessage: IncomingMessage) => {
					if (incomingMessage.statusCode === 206) {
						resolve(incomingMessage);
						return;
					}

					if (incomingMessage.statusCode !== 200) {
						const stCode = incomingMessage.statusCode ?? 'NO_CODE';
						const stMessage = incomingMessage.statusMessage ?? 'NO_MESSAGE';
						const message = `[${method} ${url.toString()}]:${stCode}/${stMessage}`;
						reject(new Error(message));
						return;
					}

					resolve(incomingMessage);
				})
				.on('error', (err: Error) => {
					const errno = (err as {errno?: string}).errno ?? '';
					if (errno === 'ETIMEDOUT') {
						reject(new Error(`Request (${url.toString()}) timeout.`));
					}
					else {
						reject(err);
					}
				});

			if (requestData) {
				if (requestData.headers) {
					for (const key of Object.getOwnPropertyNames(requestData.headers)) {
						const value = requestData.headers[key];
						req.setHeader(key, value);
					}
				}

				if (requestData.body) {
					if (requestData.body.contentType) {
						req.setHeader('Content-Type', requestData.body.contentType);
					}
					req.write(requestData.body.content);
				}
			}

			req.end();
		}
		catch (err) {
			reject(err);
		}
	});
}


export async function request(url: URL, method: string, requestData?: RequestData): Promise<Buffer> {

	const responseStream = await requestStream(url, method, requestData);

	let buffer: Buffer | undefined;

	for await (const item of responseStream) {
		const chunk = item as Buffer;
		buffer = (typeof buffer === 'undefined') ? chunk : Buffer.concat([buffer, chunk ]);
	}

	return buffer ? buffer : Buffer.from('');
}

export function get(url: URL, requestData?: RequestData): Promise<IncomingMessage> {
	return requestStream(url, 'GET', requestData);
}

export function post(url: URL, requestData?: RequestData): Promise<Buffer> {
	return request(url, 'POST', requestData);
}
