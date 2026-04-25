from langchain_core.messages import AnyMessage
from typing_extensions import TypedDict, Annotated
import operator

class EDAState(TypedDict):

    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int
    tool_calls: int

    structured_answer: dict