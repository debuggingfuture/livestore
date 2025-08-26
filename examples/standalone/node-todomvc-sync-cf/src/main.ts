import process from "node:process";
import { makeAdapter } from "@livestore/adapter-node";
import { createStorePromise, queryDb } from "@livestore/livestore";
import { makeCfSync } from "@livestore/sync-cf";
import { events, schema, tables } from "./livestore/schema.ts";

const main = async () => {
	const adapter = makeAdapter({
		storage: { type: "fs", baseDirectory: "tmp" },
		sync: {
			backend: makeCfSync({ url: "ws://localhost:8787" }),
			onSyncError: "shutdown",
		},
	});

	const store = await createStorePromise({
		adapter,
		schema,
		storeId: process.env.STORE_ID ?? "test",
		syncPayload: { authToken: "insecure-token-change-me" },
	});

		// Work as expected
	store.subscribe(queryDb(tables.todos), {
		skipInitialRun: false,
		onUpdate: (todos) => {
			const todo = todos[todos.length - 1];
			console.log("onUpdate skipInitialRun=false", todos);
		},
	});

	// Never fired
	store.subscribe(queryDb(tables.todos), {
		skipInitialRun: true,
		onUpdate: (todos) => {
			const todo = todos[todos.length - 1];
			console.log("onUpdate skipInitialRun=true", todos);
		},
	});



	setInterval(() => {
		store.commit(
			events.todoCreated({
				id: crypto.randomUUID(),
				text: "Task created from node-adapter",
			}),
		);
	}, 1000);

	// wait for syncing to be complete

	await new Promise((resolve) => setTimeout(resolve, 10 * 1000));

	await store.shutdown();
};

main().catch(console.error);
