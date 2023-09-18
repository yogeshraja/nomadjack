# -*- coding: utf-8 -*-
import os
import io
import sys
import shutil
from functools import wraps
from flask import request, make_response


PY2 = sys.version_info.major == 2
DEFAULT_CHUNK_SIZE = 16 * 1024


if PY2:
    string_types = basestring # pylance:disable=undefined-variable
else:
    string_types = str

def write_file(content, filepath, encoding='utf-8', chunk_size=None):
    success = True
    message = 'File saved successfully'
    if isinstance(content, string_types):
        content_io = io.StringIO()
        content_io.write(content)
        with io.open(filepath, 'w', encoding=encoding, newline='\n') as dest:
            content_io.seek(0)
            try:
                shutil.copyfileobj(content_io, dest, chunk_size or DEFAULT_CHUNK_SIZE)
            except OSError as e:
                success = False
                message = 'Could not save file: ' + str(e)
    else:
        success = False
        message = 'Could not save file: Invalid content'
    return success, message