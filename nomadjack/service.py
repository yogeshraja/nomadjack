# -*- coding: utf-8 -*-

import json

from flask import jsonify, make_response

from . import defaults, docker_utils


def execute_script(form_data):
    data = defaults.run_form_defaults | form_data
    data["environment"] = json.loads(data["environment"])
    result = docker_utils.run_command_in_container(**data)
    resp = {"exit_code": result["exit_code"], "output": result["output"]}
    response = make_response(jsonify(resp))
    response.status_code = result["response_code"]
    return response
