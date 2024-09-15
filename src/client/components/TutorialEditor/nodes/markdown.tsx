import {
	Position,
	type NodeProps,
	Handle,
	useReactFlow,
	type Node,
	Connection,
	useHandleConnections,
	useNodesData,
} from "@xyflow/react";

import {
	markdownShortcutPlugin,
	MDXEditor,
	type MDXEditorMethods,
} from "@mdxeditor/editor";
import {
	UndoRedo,
	BoldItalicUnderlineToggles,
	ListsToggle,
	BlockTypeSelect,
	toolbarPlugin,
	headingsPlugin,
	listsPlugin,
} from "@mdxeditor/editor";

import "@mdxeditor/editor/style.css";
import React, { useEffect, useState } from "react";
import type { markdownNode, MyNode, workspaceNode } from "./nodetype.js";

export function Markdown({ id, data }: NodeProps<markdownNode>) {
	const { updateNodeData, getNode } = useReactFlow();

	const handleSourceChange = (field: string, value: string) => {
		updateNodeData(id, { ...data, [field]: value });
	};

	const connections = useHandleConnections({
		type: "target",
		id: "blockly",
	});

	// Blocklyハンドルの接続先のノードデータを取得
	const nodesData = useNodesData<MyNode>(
		connections.map((connection) => connection.source),
	);

	const mdxEditorRef = React.useRef<MDXEditorMethods>(null);

	// dataが変更されたら、mdxEditorのmarkdownを更新する
	useEffect(() => {
		if (mdxEditorRef.current) {
			mdxEditorRef.current.setMarkdown(data.editorContent);
			console.log("setMarkdown", nodesData);
		}
		//blocklyのノードと結合し、sourceとして出力する
		if (nodesData) {
			const blocklyNode = nodesData.find((node) => node.type === "blockly");
			if (blocklyNode?.data) {
				console.log("blocklyNode", blocklyNode);
				const blocklyData = blocklyNode.data as workspaceNode["data"];
				const sessionValue = blocklyData.sessionValue;
				console.log("sessionValue", sessionValue);
				handleSourceChange(
					"source",
					`${data.editorContent}\n\nThis is example of workspace:${JSON.stringify(sessionValue.workspace)}`,
				);
			}
		}
	}, [data.editorContent, nodesData]);

	return (
		<div className="markdown-node w-full h-full flex flex-col bg-white border mdxeditor-popup-container cursor-auto rounded-xl overflow-clip">
			<span className="w-full h-4 bg-gray-300 custom-drag-handle cursor-move justify-center items-center flex gap-2">
				<span className="text-xs w-1 h-1 rounded-full bg-white" />
				<span className="text-xs w-1 h-1 rounded-full bg-white" />
				<span className="text-xs w-1 h-1 rounded-full bg-white" />
			</span>
			<Handle
				id="blockly"
				type="target"
				position={Position.Left}
				style={{ background: "orange", padding: 5, zIndex: 1000 }}
				isValidConnection={(connection) =>
					connection.sourceHandle === "blockly"
				}
			/>

			<style>
				{`
          .mdxeditor-toolbar {
            background-color: #f8f8f8;
            border-bottom: 1px solid #9ca3af;
            border-radius: 0;
          }
          .mdxeditor-root-contenteditable {
            cursor: text;
          }
          .mdxeditor-popup-container {
            z-index: 1000;
          }
        `}
			</style>
			<Handle
				id="markdown"
				type="source"
				position={Position.Right}
				style={{ background: "red", padding: 5, zIndex: 1000 }}
				isValidConnection={(connection) =>
					connection.targetHandle === "markdown"
				}
			/>

			<MDXEditor
				ref={mdxEditorRef}
				contentEditableClassName="prose cursor-text"
				markdown={data.editorContent}
				onChange={(newMarkdown) =>
					handleSourceChange("editorContent", newMarkdown)
				}
				plugins={[
					toolbarPlugin({
						toolbarContents: () => (
							<>
								<UndoRedo />
								<BoldItalicUnderlineToggles />
								<ListsToggle />
								<BlockTypeSelect />
							</>
						),
					}),
					headingsPlugin(),
					listsPlugin(),
					markdownShortcutPlugin(),
				]}
			/>
		</div>
	);
}
