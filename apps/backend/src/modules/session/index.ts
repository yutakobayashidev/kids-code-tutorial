import type { Context } from "@/context";
import { db } from "@/db";
import { appSessions } from "@/db/schema";
import { initialData } from "@/db/session";
import { defaultHook } from "@/libs/default-hook";
import { errorResponse } from "@/libs/errors";
import {
	deleteSession,
	getSession,
	newSession,
	putSession,
	resumeSession,
} from "@/modules/session/routes";
import joincodeGen from "@/utils/joincodeGen";
import { OpenAPIHono } from "@hono/zod-openapi";
import { eq } from "drizzle-orm";

const app = new OpenAPIHono<Context>({ defaultHook })
	.openapi(newSession, async (c) => {
		let language = c.req.valid("query").language;

		if (language === undefined || !language) {
			language = "en";
		}

		const code = joincodeGen();

		console.info("session created with initial data");

		//既に同じコードのセッションが存在する場合はエラーを返す
		const value = await db.query.appSessions.findFirst({
			where: eq(appSessions.sessioncode, code),
		});

		if (value?.sessioncode === code) {
			return errorResponse(c, {
				message: "Session code already exists",
				type: "BAD_REQUEST",
			});
		}

		//RedisからPostgresに移行しました: from 1.0.0
		//初期データが指定されていない場合は、初期データを生成し、セッションを作成する
		await db
			.insert(appSessions)
			.values(initialData(code, language.toString()))
			.execute();
		console.info("session created by api");
		return c.json(
			{
				sessionCode: code,
			},
			200,
		);
	})
	.openapi(resumeSession, async (c) => {
		const key = c.req.valid("param").key;

		const sessionData = c.req.valid("json");
		//そのkeyのセッションが存在するかどうかを確認する
		const value = await db.query.appSessions.findFirst({
			where: eq(appSessions.sessioncode, key),
		});
		if (
			!value ||
			value.workspace?.toString() !== sessionData.workspace?.toString()
		) {
			//セッションがない場合や、セッションデータが一致しない場合はデータを元に新しいセッションを作成する
			const code = joincodeGen();
			const {
				uuid,
				dialogue,
				quickReplies,
				workspace,
				language,
				easyMode,
				responseMode,
				llmContext,
				tutorial,
				stats,
				clicks,
			} = sessionData;
			await db
				.insert(appSessions)
				.values({
					sessioncode: code,
					uuid,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					...(quickReplies && { quickReplies }),
					dialogue: [
						...(dialogue ?? []),
						{
							id: (dialogue?.length ?? 0) + 1,
							contentType: "log",
							isuser: false,
							content: "dialogue.NewSessionWithData",
						},
					],
					isReplying: false,
					workspace,
					isVMRunning: false,
					clients: [],
					language,
					easyMode,
					responseMode,
					llmContext,
					tutorial,
					stats: stats ?? {
						audios: [],
						userAudio: "",
						screenshot: "",
						clicks: clicks ?? [],
					},
				})
				.execute();
			return c.json(
				{
					sessionCode: code,
				},
				200,
			);
		}
		return c.json(
			{
				sessionCode: key,
			},
			200,
		);

		//RedisからPostgresに移行しました: from 1.0.0
	})
	.openapi(putSession, async (c) => {
		const key = c.req.valid("param").key;
		const sessionData = c.req.valid("json");
		// RedisからPostgresに移行しました: from 1.0.0
		const existingSession = await db.query.users.findFirst({
			where: eq(appSessions.sessioncode, key),
		});
		if (!existingSession) {
			return errorResponse(c, {
				message: "Session not found",
				type: "NOT_FOUND",
			});
		}
		await db
			.update(appSessions)
			.set(sessionData)
			.where(eq(appSessions.sessioncode, key));
		return c.json({ message: "Session updated" }, 200);
	})
	.openapi(deleteSession, async (c) => {
		const key = c.req.valid("param").key;
		// RedisからPostgresに移行しました: from 1.0.0
		const existingSession = await db.query.users.findFirst({
			where: eq(appSessions.sessioncode, key),
		});
		if (!existingSession) {
			return errorResponse(c, {
				message: "Session not found",
				type: "NOT_FOUND",
			});
		}
		await db.delete(appSessions).where(eq(appSessions.sessioncode, key));
		return c.json({ message: "Session deleted" }, 200);
	})
	.openapi(getSession, async (c) => {
		const key = c.req.valid("param").key;
		//RedisからPostgresに移行しました: from 1.0.0
		const data = await db.query.appSessions.findFirst({
			where: eq(appSessions.sessioncode, key),
		});
		if (!data) {
			return errorResponse(c, {
				message: "Session not found",
				type: "NOT_FOUND",
			});
		}
		return c.json(data, 200);
	});

export default app;
