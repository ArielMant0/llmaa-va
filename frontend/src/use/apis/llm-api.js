import { useData } from "@/stores/data";
import { useLoader } from "../loader";
import { PromptTemplate, PromptVariable } from "../prompt-template";

const LLM_API_PREFIX = "llm"

/**
 * Asks the model something without any relation to data
 * @param {String} prompt prompt send to model
 * @returns
 */
export async function llmFree(prompt) {
    const dstore = useData()
    if (!dstore.datasetId) return console.error("missing dataset id")
        
    const loader = useLoader()
    console.debug("ask/", prompt)

    return loader.post(LLM_API_PREFIX+"/ask", {
        dataset_id: dstore.datasetId,
        prompt: prompt
    })
}

/**
 * Asks the model something for a given set of data points
 * @param {String} prompt prompt send to model
 * @param {Array} targets list of target entities
 * @param {String} target_type type of all target entities
 * @returns
 */
export async function llmFreeTargets(prompt, targets, target_type) {
    const dstore = useData()
    if (!dstore.datasetId) return console.error("missing dataset id")

    const loader = useLoader()
    console.debug("ask_targets/", prompt)

    return loader.post(
        LLM_API_PREFIX+"/ask_targets",
        {
            dataset_id: dstore.datasetId,
            prompt: prompt,
            targets: targets,
            target_type: target_type
        }
    )
}

/**
 * Compare a number of data subsets to each other
 * @param {String} prompt prompt send to model
 * @param {Array} targets list of target entities
 * @param {String} target_type type of all target entities
 * @returns
 */
export async function llmDescribe(prompt, targets, target_type) {
    const dstore = useData()
    if (!dstore.datasetId) return console.error("missing dataset id")

    const loader = useLoader()
    console.debug("describe/", prompt)

    return loader.post(
        LLM_API_PREFIX+"/describe",
        {
            dataset_id: dstore.datasetId,
            prompt: prompt,
            targets: targets,
            target_type: target_type
        }
    )
}

/**
 * Compare a number of data subsets to each other
 * @param {String} prompt prompt send to model
 * @param {Array} targets list of target entities
 * @param {String} target_type type of all target entities
 * @returns
 */
export async function llmCompare(prompt, targets, target_type) {
    const dstore = useData()
    if (!dstore.datasetId) return console.error("missing dataset id")

    const loader = useLoader()
    console.debug("compare/", prompt)

    return loader.post(
        LLM_API_PREFIX+"/compare",
        {
            dataset_id: dstore.datasetId,
            prompt: prompt,
            targets: targets,
            target_type: target_type
        }
    )
}

/**
 *
 * @param {String} prompt prompt send to model
 * @param {Array} targets list of target entities
 * @param {String} target_type type of all target entities
 * @returns
 */
export async function llmExtract(prompt, targets, target_type) {
    const dstore = useData()
    if (!dstore.datasetId) return console.error("missing dataset id")

    const loader = useLoader()
    console.debug("extract/", prompt)

    return loader.post(
        LLM_API_PREFIX+"/extract",
        {
            dataset_id: dstore.datasetId,
            prompt: prompt,
            targets: targets,
            target_type: target_type
        }
    )
}

/**
 *
 * @param {String} prompt prompt send to model
 * @param {Array} targets list of target entities
 * @returns
 */
export async function llmCombine(prompt, targets) {
    const dstore = useData()
    if (!dstore.datasetId) return console.error("missing dataset id")

    const loader = useLoader()
    console.debug("combine/", prompt)

    return loader.post(
        LLM_API_PREFIX+"/combine",
        {
            dataset_id: dstore.datasetId,
            prompt: prompt,
            targets: targets,
        }
    )
}

///////////////////////////////////////////////////////////////////////////////////////
/// Default prompt templates
///////////////////////////////////////////////////////////////////////////////////////

export const SUMMARY_PROMPT = new PromptTemplate(
    "Summarize the most important characteristics of this data using no more than :limit: words.",
    [new PromptVariable("limit", 50, "integer")]
)

export const DESCRIPTION_PROMPT = new PromptTemplate(
    "Describe notable characteristics of this data using no more than :limit: words. Provide a fitting label for your insights using no more than :label: words.",
    [new PromptVariable("limit", 50, "integer"), new PromptVariable("label", 5, "integer")]
)

export const EXTRACT_PROMPT = new PromptTemplate(
    "Extract up to :number: columns for which the data subset could be described as :keyword: compared to the global dataset. Explain what makes them :keyword: using no more than :limit: words.",
    [new PromptVariable("number", 3, "integer"), new PromptVariable("keyword", "different"), new PromptVariable("limit", 100, "integer")]
)

export const COMPARE_PROMPT = new PromptTemplate(
    "Compare the the following data subsets, focus on :keyword:. Explain your choice using no more than :limit: words.",
    [new PromptVariable("keyword", "differences"), new PromptVariable("limit", 100, "integer")]
)

export const COMBINE_PROMPT = new PromptTemplate(
    "Provide a weighted linear combination of the following columns to indicate :keyword:. Explain your choice using no more than :limit: words.",
    [new PromptVariable("keyword", "healthy cereal options"), new PromptVariable("limit", 100, "integer")]
)

export const REFINE_PROMPT = new PromptTemplate(
    "Improve the given text, aiming for :keyword:. Use no more than :limit: words.",
    [new PromptVariable("keyword", "clear and concise writing"), new PromptVariable("limit", 100, "integer")]
)

export const EXPLAIN_PROMPT = new PromptTemplate(
    "Explain the given text more thoroughly, provide evidence or examples where possible. Use no more than :limit: words.",
    [new PromptVariable("keyword", "clear and concise writing"), new PromptVariable("limit", 200, "integer")]
)