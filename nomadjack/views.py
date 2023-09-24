# -*- coding: utf-8 -*-
"""
Handles views and routing.
"""

from typing import Optional

from flask import render_template, request
from flask_parameter_validation import Json, ValidateParameters

from . import blueprint, multi_auth, service


@blueprint.route("/", methods=["GET"])
@multi_auth.login_required()
def home():
    """Render webpage for the root path."""
    return render_template("index.html")


@blueprint.route("/run", methods=["POST"])
@multi_auth.login_required()
@ValidateParameters()
def run_script(
    task: str = Json(),
    script: str = Json(),
    command: Optional[str] = Json(),
    filepath: Optional[str] = Json(),
    fileperms: Optional[str] = Json(),
    delete_after_exec: Optional[bool] = Json(),
    override_file: Optional[bool] = Json(),
    user: Optional[str] = Json(),
    workdir: Optional[str] = Json(),
    environment: Optional[str] = Json(),
):
    """Run the script from the form data."""
    return service.execute_script(form_data=request.json)
