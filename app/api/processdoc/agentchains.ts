import 'server-only';
import { embed, generateObject } from 'ai';
import { voyage } from 'voyage-ai-provider';
import { z } from 'zod';

const contentAnalysisSchema = z.object({
  preliminary_answer_1: z
    .string()
    .describe(
      'Generate a preliminary answer based on the provided text context. The answer should be a concise, informative response that addresses the specifics of the context under consideration. Responses must be tailored to provide clear, preliminary insights or guidance relevant to the presented scenario.'
    ),
  preliminary_answer_2: z
    .string()
    .describe(
      'Generate a second preliminary answer based on the provided text context. The answer should be a concise, informative response that addresses the specifics of the context under consideration. Responses must be tailored to provide clear, preliminary insights or guidance relevant to the presented scenario.'
    ),
  tags: z
    .array(z.string())
    .describe(
      'Identify and tag key concepts or topics within the provided text for categorization and indexing purposes. Each tag in the array represents a specific topic, theme, or concept found within the text, ensuring they accurately reflect the nuances and specifics of the subject matter being addressed.'
    ),
  hypothetical_question_1: z
    .string()
    .describe(
      'Generate a hypothetical question based on the provided text. The question should explore possible scenarios, implications, or considerations that arise from the content. Questions aim to provoke thought, analysis, or discussion on potential outcomes or interpretations.'
    ),
  hypothetical_question_2: z
    .string()
    .describe(
      'Generate a second hypothetical question based on the provided text. The question should explore possible scenarios, implications, or considerations that arise from the content. Questions aim to provoke thought, analysis, or discussion on potential outcomes or interpretations.'
    )
});

export const preliminaryAnswerChainAgent = async (
  content: string,
  userId: string
) => {
  const SystemPrompt =
    'Given the content provided below, perform a comprehensive analysis. Generate two preliminary answers, tag key concepts or topics, and generate two hypothetical questions. Ensure all outputs address specific elements mentioned in the text. Focus on interpreting key themes, implications of specific concepts, and potential real-life applications or consequences. Answers and questions should be detailed and thought-provoking. The output language should be in the same as the input text.';

  const { object, usage } = await generateObject({
    model: openai('gpt-4o-mini'), //This line still needs to be addressed to remove OpenAI dependency.
    system: SystemPrompt,
    prompt: content,
    schema: contentAnalysisSchema,
    mode: 'json',
    abortSignal: AbortSignal.timeout(15000),
    temperature: 0,
    experimental_telemetry: {
      isEnabled: true,
      functionId: 'upload_doc_preliminary',
      metadata: {
        userId
      },
      recordInputs: true,
      recordOutputs: true
    }
  });

  return { object, usage };
};

const embeddingModel = voyage.textEmbeddingModel('voyage-3-large', {
  apiKey: process.env.VOYAGE_API_KEY,
  inputType: 'document',
  truncation: false,
  outputDimension: 1024,
  outputDtype: 'int8'
});

export const generateDocumentMetadata = async (
  content: string,
  userId: string
) => {
  // Extract basic metadata without LLM
  const title = content.split('\n')[0].substring(0, 100) || 'Untitled Document';
  const description = content.substring(0, 200) + '...';

  // Generate embedding using Voyage
  const { embedding } = await embed({
    model: embeddingModel,
    value: content
  });

  return {
    object: {
      descriptiveTitle: title,
      shortDescription: description,
      mainTopics: [],
      keyEntities: [],
      primaryLanguage: 'en'
    },
    embedding
  };
};