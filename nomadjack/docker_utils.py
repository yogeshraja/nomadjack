# -*- coding: utf-8 -*-

import io
import os
import shutil
import subprocess
import tarfile
import uuid
from typing import Optional

import docker
from flask import current_app

docker_client = docker.from_env()


def get_result(exit_code=None, output=None, response_code=200, exec_result=None):
    result = {}
    if exec_result is not None:
        result["exit_code"] = exec_result.exit_code
        result["output"] = exec_result.output.decode("ASCII")
    if exit_code is not None:
        result["exit_code"] = exit_code
    if output is not None:
        result["output"] = output
    result["response_code"] = response_code

    return result


def get_cid():
    result = subprocess.run(
        ["/bin/bash", "-c", 'cat /proc/self/cgroup | grep -Po "(?<=0::/docker/).*"'],
        stdout=subprocess.PIPE,
    )
    return result.stdout.decode("utf-8")


def get_cname(task: str):
    return f"/{task}-{get_alloc_id()}"


def get_alloc_id():
    # return "0fecdc1b-d0b0-17cc-4ea3-fbe5db4ab8fe"
    return os.environ.get("NOMAD_ALLOC_ID", None)


def get_tasks_in_alloc():
    container_list = docker_client.containers.list(
        filters={"label": f"com.hashicorp.nomad.alloc_id={get_alloc_id()}"}
    )
    return container_list


def get_task_map():
    tasks_in_alloc = get_tasks_in_alloc()
    task_map = {
        task.attrs["Name"].lstrip("/").replace(f"-{get_alloc_id()}", ""): task
        for task in tasks_in_alloc
    }
    return task_map


def get_default_user(task: str):
    container = get_task_map().get(task, None)
    default_user = container.attrs.get("Config", {}).get("User", "root")
    default_user = "root" if (len(default_user) == 0) else default_user
    return default_user


def write_file_local(
    content, filepath, fileperms=None, encoding="utf-8", chunk_size=(16 * 1024)
):
    if isinstance(content, str):
        content_io = io.StringIO()
        content_io.write(content)
        with io.open(filepath, "w", encoding=encoding, newline="\n") as dest:
            content_io.seek(0)
            shutil.copyfileobj(content_io, dest, chunk_size)
            os.chmod(filepath, int(f"0o{fileperms}", base=8))


def copy_to(container, src: str, dst: str):
    os.chdir(os.path.dirname(src))
    srcname = os.path.basename(src)
    tar = tarfile.open(src + ".tar", mode="w")
    try:
        tar.add(srcname)
    finally:
        tar.close()

    data = open(src + ".tar", "rb").read()
    container.put_archive(os.path.dirname(dst), data)


def is_file_in_container(container, filepath: str, user: str) -> bool:
    """Returns true if the file is present inside the container

    Args:
        container (docker.container): Container object from docker client
        filepath (str): path of the file to be searched

    Returns:
        bool: true if file is present and false if it is not
    """
    result = container.exec_run(f"/bin/sh -c '[ -f {filepath} ]'", user=user)
    return result.exit_code == 0


def create_file_in_container(
    container,
    content: str,
    filepath: str,
    user: str,
    override_file: bool,
    fileperms: str,
) -> dict[str, int | str]:
    """Creates a

    Args:
        container (_type_): container object from docker client
        content (str): content of the file
        filepath (str): absolute path for the file with file name
        user (str): the user under which the file will be created
        override_file (bool): overrides the file if it is set to true

    Returns:
        dict: returns a dict with `exit_code` and `output`
    """
    local_base_path = current_app.config.get("NOMADJACK_LOCAL_DIR") + "/scripts"
    local_script_dir = uuid.uuid1().hex
    filename = os.path.basename(filepath) if filepath else uuid.uuid1().hex
    local_filepath = "/".join([local_base_path, local_script_dir, filename])
    c_filepath = (
        filepath if (filepath and os.path.isabs(filepath)) else f"/tmp/{filename}"
    )
    result = container.exec_run(
        f"/bin/sh -c 'mkdir -p {os.path.dirname(c_filepath)}'", user=user
    )
    if result.exit_code != 0:
        return get_result(exec_result=result, response_code=500)
    file_present = is_file_in_container(
        container=container, filepath=c_filepath, user=user
    )
    if (not file_present) or (file_present and override_file):
        os.makedirs(os.path.dirname(local_filepath), exist_ok=True)
        write_file_local(content=content, filepath=local_filepath, fileperms=fileperms)
        copy_to(container=container, src=local_filepath, dst=c_filepath)
    else:
        return get_result(
            exit_code=1,
            response_code=500,
            output=f"File already exists in path {c_filepath}. If you wish to override the existing file please select the override file option",
        )
    shutil.rmtree(os.path.dirname(local_filepath))
    return get_result(exit_code=0, output=c_filepath)


def cleanup_container(container, filepath: str, user: str) -> dict[str, str | int]:
    return container.exec_run(f"/bin/sh -c 'rm -f {filepath}'", user=user)


def run_command_in_container(
    task: str,
    script: str,
    command: str,
    filepath: str,
    fileperms: str,
    delete_after_exec: bool,
    override_file: bool,
    user: str,
    workdir: str,
    environment: dict,
) -> dict[str, int | str]:
    container = get_task_map().get(task, None)
    default_user = get_default_user(task=task)
    exec_user = user if user else default_user
    script_path = create_file_in_container(
        container,
        content=script,
        filepath=filepath,
        user=exec_user,
        override_file=override_file,
        fileperms=fileperms,
    )
    if script_path["exit_code"] != 0:
        return script_path
    result = container.exec_run(
        f"{command} {script_path['output']}",
        user=exec_user,
        stdin=True,
        tty=True,
        workdir=workdir,
        environment=environment,
    )
    if delete_after_exec:
        cleanup_container(container=container, filepath=script_path, user=exec_user)
    return get_result(exec_result=result)
