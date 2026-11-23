# Machines for the showdown: one "core" (pipeline Conductor + workers) and one
# fresh sandbox per agent run. Everything lives in the default VPC and is tagged
# project=<var.project>. No IAM roles or instance profiles are created.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

locals {
  subnet_id = sort(data.aws_subnets.default.ids)[0]
  opencode_config_b64 = base64encode(file("${path.module}/cloud-init/opencode.json"))
}

resource "aws_key_pair" "chaos" {
  key_name   = var.project
  public_key = file(pathexpand(var.ssh_public_key_path))
}

# --- Security groups -------------------------------------------------------

resource "aws_security_group" "core" {
  name        = "${var.project}-core"
  description = "core: SSH from the admin IP only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_cidr]
  }

  # Hosting only: Caddy's HTTPS proxy (and ACME on :80). Kept inline, because a
  # separate aws_security_group_rule is wiped whenever this group is re-applied.
  dynamic "ingress" {
    for_each = var.hosting_enabled ? [80, 443] : []
    content {
      description = "Caddy (ACME + store API proxy)"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "sandbox" {
  name        = "${var.project}-sandbox"
  description = "sandboxes: SSH from core only"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "SSH from core"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.core.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# --- Instances --------------------------------------------------------------

resource "aws_instance" "core" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.core_instance_type
  subnet_id              = local.subnet_id
  vpc_security_group_ids = [aws_security_group.core.id]
  key_name               = aws_key_pair.chaos.key_name
  user_data = templatefile("${path.module}/cloud-init/core.yaml", {
    conductor_version = var.versions.conductor
  })

  root_block_device {
    volume_size = 40
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name = "${var.project}-core"
    role = "core"
  }

  # Sandboxes are disposable: a cloud-init change applies to new ones and never
  # restarts a sandbox that is mid-run.
  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

resource "aws_instance" "sandbox" {
  for_each = toset(var.sandboxes)

  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.sandbox_instance_type
  subnet_id              = local.subnet_id
  vpc_security_group_ids = [aws_security_group.sandbox.id]
  key_name               = aws_key_pair.chaos.key_name
  user_data = templatefile("${path.module}/cloud-init/sandbox.yaml", {
    opencode_version      = var.versions.opencode
    conductor_version     = var.versions.conductor
    conductor_cli_version = var.versions.conductor_cli
    skills_version        = var.versions.skills
    opencode_config_b64   = local.opencode_config_b64
  })

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required"
  }

  tags = {
    Name = "${var.project}-sandbox-${each.key}"
    role = "sandbox"
    run  = each.key
  }

  # Sandboxes are disposable: a cloud-init change applies to new ones and never
  # restarts a sandbox that is mid-run.
  lifecycle {
    ignore_changes = [ami, user_data]
  }
}
