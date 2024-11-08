import express from "express";
import { sessionDB } from "../db/session.js";
import type { SessionValue } from "../../type.js";

const sessionManager = express.Router();

/**
 * @openapi
 * /admin/sessions/list:
 *   get:
 *     description: Returns a list of all sessions
 *     responses:
 *       200:
 *         description: A list of all sessions with pagination information, and session data(reduced)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example: { error: "Error message" }
 */

//セッションの全データを取得するAPI(ダウンロード用)
sessionManager.get("/download", async (req, res) => {
	console.log("download all sessions");
	try {
		const keys = [];
		for await (const key of await sessionDB.keys("*")) {
			keys.push(key);
		}
		if (keys.length === 0) {
			res.json([]);
			return;
		}
		const allSessions = await sessionDB.mGet(keys);
		const filteredSessions = allSessions
			.map((sessionString) => {
				if (sessionString) {
					const session = JSON.parse(sessionString) as SessionValue;
					return session;
				}
				return null;
			})
			.filter((session) => session !== null);
		res.json(filteredSessions);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: (err as Error).message });
	}
});

// セッションの一覧を取得するAPI
sessionManager.get("/list", async (req, res) => {
	console.log("get all sessions");
	const page = Number.parseInt(req.query.page as string) || 1;
	const limit = Number.parseInt(req.query.limit as string) || 10;
	const sortField = (req.query.sortField as keyof SessionValue) || "updatedAt";
	const sortOrder = (req.query.sortOrder as string) || "desc";
	const start = (page - 1) * limit;
	const end = start + limit;

	try {
		const keys = [];
		for await (const key of await sessionDB.keys("*")) {
			keys.push(key);
		}
		if (keys.length === 0) {
			res.json([]);
			return;
		}
		const allSessions = await sessionDB.mGet(keys);
		const filteredSessions = allSessions
			.map((sessionString) => {
				if (sessionString) {
					const session = JSON.parse(sessionString) as SessionValue;
					return {
						sessioncode: session.sessioncode,
						language: session.language,
						createdAt: session.createdAt,
						updatedAt: session.updatedAt,
						stats: session.stats,
						clients: session.clients,
					};
				}
				return null;
			})
			.filter((session) => session !== null);

		const sortedSessions = filteredSessions.sort((a, b) => {
			if (sortOrder === "asc") {
				return (a as any)[sortField] > (b as any)[sortField] ? 1 : -1;
			}
			return (a as any)[sortField] < (b as any)[sortField] ? 1 : -1;
		}) as SessionValue[];

		const paginatedSessions = sortedSessions.slice(start, end);
		res.json({
			sessions: paginatedSessions,
			total: keys.length,
			page,
			limit,
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: (err as Error).message });
	}
});

/**
 * @openapi
 * /admin/sessions/{code}:
 *   delete:
 *     description: Deletes a session by code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: No Content
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example: { error: "Error message" }
 */
// セッションの削除を行うAPI
sessionManager.delete("/:code", async (req, res) => {
	const code = req.params.code;

	try {
		await sessionDB.del(code);
		res.status(204).end();
	} catch (err) {
		res.status(500).json({ error: (err as Error).message });
	}
});

export default sessionManager;
