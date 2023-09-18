# -*- coding: utf-8 -*-
"""
Handles views and routing.
"""

from flask import render_template
from . import blueprint


@blueprint.route('/',methods=['GET'])
def home():
    """Render webpage for the root path.
    """
    return render_template('index.html')
