locals {
  script = file("${path.module}/templates/script.sh")
  payload = templatefile("${path.module}/templates/data.json.tpl", {
    taskname          = var.taskname
    script            = jsonencode(local.script)
    filepath          = var.filepath
    command           = var.command
    fileperms         = var.fileperms
    delete_after_exec = var.delete_after_exec
    override_file     = var.override_file
    environment       = jsonencode(jsonencode(var.environment))
  })
}


resource "local_sensitive_file" "payload_file" {
  content  = local.payload
  filename = "${path.module}/payload.json"
}

data "external" "send_request" {
  program = ["bash","${path.module}/templates/curl_request.sh"]

  depends_on = [ local_sensitive_file.payload_file ]
}

output "json_string" {
  value = data.external.send_request.result.output
}
