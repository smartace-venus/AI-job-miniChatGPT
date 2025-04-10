import 'server-only';
import { generateObject } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const contentAnalysisSchema = z.object({
  preliminary_answer_1: z
    .string()
    .describe(
      'Generate a preliminary answer based on the provided text context. The answer should be a concise, informative response that addresses the specifics of the context under consideration.'
    ),
  preliminary_answer_2: z
    .string()
    .describe(
      'Generate a second preliminary answer focused on practical applications or implications of the content.'
    ),
  tags: z
    .array(z.string())
    .describe(
      'Extract key topics, concepts, and themes as tags for better searchability.'
    ),
  hypothetical_question_1: z
    .string()
    .describe(
      'Generate an analytical question that explores deeper implications of the content.'
    ),
  hypothetical_question_2: z
    .string()
    .describe(
      'Generate a practical question about real-world applications of the content.'
    )
});

const documentMetadataSchema = z.object({
  descriptiveTitle: z
    .string()
    .describe('Generate a clear, descriptive title that captures the main topic.'),
  shortDescription: z
    .string()
    .describe('Provide a concise summary of key points and significance.'),
  mainTopics: z
    .array(z.string())
    .describe('Extract 3-5 main topics or themes.'),
  keyEntities: z
    .array(z.string())
    .describe('Identify important entities mentioned.'),
  primaryLanguage: z
    .string()
    .describe('Detect the primary language of the content.')
});

export const preliminaryAnswerChainAgent = async (
  content: string,
  userId: string
) => {
  const SystemPrompt =
    'Analyze the provided content thoroughly. Generate focused insights and identify key concepts. Use clear, precise language.';

  const { object, usage } = await generateObject({
    model: openai('gpt-4'),
    system: SystemPrompt,
    prompt: content,
    schema: contentAnalysisSchema,
    mode: 'json',
    abortSignal: AbortSignal.timeout(15000),
    temperature: 0,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'upload_doc_preliminary',
      metadata: { userId },
      recordInputs: true,
      recordOutputs: true
    }
  });

  return { object, usage };
};

export const generateDocumentMetadata = async (
  content: string,
  userId: string
) => {
  const SystemPrompt = `
  Extract key metadata from the document to enhance searchability and context understanding.
  Focus on clear, descriptive information that will aid in document retrieval and comprehension.
  `;

  const { object, usage, finishReason } = await generateObject({
    model: openai('gpt-4'),
    system: SystemPrompt,
    prompt: content,
    schema: documentMetadataSchema,
    mode: 'json',
    temperature: 0,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'upload_doc_main',
      metadata: { userId },
      recordInputs: true,
      recordOutputs: true
    }
  });

  return { object, usage, finishReason };
};