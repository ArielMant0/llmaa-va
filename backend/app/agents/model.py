
from app.agents.answer_types import (
    DataComparison,
    ColumnList,
    ColumnWeights,
    EDAAnswer,
    Hypothesis,
    SummaryAnswer,
    TextAnswer
)
import config

from langchain_openai import ChatOpenAI
from langchain_core.prompts.chat import ChatPromptTemplate

llm = ChatOpenAI(
    model="gpt-5.4-mini",
    temperature=0.0,
    api_key=config.OPENAI_API_KEY
)

# Explains your findings. Be concise and avoid overly wordy explanations.
#
# Rules:
# - Use LIMIT 25 unless aggregating.
# - Prefer aggregations for analysis.

sys_prompt = """
You are an assistant for exploratory data analysis of tabular data for the dataset identified by the following id: {dataset_id}

Use tools if necessary to answers the user's question about the data and other entities like annotations.
All relevant data is stored in a PostgreSQL database which can be accessed with provided tools.

Explains your findings. Be concise and avoid overly wordy explanations.
"""

struc_prompt = """
Convert the results into the specified structured output.
{instruction}

Results:
{analysis}
"""


def make_prompt(question: str):
    return ChatPromptTemplate([
        ("system", sys_prompt),
        ("human", question)
    ])


def make_structure_prompt(question: str):
    return ChatPromptTemplate([
        ("system", struc_prompt),
        ("human", question)
    ])


def make_structure_instruction(answer_type):

    if answer_type == EDAAnswer:
        return "Include ids for all entities (columns, datapoints, annotations) relevant to your answer as lists per entity type."
    elif answer_type == SummaryAnswer:
        return "Include a list of relevant column ids."
    elif answer_type == DataComparison:
        return "Include a list of relevant column ids."
    elif answer_type == ColumnList:
        return "Include column ids for the extracted columns as a list."
    elif answer_type == ColumnWeights:
        return """
Convert the results into a dictionary with the explanation included via the key 'answer' and include the weights per column id (given as a list)
as a dictionary with the name 'columns_weights', where column ids are the keys and weights are the values.
"""
    
    return ""
