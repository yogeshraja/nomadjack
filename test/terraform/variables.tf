variable "taskname" {
  type = string
}

variable "filepath" {
  type = string
  default = ""
}

variable "command" {
  type    = string
  default = "/bin/bash"
}
variable "fileperms" {
  type    = string
  default = "0644"
}

variable "delete_after_exec" {
  type    = bool
  default = true
}

variable "override_file" {
  type    = bool
  default = false
}

variable "environment" {
  type    = map(string)
  default = {}
}