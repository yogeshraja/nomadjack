# -*- coding: utf-8 -*-
"""
NomadJack Flask Blueprint.
"""

import os

from flask import Blueprint, abort, current_app, g
from flask_httpauth import HTTPBasicAuth, HTTPTokenAuth, MultiAuth

from . import __pkginfo__, default_config

__title__ = __pkginfo__.title
__version__ = __pkginfo__.version
__author__ = __pkginfo__.author
__email__ = __pkginfo__.email
__uri__ = __pkginfo__.uri
__github__ = __pkginfo__.github
__description__ = __pkginfo__.description
__license__ = __pkginfo__.license
__copyright__ = __pkginfo__.copyright
__status__ = __pkginfo__.status

basic_auth = HTTPBasicAuth()
token_auth = HTTPTokenAuth(scheme="Bearer")
multi_auth = MultiAuth(basic_auth, token_auth)

blueprint = Blueprint(
    "nomadjack",
    __name__,
    static_folder="static",
    template_folder="templates",
)


@blueprint.url_value_preprocessor
def local_relpath_url(endpoint, values):
    if endpoint != "nomadjack.static":
        local_path = current_app.config.get("NOMADJACK_LOCAL_DIR")
        if not (local_path and os.path.isdir(local_path)):
            abort(500, "`NOMADJACK_LOCAL_DIR` is not a valid directory path")
        else:
            g.nomadjack_local_path = os.path.abspath(local_path).rstrip("/\\")


@blueprint.context_processor
def update_context():
    return dict(
        app_version=__version__,
        app_title=current_app.config.get(
            "NOMADJACK_APP_TITLE", default_config.NOMADJACK_APP_TITLE
        ),
        editor_theme=current_app.config.get(
            "NOMADJACK_EDITOR_THEME", default_config.NOMADJACK_EDITOR_THEME
        ),
    )


from . import views
