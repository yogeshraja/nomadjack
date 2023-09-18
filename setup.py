# -*- coding: utf-8 -*-
"""Nomadjack module setup.
"""
import os
from setuptools import setup


BASEDIR = os.path.dirname(__file__)


def readme():
    """
    Read long description.
    """
    with open(os.path.join(BASEDIR, 'README.md'), 'r',encoding="utf-8") as file:
        return file.read()


def get_pkginfo():
    """
    Read package info.
    """
    with open(os.path.join(BASEDIR, 'nomadjack', '__pkginfo__.py'), 'r',encoding="utf-8") as file:
        context = {}
        exec(file.read(), context)
        if 'version' in context:
            return context
    raise RuntimeError('No package info found.')


pkginfo = get_pkginfo()


setup(
    name=pkginfo['title'],
    version=pkginfo['version'],
    license=pkginfo['license'],
    author=pkginfo['author'],
    author_email=pkginfo['email'],
    url=pkginfo['uri'],
    github=pkginfo['github'],
    description=pkginfo['description'],
    long_description=readme(),
    long_description_content_type='text/markdown',
    keywords='nomadjack nomad',
    packages=[''],
    include_package_data=True,
    zip_safe=False,
    platforms='any',
    entry_points={
        'console_scripts': [
            'nomadjack = nomadjack.cli:main',
        ]
    },
    python_requires='>=3.6',
    install_requires=[
        'flask',
    ],
    setup_requires=[
        'pytest-runner',
    ],
    tests_require=[
        'flask',
        'pytest>=4.5.0',
    ],
    classifiers=[
        # 'Development Status :: 1 - Planning',
        # 'Development Status :: 2 - Pre-Alpha',
        'Development Status :: 3 - Alpha',
        # 'Development Status :: 4 - Beta',
        # 'Development Status :: 5 - Production/Stable',
        # 'Development Status :: 6 - Mature',
        # 'Development Status :: 7 - Inactive',
        'Intended Audience :: Developers',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3.6',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
        'Topic :: Internet :: WWW/HTTP',
        'Topic :: Text Editors :: Text Processing',
        'Topic :: Software Development :: Libraries :: Python Modules',
        'Topic :: Utilities',
    ],
)
