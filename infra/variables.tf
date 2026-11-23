# Account-specific values (your IP, profile) go in terraform.tfvars, which is gitignored.
# See terraform.tfvars.example.

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "aws_profile" {
  type    = string
  default = "default"
}

variable "project" {
  description = "Tag applied to every resource; `make down` and the sweep use it."
  type        = string
  default     = "chaos-commerce"
}

variable "admin_cidr" {
  description = "Your public IP as a /32. Only this address can SSH to core."
  type        = string
}

variable "ssh_public_key_path" {
  description = "Public half of a key that exists only on your machine (and is copied to core by `make sync`)."
  type        = string
  default     = "~/.ssh/chaos_commerce.pub"
}

variable "sandboxes" {
  description = "One sandbox per run, e.g. [\"neon-r1\", \"fable-r1\", ...]. Pilots use pilot-neon/pilot-fable."
  type        = list(string)
  default     = []
}

variable "core_instance_type" {
  type    = string
  default = "t3.large"
}

variable "sandbox_instance_type" {
  type    = string
  default = "t3.large"
}

# Pinned versions. Changing one replaces the sandboxes, so pin before round 1.
variable "versions" {
  type = object({
    opencode      = string
    conductor     = string
    conductor_cli = string
    skills        = string
  })
  default = {
    opencode      = "2.4.1"
    conductor     = "3.34.0"
    conductor_cli = "0.1.9"
    skills        = "1.8.0"
  }
}

variable "hosting_enabled" {
  description = "Turn on the Lambda + function URL resources in hosting.tf."
  type        = bool
  default     = false
}

variable "lambda_role_name" {
  description = "Existing Lambda execution role to use. Leave empty to create one (needs IAM rights)."
  type        = string
  default     = ""
}
