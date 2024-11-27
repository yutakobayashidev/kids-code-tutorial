import { createRoute } from "@hono/zod-openapi";
import { errorResponses, jsonBody } from "../../libs/openapi.js";
import {
	getSpecificTutorialParam,
	getTutorialsSchema,
	tagsSchema,
	tutorialSchema,
} from "./schema";

const getTutorials = createRoute({
	method: "get",
	path: "/tutorials",
	summary: "Get list of tutorials (without content)",
	responses: {
		200: {
			content: jsonBody(getTutorialsSchema),
			description: "Returns the app configuration, without content",
		},
	},
});
const getSpecificTutorial = createRoute({
	method: "get",
	path: "/tutorials/:id",
	summary: "Get specific tutorial by id",
	request: {
		params: getSpecificTutorialParam.schema,
	},
	responses: {
		200: {
			content: jsonBody(tutorialSchema),
			description: "Returns the tutorial content",
		},
		...errorResponses({
			validationErrorResnponseSchemas: [getSpecificTutorialParam.vErr()],
		}),
	},
});

//タグAPIを追加

const getTags = createRoute({
	method: "get",
	path: "/tutorials/tags",
	summary: "Get list of tags from all tutorials",
	responses: {
		200: {
			content: jsonBody(tagsSchema),
			description: "Returns the list of tags from all tutorials",
		},
	},
});

export { getSpecificTutorial, getTutorials, getTags };
