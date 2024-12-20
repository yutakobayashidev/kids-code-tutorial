import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import React from "react";
import ReactDOM from "react-dom/client";
import { routeTree } from "@/routeTree.gen";
import "@/i18n/client_i18nConfig";
import "@/styles/index.css";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// Set up a Router instance
export const queryClient = new QueryClient();

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultStaleTime: 5000,
	context: {
		queryClient,
	},
});

// Register things for typesafety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}
const isDev = process.env.NODE_ENV === "development";
// デバッグモードの場合以外は、console.logを無効にする
if (!isDev) {
	console.log = () => {};
}

// biome-ignore lint/style/noNonNullAssertion: <explanation>
const rootElement = document.getElementById("root")!;

const App = () => (
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			<RouterProvider router={router} />
		</QueryClientProvider>
	</React.StrictMode>
);

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<App />);
}
// Reactアプリがレンダリングされた後にローディング画面を非表示にする
const loadingElement = document.getElementById("loading");
if (loadingElement && rootElement) {
	loadingElement.style.display = "none";
	rootElement.style.display = "block";
}
