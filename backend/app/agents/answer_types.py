from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Dict, List

from langchain_core.utils.json_schema import dereference_refs

class CustomBaseModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid"   # This will add "additionalProperties": false to the json_schema by default
    )   

    @classmethod
    def model_json_schema(cls, *args, **kwargs) -> dict[str, Any]:
        json_schema = super().model_json_schema(*args, **kwargs)
        json_schema = dereference_refs(json_schema)   # This will dereference $refs
        if "$defs" in json_schema:
            json_schema.pop("$defs", None)   # Remove $defs after dereferencing
        return json_schema
    
    
class TextAnswer(CustomBaseModel):
    """
    An answer consisting only of the answer text.
    """
    answer: str = Field(description="The answer formatted as markdown")


class SummaryAnswer(CustomBaseModel):
    """
    An answer consisting of the summary text, a label for the given target
    and a list of relevant column IDs.
    """
    answer: str = Field(description="The summary formatted as markdown")
    label: str = Field(description="The label")

    columns: List[int] = Field([], description="A list of column IDs mentioned in the answer")


class Hypothesis(CustomBaseModel):
    """
    A hypothesis and a list of evidence that supports it.
    """
    answer: str = Field(description="The answer formatted as markdown")
    evidence: List[str] = Field(description="The list of supporting evidence")


class DataComparison(CustomBaseModel):
    """
    An explanation of the comparison between the given entities and a list
    of column IDs relevant to the answer.
    """
    answer: str = Field(description="The explanation formatted as markdown")
    columns: List[int] = Field(description="The list of column IDs mentioned in the answer")


class ColumnList(CustomBaseModel):
    """
    A list of column IDs identified as relevant and an explanation for their choice.
    """
    answer: str = Field(description="The explanation formatted as markdown")
    columns: List[int] = Field(description="The list of relevant column IDs")


class ColumnWeights(CustomBaseModel):
    """
    A dictionary of column IDs with associated numerical weights and an
    explanation for their choice.
    """
    answer: str = Field(description="The explanation formatted as markdown")
    columns_weights: Dict = Field(description="A dictionary containing numerical weights for all columns using their IDs as keys")


class EDAAnswer(CustomBaseModel):
    answer: str = Field(description="The answer text formatted as markdown")

    columns: List[int] = Field([], description="A list of column IDs relevant for the answer")
    columns_weights: Dict = Field({}, description="Weights for columns by id, if necessary")

    groups: List[int] = Field([], description="A list of group IDs relevant for the answer")
    annotations: List[int] = Field([], description="A list of annotation IDs relevant for the answer")

    evidence: List[str] = Field([], description="Additional supporting evidence")

