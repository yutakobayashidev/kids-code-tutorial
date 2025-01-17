import * as Blockly from "blockly/core";
import { useEffect, useRef } from "react";

import registerBlocks from "@/components/common/Blockly/blocks";
import Theme from "@/components/common/Blockly/theme";
import {
	toolboxCategories,
	translateCategories,
} from "@/components/common/Blockly/toolbox";
import "@/styles/blockly.css";
import { BlockHighlight } from "@/components/common/Blockly/blockHighlight";
import {
	blockNameFromMenuState,
	currentSessionState,
	highlightedBlockState,
	prevSessionState,
} from "@/state.js";
import { useAtom, useAtomValue } from "jotai";

import { blocklyLocale } from "@/i18n/blocklyLocale.js";
import { updateStats } from "@/utils/statsUpdater.js";
import { forwardRef } from "react";

const Editor = forwardRef<
	HTMLDivElement,
	{ menuOpen: boolean; language: string; isConnecting: boolean }
>((props, ref) => {
	const [currentSession, setCurrentSession] = useAtom(currentSessionState);
	const prevSession = useAtomValue(prevSessionState);
	const [blockNameFromMenu, setBlockNameFromMenu] = useAtom(
		blockNameFromMenuState,
	);
	const [highlightedBlock, setHighlightedBlock] = useAtom(
		highlightedBlockState,
	);

	const blockHighlightRef = useRef<BlockHighlight | null>(null);

	useEffect(() => {
		const language = props.language;

		if (language && blocklyLocale[language]) {
			Blockly.setLocale(blocklyLocale[language]);
		} else {
			Blockly.setLocale(blocklyLocale.en);
		}

		async function getWorkspace() {
			const workspaceArea = document.getElementById("workspaceArea");
			if (workspaceArea) {
				const resizeObserver = new ResizeObserver(() => {
					onResize();
				});
				resizeObserver.observe(workspaceArea);
			}

			function onResize() {
				const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
				Blockly.svgResize(workspace);
			}
		}

		getWorkspace();
		registerBlocks(language as string);
		translateCategories(language as string);

		const workspace = Blockly.inject("blocklyDiv", {
			toolbox: toolboxCategories,
			theme: Theme,
			renderer: "zelos",
			media: "/",
			zoom: {
				controls: true,
				wheel: true,
				startScale: 1.0,
				maxScale: 3,
				minScale: 0.3,
				scaleSpeed: 1.2,
			},
			trashcan: false,
			move: {
				scrollbars: true,
				drag: true,
				wheel: true,
			},
			grid: {
				spacing: 20,
				length: 3,
				colour: "#ccc",
				snap: true,
			},
		});

		if (currentSession?.workspace) {
			Blockly.serialization.workspaces.load(
				currentSession.workspace,
				workspace,
			);
		}
		workspace.addChangeListener(Blockly.Events.disableOrphans);

		const toolbox = workspace.getToolbox() as Blockly.Toolbox;

		//ハイライトするツールボックスの項目がある場合、そのメニュー項目をハイライトする
		const toolboxItem = toolbox.getToolboxItems();
		// カテゴリとその親カテゴリをハイライトする関数
		function highlightCategory(category: Blockly.ToolboxCategory) {
			const div = category.getDiv();
			const labelDOM = div?.getElementsByClassName(
				"blocklyTreeRow",
			)[0] as HTMLElement;
			if (labelDOM) {
				labelDOM.style.backgroundColor = "#ef4444";
				labelDOM.classList.add("highlight"); // highlightはCSSファイル内で定義されている
			}
		}
		//最上位の階層まで全てハイライトする関数
		function highlightParentCategory(category: Blockly.ToolboxCategory) {
			let parent = category.getParent();
			while (parent) {
				const parentCategory = parent as Blockly.CollapsibleToolboxCategory;
				parent = parentCategory.getParent();
				highlightCategory(parentCategory);
				highlightParentCategory(parentCategory);
			}
		}
		function highlightBlockInToolbox() {
			for (const item of toolboxItem) {
				if (item.isSelectable()) {
					const category = item as
						| Blockly.ToolboxCategory
						| Blockly.CollapsibleToolboxCategory;

					const contents = category.getContents();
					if (
						typeof contents !== "string" &&
						blockNameFromMenu &&
						containsBlockType(contents, blockNameFromMenu)
					) {
						// カテゴリ名が一致する場合、そのカテゴリの色を変更する
						highlightCategory(category);
					}
				}
				if (item.isCollapsible()) {
					const category = item as Blockly.CollapsibleToolboxCategory;
					// 子アイテムを取得
					const children = category.getChildToolboxItems();
					for (const child of children) {
						const item = child as Blockly.ToolboxCategory;
						const contents = item.getContents();
						if (
							typeof contents !== "string" &&
							blockNameFromMenu &&
							containsBlockType(contents, blockNameFromMenu)
						) {
							// カテゴリ名が一致する場合、そのカテゴリの色を変更する
							highlightCategory(item);
							// 親カテゴリの色も変更する
							highlightParentCategory(item);
						}
					}
					const contents = category.getContents();
					if (
						typeof contents !== "string" &&
						blockNameFromMenu &&
						containsBlockType(contents, blockNameFromMenu)
					) {
						// カテゴリ名が一致する場合、そのカテゴリの色を変更する
						highlightCategory(category);
					}
				}
			}
		}

		function containsBlockType(
			contents: Blockly.utils.toolbox.FlyoutItemInfoArray,
			blockType: string,
		): boolean {
			for (const content of contents) {
				// content がブロックであり、type プロパティを持つ場合をチェック
				if (
					content.kind === "block" &&
					"type" in content &&
					content.type === blockType
				) {
					return true;
				}
			}
			return false;
		}

		highlightBlockInToolbox();

		const saveWorkspace = (event: Blockly.Events.Abstract) => {
			try {
				if (
					event.type === Blockly.Events.CHANGE ||
					event.type === Blockly.Events.DELETE ||
					event.type === Blockly.Events.FINISHED_LOADING ||
					event.type === Blockly.Events.MOVE
				) {
					if (event.type === Blockly.Events.MOVE) {
						const moveEvent = event as Blockly.Events.BlockMove;
						if (Array.isArray(moveEvent.reason)) {
							if (moveEvent.reason.includes("disconnect")) {
								return;
							}
						}
					}

					const newWorkspace = Blockly.serialization.workspaces.save(workspace);
					setCurrentSession((prev) => {
						if (
							prev &&
							JSON.stringify(prev.workspace) !== JSON.stringify(newWorkspace)
						) {
							return {
								...prev,
								workspace: newWorkspace,
								stats: updateStats(
									{
										currentNumOfBlocks: workspace.getAllBlocks().length,
									},
									prev,
								).stats,
							};
						}
						return prev;
					});
				}
				if (event.type === Blockly.Events.TOOLBOX_ITEM_SELECT) {
					//カテゴリを開いている際に、Stateからツールボックス内の探す必要のあるブロックがある場合は、そのブロックを探し、ツールボックス内のワークスペースでハイライトする
					if (
						blockNameFromMenu &&
						toolbox.getSelectedItem() !== null &&
						toolbox.getSelectedItem() !== undefined
					) {
						try {
							const flyout = toolbox.getFlyout();
							const workspace = flyout?.getWorkspace();
							const block = workspace?.getBlocksByType(blockNameFromMenu);

							if (block && block.length > 0 && workspace) {
								//ハイライトする
								setHighlightedBlock({
									workspace: workspace,
									blockId: block[0].id,
								});
							}
							//ブロックが存在しない場合は、空のidからハイライトする
							if (block && block.length === 0 && workspace) {
								setHighlightedBlock({
									workspace: workspace,
									blockId: "",
								});
							}
						} catch {
							return null;
						}
					}
					//カテゴリを閉じた場合は、ハイライトを解除する
					if (toolbox.getFlyout()?.isVisible() === false) {
						setHighlightedBlock(null);
					}
				}
				//メニューから指定したブロックが移動された場合、ハイライトを解除する
				if (event.type === Blockly.Events.MOVE) {
					const moveEvent = event as Blockly.Events.BlockMove;
					const toolbox = workspace.getToolbox() as Blockly.Toolbox;
					const toolWorkspace = toolbox.getFlyout()?.getWorkspace();
					if (!toolWorkspace || !blockNameFromMenu) {
						return;
					}
					const block = toolWorkspace.getBlocksByType(blockNameFromMenu);
					if (moveEvent?.blockId === block[0]?.id) {
						setBlockNameFromMenu(null);
					}
				}
			} catch (error) {
				console.error("Error in saveWorkspace:", error);
			}
		};

		workspace.addChangeListener(saveWorkspace);

		return () => {
			workspace.dispose();
		};
	}, [blockNameFromMenu]);

	//ツールボックスを非表示/表示する
	useEffect(() => {
		const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
		if (workspace) {
			workspace.getToolbox()?.setVisible(props.menuOpen);
			workspace.getToolbox()?.getFlyout()?.setVisible(props.menuOpen);
		}
	}, [props.menuOpen]);

	useEffect(() => {
		const workspace = Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;

		if (currentSession && prevSession) {
			try {
				Blockly.serialization.workspaces.load(
					currentSession.workspace || {},
					workspace,
				);
				//ハイライトを解除する
				setHighlightedBlock(null);
			} catch (error) {
				console.error("Failed to load the workspace:", error);
			}
		}
	}, [currentSession, prevSession]);

	// ハイライトされたブロックを更新。１つ以上ハイライトはできない。
	useEffect(() => {
		if (blockHighlightRef.current) {
			blockHighlightRef.current.dispose();
		}

		if (highlightedBlock) {
			const currentWorkspace =
				Blockly.getMainWorkspace() as Blockly.WorkspaceSvg;
			blockHighlightRef.current = new BlockHighlight(
				highlightedBlock.workspace || currentWorkspace,
			);
			blockHighlightRef.current.init(10, highlightedBlock.blockId);
		} else {
			blockHighlightRef.current = null;
		}
	}, [highlightedBlock]);

	return <div ref={ref} id="blocklyDiv" className="w-full h-full relative" />;
});

export default Editor;
