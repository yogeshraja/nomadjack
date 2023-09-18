# -*- coding: utf-8 -*-
"""
nomadjack cli module.
"""
import logging
import os
import sys

import click
from flask import Flask, make_response, request

from . import __pkginfo__, blueprint, default_config

USAGE_STR = f"""Run {default_config.NOMADJACK_APP_TITLE} with given USERNAME and PASSWORD.

All options can be set on the command line or through environment
variables of the form NOMADJACK_*. For example NOMADJACK_USERNAME.
"""


def add_auth(username=None, password=None,token=None, realm=default_config.NOMADJACK_APP_TITLE):
    """
    Add authentication to flask app.
    """
    @blueprint.before_request
    def http_basic_auth():
        auth = request.authorization
        if not (auth and auth.password == password and auth.username == username) or (auth and auth.token == token):
            response = make_response('Unauthorized', 401)
            response.headers.set('WWW-Authenticate', f'Basic realm="{realm}"')
            return response
        return None


def create_flask_app(username=None, password=None, token=None):
    """
    Create the Flask app instance.
    """
    app = Flask(__name__)
    app.url_map.strict_slashes = False
    app.config.from_object(default_config)
    if (username and password) or token:
        add_auth(username=username, password=password,token=token)
    else:
        logging.error("USERNAME and PASSWORD or TOKEN is required")
        sys.exit(1)
    app.register_blueprint(blueprint)
    return app


@click.command(help=USAGE_STR)
@click.option('--local-dir', default='/opt/nomadjack', type=os.path.abspath, help="The folder where nomadjack stores all data")
@click.option('-h', '--host', default='127.0.0.1', help='IP or hostname on which to run HTTP server.')
@click.option('-p', '--port', default=5001, type=int, help='Port on which to bind HTTP server.')
@click.option('--username', default=None, help='HTTP Basic Auth username.')
@click.option('--password', default=None, help='HTTP Basic Auth password.')
@click.option('--token', default=None, help='HTTP Basic Auth token.')
@click.option('--editor-theme', default='vs-dark', type=click.Choice(['vs', 'vs-dark', 'hc-black']), help='Editor theme, default is vs-dark.')
@click.option('--debug', default=False, is_flag=True, help='Run in flask DEBUG mode.')
@click.option('--env', default='development', help='Flask environment, default is development.')
@click.version_option(version=__pkginfo__.version, prog_name=__pkginfo__.title)

def run(local_dir,host, port, username, password,token, editor_theme, debug, env):
    """
    Start the flask app.
    """
    os.environ.setdefault('FLASK_ENV', env)
    os.environ.setdefault('FLASK_DEBUG', '1' if debug else '0')
    app = create_flask_app(username=username, password=password,token=token)
    app.config['NOMADJACK_LOCAL_DIR'] = local_dir
    app.config['NOMADJACK_EDITOR_THEME'] = editor_theme
    app.run(host=host, port=port, debug=debug)


def main():
    """
    Start of the code.
    """
    run(auto_envvar_prefix='NOMADJACK') # pylint:disable=unexpected-keyword-arg,no-value-for-parameter
