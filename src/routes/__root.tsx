import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import "../styles.css";

export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: () => {
		return (
			<main className="w-full min-h-screen flex flex-col items-center justify-center gap-4">
				<h1 className="text-8xl">404</h1>
				<p className="text-3xl">Page Not Found</p>
				<Link to="/" className="text-xl">
					→<span className="underline">Back</span>
				</Link>
			</main>
		);
	},
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<Outlet />
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "TanStack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
		</>
	);
}
