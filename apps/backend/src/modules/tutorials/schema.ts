import { z } from "zod";
import { tags } from "../../db/schema";
import { createValidationErrorResponseSchema } from "../../libs/errors/schemas";

export const tagSchema = z.object({
	id: z.number(),
	name: z.string(),
});

export const tagsSchema = z.array(tagSchema);

export type Tag = z.infer<typeof tagSchema>;
export type Tags = z.infer<typeof tagsSchema>;

export const metadataSchema = z.object({
	title: z.string(),
	description: z.string(),
	selectCount: z.number(),
	author: z.string().optional(),
});

export type Metadata = z.infer<typeof metadataSchema>;

export const tutorialSchema = z.object({
	id: z.number(),
	content: z.string(),
	tags: tagsSchema,
	language: z.string(),
	metadata: metadataSchema,
	serializednodes: z.string(),
});

export const getTutorialsSchema = z.array(
	tutorialSchema.pick({ id: true, tags: true, language: true, metadata: true }),
);

export type Tutorial = z.infer<typeof tutorialSchema>;

export const idSchema = z.object({
	id: z.number(),
});
export const getSpecificTutorialParam = {
	schema: idSchema.openapi("GetSpecificTutorialParam"),
	vErr: () =>
		createValidationErrorResponseSchema(
			getSpecificTutorialParam.schema,
		).openapi("GetSpecificTutorialParamValidationErrorResponse"),
};
