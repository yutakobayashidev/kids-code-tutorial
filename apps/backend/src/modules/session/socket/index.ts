import type { Server as HttpServer } from "node:http";
import { server } from "@/.";
// import { sessionDB } from "../../db/session.js";
import { db } from "@/db";
import codeGen from "@/libs/blocklyCodeGenerator";
import { getConfig } from "@/modules/config";
import { updateSession } from "@/modules/session/socket/sessionUpdator";
import { ExecCodeTest, StopCodeTest, UpdateCodeTest } from "@/modules/vm";
import { updateDialogue } from "@/utils/dialogueUpdater";
import { updateStats } from "@/utils/statsUpdater";
import { createMiddleware } from "hono/factory";
import { type Operation, applyPatch } from "rfc6902";
import { Server } from "socket.io";

import { appSessions } from "@/db/schema";
import type {
	SessionValue,
	sessionValueSchema,
} from "@/modules/session/schema";
import {
	updateAndBroadcastDiff,
	updateAndBroadcastDiffToAll,
} from "@/modules/session/socket/updateDB";
import { eq } from "drizzle-orm";
import type { Socket } from "socket.io";

const config = getConfig();

let io: Server | null = null;

export function initSocketServer(server: HttpServer) {
	io = new Server(server, {
		cors: {
			origin: "*",
		},
		path: "/session/socket/connect",
	});

	io.on("connection", async (socket) => {
		console.log("new connection request from client");
		const code = socket.handshake.query.code as string;
		const uuid = socket.handshake.query.uuid as string;

		console.log("on connect:", code, uuid);
		try {
			// コードが存在しない場合は接続を拒否
			//RedisからPostgresに移行しました: from 1.0.0
			const data = await db.query.appSessions.findFirst({
				where: eq(appSessions.sessioncode, code),
			});

			// uuidが一致しない場合は接続を拒否
			if (data?.uuid !== uuid) {
				socket.emit("error", "Invalid uuid");
				socket.disconnect();
				return;
			}

			socket.join(data.sessioncode);

			const dataWithNewClient = {
				...data,
				clients: [...(data.clients || []), socket.id],
			};

			socket.emit("PushCurrentSession", dataWithNewClient);

			// クライアントを追加
			updateAndBroadcastDiffToAll(
				code,
				dataWithNewClient, // クライアントを追加したデータ
				socket,
			);

			async function getCurrentDataJson(
				code: string,
			): Promise<SessionValue | null> {
				//RedisからPostgresに移行しました: from 1.0.0
				const data = await db.query.appSessions.findFirst({
					where: eq(appSessions.sessioncode, code),
				});
				if (!data) {
					socket.emit("error", "Session not found");
					socket.disconnect();
					return null;
				}
				return data;
			}

			//自動的に指定した分おきにスクリーンショットのリクエストを送信する
			const interval = config.Client_Settings.Screenshot_Interval_min || 1;
			const screenshotInterval = setInterval(
				() => {
					socket.emit("RequestScreenshot");
				},
				interval * 60 * 1000,
			); // 指定された分ごとにスクリーンショットをリクエスト

			socket.on("UpdateCurrentSessionDiff", async (diff: Operation[]) => {
				const currentDataJson = await getCurrentDataJson(code);
				if (!currentDataJson) {
					console.log("Session not found");
					socket.disconnect();
					return;
				}

				try {
					await updateSession(currentDataJson, diff, socket);
				} catch (error) {
					console.error("Error updating session:", error);
					socket.emit("error", "Server error");
				}
			});
			socket.on("openVM", async () => {
				console.log("openVM");
				const currentDataJson = await getCurrentDataJson(code);
				if (!currentDataJson) {
					console.log("Session not found");
					socket.disconnect();
					return;
				}
				let isRunning = currentDataJson.isVMRunning;
				const serializedWorkspace = currentDataJson.workspace;

				if (!serializedWorkspace) {
					isRunning = false;
					currentDataJson.isVMRunning = isRunning;
					updateAndBroadcastDiffToAll(
						code,
						updateDialogue("error.empty_workspace", currentDataJson, "error"),
						socket,
					);
					return;
				}

				const generatedCode = await codeGen(
					serializedWorkspace,
					currentDataJson.language || "en",
				);

				if (
					generatedCode === undefined ||
					generatedCode === null ||
					generatedCode === ""
				) {
					isRunning = false;
					currentDataJson.isVMRunning = isRunning;
					updateAndBroadcastDiffToAll(
						code,
						updateDialogue("error.empty_code", currentDataJson, "error"),
						socket,
					);
					return;
				}
				console.log("test code received. Executing...");
				const serverRootPath = `${socket.request.headers.host}`;
				const result = await ExecCodeTest(
					code,
					currentDataJson.uuid,
					generatedCode,
					serverRootPath,
					socket,
					updateAndBroadcastDiffToAll,
				);
				if (result === "Valid uuid") {
					console.log("Script is running...");
					isRunning = true;
					currentDataJson.isVMRunning = isRunning;
					await updateAndBroadcastDiffToAll(code, currentDataJson, socket);
					console.log("sending to all clients true");
				} else {
					console.log(result);
					isRunning = false;
					currentDataJson.isVMRunning = isRunning;
					await updateAndBroadcastDiffToAll(code, currentDataJson, socket);
					console.log("sending to all clients false");
				}
			});
			socket.on("updateVM", async (callback) => {
				console.log("updateVM");
				const currentDataJson = await getCurrentDataJson(code);
				if (!currentDataJson || !currentDataJson.workspace) {
					console.log("Session not found");
					socket.disconnect();
					return;
				}
				const generatedCode = await codeGen(
					currentDataJson.workspace,
					currentDataJson.language || "en",
				);
				const result = await UpdateCodeTest(
					code,
					currentDataJson.uuid,
					generatedCode,
				);
				callback("ok");
				console.log(result);
			});
			socket.on("stopVM", async () => {
				console.log("stopVM");
				const currentDataJson = await getCurrentDataJson(code);
				if (!currentDataJson) {
					console.log("Session not found");
					socket.disconnect();
					return;
				}
				let isRunning = currentDataJson.isVMRunning;
				const result = await StopCodeTest(
					code,
					uuid,
					socket,
					updateAndBroadcastDiffToAll,
				);
				console.log(result);
				isRunning = false;
				currentDataJson.isVMRunning = isRunning;

				const currentDataJsonWithUpdatedStats = updateStats(
					{
						totalCodeExecutions: currentDataJson.stats.totalCodeExecutions + 1,
					},
					currentDataJson,
				);
				await updateAndBroadcastDiffToAll(
					code,
					currentDataJsonWithUpdatedStats,
					socket,
				);
			});

			socket.on("disconnect", async () => {
				console.log("disconnected client");
				clearInterval(screenshotInterval);
				try {
					//RedisからPostgresに移行しました: from 1.0.0
					const rawData = await db
						.select()
						.from(appSessions)
						.where(eq(appSessions.sessioncode, code));

					const currentData: SessionValue = rawData[0];

					if (!currentData) {
						return;
					}
					const currentDataJson: SessionValue = currentData;

					if (currentDataJson.clients) {
						currentDataJson.clients = currentDataJson.clients.filter(
							(id) => id !== socket.id,
						);
					}

					//VMが実行中かつすべてのクライアントが切断された場合、VMを停止する
					if (
						currentDataJson.isVMRunning &&
						currentDataJson?.clients?.length === 0
					) {
						const result = await StopCodeTest(
							code,
							uuid,
							socket,
							updateAndBroadcastDiff,
						);
						console.log(`${result.message} VM stopped. no clients connected.`);
						currentDataJson.isVMRunning = false;
					}
					await updateAndBroadcastDiffToAll(code, currentDataJson, socket);
				} catch (error) {
					console.error("Error closing connection:", error);
				}
			});
		} catch (error) {
			console.log("Error connecting:", error);
			socket.emit("error", "Server error");
			socket.disconnect();
		}
	});
}

export const ioMiddleware = createMiddleware<{
	Variables: {
		io: Server;
	};
}>(async (c, next) => {
	if (!c.var.io && io) {
		c.set("io", io);
	}
	await next();
});
