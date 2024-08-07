//debug
console.log("main.ts: Loading main app");

import express from "express";
import { verifyRequestOrigin } from "lucia";
import { lucia } from "./auth/index.js";
import ViteExpress from "vite-express";
import { EventEmitter } from "node:events";
import { createProxyMiddleware } from "http-proxy-middleware";

// Initialize express and on the main app
const app = express();
const vmApp = express();

// Cookieの読み込み
ViteExpress.config({
	ignorePaths: /^\/api|^\/vm/,
});

let port = 3000;
let vmPort = 3001;
if (process.env.PORT) {
	const basePort = Number.parseInt(process.env.PORT, 10); // 10進数として解釈
	if (!Number.isNaN(basePort)) {
		// basePortがNaNでないか確認
		port = basePort;
	}
}
if (process.env.VM_PORT) {
	const basePort = Number.parseInt(process.env.VM_PORT, 10); // 10進数として解釈
	if (!Number.isNaN(basePort)) {
		// basePortがNaNでないか確認
		vmPort = basePort;
	}
}

const serverEmitter = new EventEmitter();

app.use((req, res, next) => {
	if (req.method === "GET") {
		return next();
	}
	const originHeader = req.headers.origin ?? null;
	const hostHeader = req.headers.host ?? null;
	if (
		!originHeader ||
		!hostHeader ||
		!verifyRequestOrigin(originHeader, [hostHeader])
	) {
		return res.status(403).end();
	}
	return next();
});

app.use(async (req, res, next) => {
	const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
	if (!sessionId) {
		res.locals.user = null;
		res.locals.session = null;
		return next();
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (session?.fresh) {
		res.appendHeader(
			"Set-Cookie",
			lucia.createSessionCookie(session.id).serialize(),
		);
	}
	if (!session) {
		res.appendHeader(
			"Set-Cookie",
			lucia.createBlankSessionCookie().serialize(),
		);
	}
	res.locals.session = session;
	res.locals.user = user;
	return next();
});

const server = ViteExpress.listen(app, port, () => {
	console.log(`Server running on port ${port}`);
	serverEmitter.emit("server-started", server);
});

const vmServer = vmApp.listen(vmPort, () => {
	console.log(`VM Server running on port ${vmPort}`);
});

// メモリ監視
// const monitorMemoryUsage = (interval: number) => {
// 	setInterval(() => {
// 		const memoryUsage = process.memoryUsage();
// 		console.log(
// 			`プロセスの総使用量: ${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
// 		);
// 		console.log("-------------------------");
// 	}, interval);
// };
// monitorMemoryUsage(5000);

process.on("uncaughtException", (err) => {
	console.log(err);
});

serverEmitter.on("server-started", () => {
	console.log("Server started ----- routes will be added");
	// APIなどのルーティングをサーバー起動後に追加
	import("./apis.js").then((api) => {
		app.use("/api", api.default);
		console.log("API routes added");
	});
	//VMのルーティングをサーバー起動後に追加。別のサーバーなのでプロキシを使う
	// import("./session/websocket/vm/index.js").then((vm) => {
	// 	app.use("/vm", vm.default);
	// 	console.log("VM routes added");
	// });

	const vmProxy = createProxyMiddleware({
		target: `http://localhost:${vmPort}`,
		pathFilter: (path) => {
			return path.startsWith("/vm");
		},
		changeOrigin: true,
		ws: true,
		logger: console,
		on: {
			error: (err, req, res) => {
				console.log("error on proxy", err);
			},
			proxyReqWs: (proxyReq, req, socket, options, head) => {
				console.log("proxyReqWs");
			},
		},
	});
	app.use("/vm", vmApp);
	vmApp.use(vmProxy);
});

export { app, vmApp, server, vmServer, serverEmitter };
