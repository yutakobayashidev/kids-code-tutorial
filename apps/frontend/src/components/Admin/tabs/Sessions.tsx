import { useEffect, useState } from "react";
import type { SessionValue } from "../../../type.js";
import { langToStr } from "../../../utils/langToStr.js";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	Bot,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	ChevronUp,
	Clock,
	LoaderCircle,
	MessageCircleMore,
	Play,
	Puzzle,
} from "lucide-react";
import Popup from "../../ui/Popup.js";
import { msToTime, timeAgo } from "../../../utils/time.js";
import { SessionValueView } from "../../SessionValueView/index.js";
import { deleteSession, downloadAllSessions } from "@/api/admin/session.js";
import { type Pagination, useListSessions } from "@/hooks/admin/session.js";
import { useMutation } from "@tanstack/react-query";

export default function Sessions() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [autoUpdateMs, setAutoUpdateMs] = useState<number | false>(5000);
	const [popupSessionFromCode, setPopupSessionFromCode] = useState<
		string | null
	>(null);
	const [pagination, setPagination] = useState<Pagination>({
		page: 1,
		pageSize: 10,
		sortField: "updatedAt",
		sortOrder: "desc",
	});
	const [totalSessions, setTotalSessions] = useState(0);
	const [downloading, setDownloading] = useState(false);

	const { sessions } = useListSessions(pagination, setLoading, autoUpdateMs);

	const { mutate: del } = useMutation({
		mutationFn: deleteSession,
		onSuccess: () => {
			alert("Session deleted successfully");
		},
		onError: (error) => {
			alert("Failed to delete session");
			console.error("Failed to delete session:", error);
		},
	});

	useEffect(() => {
		if (!loading) {
			const timer = setTimeout(() => setLoading(false), 1000); // 1秒後にローディングスピナーを非表示
			return () => clearTimeout(timer); // クリーンアップ
		}
	}, [loading]);

	const handleDeleteSession = (key: string) => {
		del({ sessionCode: key });
	};

	const handleDownloadAllSession = () => {
		setDownloading(true);
		downloadAllSessions().then((value) => {
			const blob = new Blob([JSON.stringify(value)], {
				type: "application/json",
			});
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `download-${new Date().toISOString()}.json`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setDownloading(false);
		});
	};

	const handleStatsPopup = (code: string) => {
		setPopupSessionFromCode(code);
	};

	const handleClosePopup = () => {
		setPopupSessionFromCode(null);
	};

	const handleSort = (field: keyof SessionValue) => {
		if (pagination.sortField === field) {
			setPagination((prev) => ({
				...prev,
				sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
			}));
		} else {
			setPagination((prev) => ({
				...prev,
				sortField: field,
				sortOrder: "asc",
			}));
		}
	};

	const PopupContent = popupSessionFromCode ? (
		<SessionValueView session={popupSessionFromCode} />
	) : (
		<div>Session not found</div>
	);

	const columns: ColumnDef<SessionValue>[] = [
		{
			header: "Session Code",
			accessorKey: "sessioncode",
			cell: ({ row }) => {
				return (
					<div
						className={`text-base font-semibold flex ${
							row.original?.clients?.[0]
								? "text-green-700 font-bold"
								: "text-black"
						}`}
					>
						{row.original.sessioncode}
						{row.original?.clients?.[0] ? (
							<span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
						) : null}
						<span className="text-xs">{row.original?.clients?.length}</span>
					</div>
				);
			},
		},
		{
			header: "Session Language",
			accessorKey: "language",
			cell: ({ row }) => {
				return <div>{langToStr(row.original.language || "unknown")}</div>;
			},
		},
		{
			header: "Created at",
			accessorKey: "createdAt",
			cell: ({ row }) => {
				return (
					<>
						<p className="font-semibold text-sm">
							{row.original.createdAt ? timeAgo(row.original.createdAt) : "N/A"}
						</p>
						<p className="font-medium text-xs text-gray-600">
							{row.original.createdAt
								? row.original.createdAt.toString()
								: "N/A"}
						</p>
					</>
				);
			},
		},
		{
			header: "Last Update",
			accessorKey: "updatedAt",
			cell: ({ row }) => (
				<>
					<p className="font-semibold text-sm">
						{row.original.updatedAt ? timeAgo(row.original.updatedAt) : "N/A"}
					</p>
					<p className="font-medium text-xs text-gray-600">
						{row.original.updatedAt ? row.original.updatedAt.toString() : "N/A"}
					</p>
				</>
			),
		},
		{
			header: "Stats",
			accessorKey: "stats",
			cell: ({ row }) => (
				<>
					<p className="font-medium text-xs text-gray-600 flex gap-1">
						<Bot className="w-4 h-4" />
						{row.original.stats ? row.original.stats.totalInvokedLLM : 0}
					</p>
					<p className="font-medium text-xs text-gray-600 flex gap-1">
						<Puzzle className="w-4 h-4" />
						{row.original.stats ? row.original.stats.currentNumOfBlocks : 0}
					</p>
					<p className="font-medium text-xs text-gray-600 flex gap-1 flex-nowrap">
						<Clock className="w-4 h-4" />
						{row.original.stats
							? msToTime(row.original.stats.totalConnectingTime)
							: 0}
					</p>
					<p className="font-medium text-xs text-gray-600 flex gap-1">
						<MessageCircleMore className="w-4 h-4" />
						{row.original.stats ? row.original.stats.totalUserMessages : 0}
					</p>
					<p className="font-medium text-xs text-gray-600 flex gap-1">
						<Play className="w-4 h-4" />
						{row.original.stats ? row.original.stats.totalCodeExecutions : 0}
					</p>
				</>
			),
		},
		{
			header: "Actions",
			accessorKey: "actions",
			cell: ({ row }) => (
				<span className="flex gap-2">
					<a
						href={`/${row.original.sessioncode}`}
						className="p-1.5 rounded-full bg-sky-500 px-2 font-semibold text-white hover:bg-sky-600"
					>
						Open
					</a>
					<button
						type="button"
						className="p-1.5 rounded-full bg-orange-500 px-2 font-semibold text-white hover:bg-orange-600"
						onClick={() => handleStatsPopup(row.original.sessioncode)}
					>
						Stats
					</button>
					<button
						type="button"
						className="p-1.5 rounded-full bg-red-500 px-2 font-semibold text-white hover:bg-red-600"
						onClick={() => handleDeleteSession(row.original.sessioncode)}
					>
						Delete
					</button>
				</span>
			),
		},
	];

	const table = useReactTable<SessionValue>({
		columns,
		data: sessions?.sessions || [],
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		initialState: {
			sorting: [{ id: "updatedAt", desc: true }],
		},
	});

	if (error) {
		alert(error);
		setError(null); // エラーをリセットして表示を続行
	}

	return (
		<div className="w-full h-full overflow-auto bg-gray-300 rounded-2xl">
			<Popup
				openState={popupSessionFromCode !== null}
				onClose={handleClosePopup}
				Content={PopupContent}
			/>
			<div className="flex justify-between p-4">
				<h2 className="text-2xl font-semibold">Sessions</h2>
				{loading && (
					<span className="text-gray-600 absolute top-5 right-5 animate-spin ">
						<LoaderCircle />
					</span>
				)}{" "}
				<div className="flex flex-col justify-center items-center gap-2">
					<label className="flex items-center gap-2">
						<input
							type="checkbox"
							checked={typeof autoUpdateMs === "number"}
							onChange={() => setAutoUpdateMs(!autoUpdateMs ? 5000 : false)}
							className="form-checkbox h-4 w-4"
						/>
						<span>Auto Update</span>
					</label>
					<button
						type="button"
						className="p-1 text-xs rounded-full text-blue-500 font-semibold"
						onClick={handleDownloadAllSession}
						disabled={downloading}
					>
						{downloading ? "Downloading..." : "Download All Sessions"}
					</button>
				</div>
			</div>
			<div className="overflow--auto">
				<table className="w-full text-left text-sm ">
					<thead className="font-semibold border-b-2 border-gray-300">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<th
										key={header.id}
										className="px-6 py-4 cursor-pointer"
										onClick={() =>
											handleSort(header.column.id as keyof SessionValue)
										}
										onKeyUp={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												handleSort(header.column.id as keyof SessionValue);
											}
										}}
									>
										{flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
										{pagination.sortField === header.column.id ? (
											pagination.sortOrder === "desc" ? (
												<ChevronDown />
											) : (
												<ChevronUp />
											)
										) : (
											""
										)}
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody className="gap-2">
						{table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className="border-y-2 border-gray-300 rounded-2xl bg-gray-200 animate-fade-in"
								>
									{row.getVisibleCells().map((cell) => (
										<td key={cell.id} className="px-6 py-4">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									))}
								</tr>
							))
						) : (
							<tr
								key={0}
								className="border-y-2 border-gray-300 rounded-2xl bg-gray-200"
							>
								<td
									colSpan={columns.length}
									className="w-full text-xl font-semibold text-center py-4"
								>
									No Session on this server...
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			<div className="flex p-2 justify-center items-center gap-2 bg-gray-300 shadow">
				<button
					type="button"
					className={`p-2 rounded-full font-semibold text-white ${
						pagination.page === 1 ? "bg-gray-400" : "bg-sky-500"
					}`}
					// onClick={() => setPage(1)}
					onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
					disabled={pagination.page === 1}
				>
					<ChevronsLeft />
				</button>
				<button
					type="button"
					className={`p-2 rounded-full font-semibold text-white ${
						pagination.page === 1 ? "bg-gray-400" : "bg-sky-500"
					}`}
					// onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
					onClick={() =>
						setPagination((prev) => ({
							...prev,
							page: Math.max(prev.page - 1, 1),
						}))
					}
					disabled={pagination.page === 1}
				>
					<ChevronLeft />
				</button>
				<button
					type="button"
					className={`p-2 rounded-full font-semibold text-white ${
						pagination.page * pagination.pageSize >= totalSessions
							? "bg-gray-400"
							: "bg-sky-500"
					}`}
					// onClick={() => setPage((prev) => prev + 1)}
					onClick={() =>
						setPagination((prev) => ({
							...prev,
							page: Math.min(
								prev.page + 1,
								Math.ceil(totalSessions / pagination.pageSize),
							),
						}))
					}
					disabled={pagination.page * pagination.pageSize >= totalSessions}
				>
					<ChevronRight />
				</button>
				<button
					type="button"
					className={`p-2 rounded-full font-semibold text-white ${
						pagination.page * pagination.pageSize >= totalSessions
							? "bg-gray-400"
							: "bg-sky-500"
					}`}
					// onClick={() => setPage(Math.ceil(totalSessions / pagination.pageSize))}
					onClick={() =>
						setPagination((prev) => ({
							...prev,
							page: Math.ceil(totalSessions / pagination.pageSize),
						}))
					}
					disabled={pagination.page * pagination.pageSize >= totalSessions}
				>
					<ChevronsRight />
				</button>

				<select
					className="p-2 rounded-full bg-white text-gray-800 font-semibold"
					value={pagination.pageSize}
					onChange={(e) => {
						// setPageSize(Number(e.target.value));
						// setPage(1); // Reset to first page when page size changes
						setPagination((prev) => ({
							...prev,
							pageSize: Number(e.target.value),
							page: 1,
						}));
					}}
				>
					{[10, 20, 30, 40, 50].map((size) => (
						<option key={size} value={size}>
							{size}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
