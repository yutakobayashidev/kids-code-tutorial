import type { SessionValue } from "@/modules/session/schema";
import { type Operation, applyPatch } from "rfc6902";
import type { Socket } from "socket.io";

export default function createNewSessionValue(
	socket: Socket,
	currentDataJson: SessionValue,
	diff: Operation[],
): SessionValue {
	// 深いコピーを作成
	const newDataJSON = structuredClone(currentDataJson);
	// パッチを適用
	const success = applyPatch(newDataJSON, diff);
	if (!success) {
		console.error("Failed to apply patch");
		socket.emit("error", "Failed to apply patch");
		return currentDataJson; // 元の値を返す
	}

	return newDataJSON;
}
