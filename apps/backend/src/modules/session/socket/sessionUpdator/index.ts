import { db } from "@/db";
import { tutorials } from "@/db/schema";
import type { Dialogue, SessionValue } from "@/modules/session/schema";
import createNewSessionValue from "@/modules/session/socket/sessionUpdator/createNewValue";
import { updateDialogueWithLLM } from "@/modules/session/socket/sessionUpdator/updateDialogue";
import {
	updateAndBroadcastDiff,
	updateAndBroadcastDiffToAll,
} from "@/modules/session/socket/updateDB";
import { eq } from "drizzle-orm";
import type { Operation } from "rfc6902";
import type { Socket } from "socket.io";

export async function updateSession(
	currentDataJson: SessionValue,
	diff: Operation[],
	socket: Socket,
) {
	const newDataJson = createNewSessionValue(socket, currentDataJson, diff);
	const code = currentDataJson.sessioncode;

	if (currentDataJson.uuid !== newDataJson.uuid) {
		socket.emit("error", "Invalid uuid");
		socket.disconnect();
		return;
	}

	function isLastMessageByUser(dialogue: Dialogue[]) {
		const lastMessage = dialogue[dialogue.length - 1];
		return lastMessage.isuser;
	}

	function isDialogueChanged(oldData: SessionValue, newData: SessionValue) {
		return newData.dialogue !== oldData.dialogue;
	}

	//チュートリアルが選択された場合の挙動を追加
	if (
		newDataJson.tutorial !== currentDataJson.tutorial &&
		typeof newDataJson.tutorial.tutorialId === "number"
	) {
		//DBのselectCountをインクリメント
		const id = newDataJson.tutorial.tutorialId;
		const tutorial = await db
			.select()
			.from(tutorials)
			.where(eq(tutorials.id, id));

		await db
			.update(tutorials)
			.set({
				metadata: {
					...tutorial[0].metadata,
					selectCount: tutorial[0].metadata.selectCount + 1,
				},
			})
			.where(eq(tutorials.id, id));
	}

	if (
		isDialogueChanged(currentDataJson, newDataJson) &&
		isLastMessageByUser(newDataJson.dialogue || []) &&
		newDataJson.isReplying === false
	) {
		//送信者をのぞくすべてのクライアントにdiffを送信する
		updateAndBroadcastDiff(
			code,
			{
				...newDataJson,
				stats: {
					...newDataJson.stats,
					totalInvokedLLM: newDataJson.stats.totalInvokedLLM + 1,
				},
				isReplying: true,
			},
			socket,
		);
		//送信者はisReplyingをtrueにするdiffだけを送信する必要がある。それ以外を送信すると、送信者はメッセージが二重に表示される
		socket.emit("notifyIsReplyingforSender");

		updateDialogueWithLLM(newDataJson, socket)
			.then(async (responseorError) => {
				updateAndBroadcastDiffToAll(code, responseorError, socket);
			})
			.catch((error) => {
				console.error("Error invoking LLM:", error);
			});
	} else {
		updateAndBroadcastDiff(code, newDataJson, socket);
	}
}
