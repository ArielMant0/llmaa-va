import config

import app.agents.eda_agent as agent
from app.agents.answer_types import (
    ColumnList,
    ColumnWeights,
    DataComparison,
    SummaryAnswer,
    TextAnswer,
)
from flask import Blueprint, jsonify, request, Response

llm_bp = Blueprint("llm", __name__)

@llm_bp.post('/ask')
def ask() -> Response:
    if config.USE_DUMMY_DATA:
        return jsonify(TextAnswer(answer="prompt answer"))

    return jsonify(agent.ask_model(
        request.json["dataset_id"],
        request.json["prompt"]
    ))


@llm_bp.post('/ask_targets')
def ask_with_targets() -> Response:
    if config.USE_DUMMY_DATA:
        return jsonify(TextAnswer(answer="prompt with targets answer"))

    return jsonify(agent.ask_model_with_targets(
        request.json["dataset_id"],
        request.json["prompt"],
        request.json["targets"],
        request.json["target_type"],
    ))


@llm_bp.post('/describe')
def describe() -> Response:
    if config.USE_DUMMY_DATA:
        return jsonify(SummaryAnswer(answer="prompt with targets answer", label="a label"))

    return jsonify(agent.ask_model_with_targets(
        request.json["dataset_id"],
        request.json["prompt"],
        request.json["targets"],
        request.json["target_type"],
        SummaryAnswer
    ))


@llm_bp.post('/extract')
def extract() -> Response:
    if config.USE_DUMMY_DATA:
        return jsonify(ColumnList(
            answer="prompt with targets answer",
            columns=["potassium", "protein"],
        ))

    return jsonify(agent.extract(
        request.json["dataset_id"],
        request.json["prompt"],
        request.json["targets"],
        request.json["target_type"],
    ))


@llm_bp.post('/combine')
def combine() -> Response:
    if config.USE_DUMMY_DATA:
        return jsonify(ColumnWeights(
            explanation="prompt with targets answer",
            weights={ "sugars": 0.33, "protein": 0.66 }
        ))

    return jsonify(agent.combine(
        request.json["dataset_id"],
        request.json["prompt"],
        request.json["targets"]
    ))


@llm_bp.post('/compare')
def compare() -> Response:
    if config.USE_DUMMY_DATA:
        return jsonify(DataComparison(
            explanation="comparison explanation",
            columns=["vitamins & minerals"]
        ))

    return jsonify(agent.compare(
        request.json["dataset_id"],
        request.json["prompt"],
        request.json["targets"],
        request.json["target_type"],
    ))