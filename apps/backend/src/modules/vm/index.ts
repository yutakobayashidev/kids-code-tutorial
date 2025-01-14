import { createServer } from "node:http";
import type { Socket as nodeSocket } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { db } from "@/db";
import { appSessions } from "@/db/schema";
import { getConfig } from "@/modules/config";
import type { SessionValue } from "@/modules/session/schema";
import LogBuffer from "@/modules/vm/logBuffer";
import type { vmMessage } from "@/modules/vm/tsWorker";
import { type HttpBindings, serve } from "@hono/node-server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { createProxyMiddleware } from "http-proxy-middleware";
import type { Socket } from "socket.io";
// `__dirname` を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// VMのインスタンスを管理するインターフェース
interface VMInstance {
	running: boolean;
	worker: Worker;
	port?: number;
	ip?: string;
}

// VMのインスタンスを管理するオブジェクト
const vmInstances: { [key: string]: VMInstance } = {};

//VMのコードとプロキシを紐づけて管理するオブジェクト
const vmProxies = new Map<string, any>();
// VMインスタンス作成時に新しいプロキシをリストに追加する関数
function setupVMProxy(code: string) {
	vmProxies.set(code, proxy);
}
// VMインスタンス停止時にプロキシを削除する関数
function removeVMProxy(code: string) {
	vmProxies.delete(code);
}

let vmPort = 3002;
if (process.env.VM_PORT) {
	const basePort = Number.parseInt(process.env.VM_PORT, 10); // 10進数として解釈
	if (!Number.isNaN(basePort)) {
		// basePortがNaNでないか確認
		vmPort = basePort;
	}
}

const app = new Hono<{ Bindings: HttpBindings }>();
//参加コードに対してプロキシを保存するマップ
const proxy = createProxyMiddleware({
	router: async (req) => {
		const code = req.url?.split("/")[1];
		if (!code) {
			return;
		}

		const session = await db
			.select()
			.from(appSessions)
			.where(eq(appSessions.sessioncode, code));

		const uuid = session[0].uuid;
		const instance = vmInstances[uuid];
		if (instance) {
			return `http://${instance.ip}:${instance.port}`;
		}
		return;
	},
	pathRewrite: (path, req) => {
		return path.replace(req.url?.split("/")[1] || "", "");
	},
	ws: true,
	logger: console,
});

const server = serve({
	fetch: app.fetch,
	overrideGlobalObjects: false,
	port: vmPort,
	createServer: createServer,
});
server.on("upgrade", (req, socket, head) => {
	proxy.upgrade(req, socket as nodeSocket, head);
});

app.all("/:code", async (c, next) => {
	const code = c.req.param("code");
	if (!code) {
		c.status(400);
		return;
	}

	if (vmProxies.has(code)) {
		return new Promise((resolve, reject) => {
			try {
				proxy(c.env.incoming, c.env.outgoing, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			} catch (e) {
				reject(e);
			}
		});
	}
	return c.status(404);
});

export async function ExecCodeTest(
	code: string,
	uuid: string,
	userScript: string,
	serverRootPath: string,
	socket: Socket,
	DBupdator: (
		code: string,
		newData: SessionValue,
		socket: Socket,
	) => Promise<void>,
): Promise<string> {
	const session = await db
		.select()
		.from(appSessions)
		.where(eq(appSessions.sessioncode, code));
	if (!session) {
		return "Invalid session";
	}
	const sessionValue: SessionValue = session[0];
	if (sessionValue.uuid !== uuid) {
		return "Invalid uuid";
	}

	const logBuffer = new LogBuffer(
		async (code, logs) => {
			const session = await db
				.select()
				.from(appSessions)
				.where(eq(appSessions.sessioncode, code));
			if (!session) {
				return;
			}
			const sessionValue: SessionValue = session[0];
			sessionValue.dialogue?.push(logs);
			await DBupdator(code, sessionValue, socket);
		},
		code,
		async () => {
			const session = await db
				.select()
				.from(appSessions)
				.where(eq(appSessions.sessioncode, code));
			return session[0];
		},
	);

	try {
		//configを読み込む
		const config = getConfig();

		const joinCode = code;

		const worker = new Worker(path.resolve(__dirname, "./worker.mjs"), {
			workerData: { joinCode, sessionValue, serverRootPath, userScript },
			resourceLimits: {
				codeRangeSizeMb: config.Code_Execution_Limits.Max_CodeRangeSizeMb,
				maxOldGenerationSizeMb:
					config.Code_Execution_Limits.Max_OldGenerationSizeMb,
				maxYoungGenerationSizeMb:
					config.Code_Execution_Limits.Max_YoungGenerationSizeMb,
			},
		});

		worker.on("message", (msg: vmMessage) => {
			if (msg.type === "log") logBuffer.add(msg.content);
			if (msg.type === "error") logBuffer.error(msg.content);
			if (msg.type === "info") logBuffer.info(msg.content);

			if (msg.type === "openVM") {
				const port = msg.port;
				const ip = msg.ip;
				if (!port) {
					return;
				}

				// vmInstancesにIPとポートを保存
				vmInstances[uuid].port = port;
				vmInstances[uuid].ip = ip;

				// プロキシの設定
				setupVMProxy(code);
			}
		});

		worker.on("error", (err) => {
			if (err.toString().includes("ERR_WORKER_OUT_OF_MEMORY")) {
				logBuffer.error(`${"vm.outOfMemory"} (${err.message})`);
			} else {
				logBuffer.error(`${err.message}`);
			}
		});

		worker.on("exit", (exitcode) => {
			logBuffer.stop();
			StopCodeTest(code, uuid, socket, DBupdator);
		});

		// workerインスタンスを保存
		vmInstances[uuid] = { running: true, worker: worker };
	} catch (e) {
		await StopCodeTest(code, uuid, socket, DBupdator);
	}

	logBuffer.start();

	return "Valid uuid";
}

// ExecCodeTestで実行しているWorkerを通して、コードを更新するための関数
export async function UpdateCodeTest(
	code: string,
	uuid: string,
	newUserScript: string,
): Promise<string> {
	const instance = vmInstances[uuid];
	if (instance?.running) {
		const session = await db
			.select()
			.from(appSessions)
			.where(eq(appSessions.sessioncode, code));
		if (!session) {
			return "Invalid session";
		}
		const sessionValue: SessionValue = session[0];
		if (sessionValue.uuid !== uuid) {
			return "Invalid uuid";
		}
		// Workerに新しいコードを送信
		instance.worker.postMessage({
			type: "updateScript",
			code: newUserScript,
		});
		return "Script updated successfully.";
	}
	return "Script is not running.";
}

// 修正されたStopCodeTest関数
export async function StopCodeTest(
	code: string,
	uuid: string,
	socket: Socket,
	DBupdator: (
		code: string,
		newData: SessionValue,
		socket: Socket,
	) => Promise<void>,
): Promise<{ message: string; error: string }> {
	const instance = vmInstances[uuid];
	if (instance?.running) {
		instance.running = false;
		const session = await db
			.select()
			.from(appSessions)
			.where(eq(appSessions.sessioncode, code));
		if (!session) {
			return {
				message: "Invalid session",
				error: "Invalid session",
			};
		}
		if (session[0].uuid !== uuid) {
			return {
				message: "Invalid uuid",
				error: "Invalid uuid",
			};
		}

		// Workerを終了
		await instance.worker.terminate();

		// プロキシをクリア
		// const stack = vmExpress._router.stack;
		// for (let i = stack.length - 1; i >= 0; i--) {
		// 	const layer = stack[i];
		// 	if (layer.route?.path?.toString().includes(code)) {
		// 		stack.splice(i, 1);
		// 	}
		// }

		//honoのルーターからプロキシを削除
		// const stack = app.routes;
		// for (let i = stack.length - 1; i >= 0; i--) {
		// 	const layer = stack[i];
		// 	if (layer.path?.toString().includes(code)) {
		// 		stack.splice(i, 1);
		// 	}
		// }

		// プロキシを削除
		removeVMProxy(code);
		delete vmInstances[uuid];

		// DBを更新し、クライアントに通知
		const sessionValue: SessionValue = session[0];
		sessionValue.isVMRunning = false;
		await DBupdator(code, sessionValue, socket);
		return {
			message: "Script execution stopped successfully.",
			error: "",
		};
	}
	return {
		message: "Script is not running.",
		error: "Script is not running.",
	};
}
