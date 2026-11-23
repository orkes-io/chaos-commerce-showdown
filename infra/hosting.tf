# Hosting for the two showcase stores (off until hosting_enabled = true).
#
#   storefront (GitHub Pages) -> Lambda function URL (store backend)
#     -> HTTPS proxy on core (Caddy) -> that store's own Conductor OSS container
#
# The account's Lambda roles can't join the VPC, so the Lambdas reach core over
# HTTPS. Caddy only forwards /<random-secret>/<store>/api/* and refuses metadata
# writes, so the open ports never expose an unauthenticated Conductor.
# Per-store build and handler settings come from deploy/stores.json.

locals {
  # Every store entry has the same fields, so this filters cleanly to an empty map when hosting is off.
  stores    = { for k, v in jsondecode(file("${path.module}/../deploy/stores.json")) : k => v if var.hosting_enabled }
  core_host = "${replace(aws_instance.core.public_ip, ".", "-")}.sslip.io"
}

resource "random_password" "proxy_path" {
  count   = var.hosting_enabled ? 1 : 0
  length  = 32
  special = false
}

resource "aws_security_group_rule" "core_web" {
  for_each          = var.hosting_enabled ? toset(["80", "443"]) : toset([])
  type              = "ingress"
  description       = "Caddy (ACME + store API proxy)"
  from_port         = tonumber(each.key)
  to_port           = tonumber(each.key)
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.core.id
}

data "aws_iam_role" "lambda" {
  count = var.hosting_enabled ? 1 : 0
  name  = var.lambda_role_name
}

resource "aws_lambda_function" "store" {
  for_each         = local.stores
  function_name    = "${var.project}-${each.key}"
  role             = data.aws_iam_role.lambda[0].arn
  runtime          = each.value.runtime
  handler          = each.value.handler
  filename         = "${path.module}/../.state/build/${each.key}.zip"
  source_code_hash = filebase64sha256("${path.module}/../.state/build/${each.key}.zip")
  timeout          = 30
  memory_size      = 512

  reserved_concurrent_executions = 5

  environment {
    variables = merge(each.value.env, {
      (each.value.conductor_env) = "https://${local.core_host}/${random_password.proxy_path[0].result}/${each.key}/api"
    })
  }
}

resource "aws_lambda_function_url" "store" {
  for_each           = local.stores
  function_name      = aws_lambda_function.store[each.key].function_name
  authorization_type = "NONE"
  # No cors block: both stores send their own CORS headers, and an AWS-level rule
  # on top produces duplicate Access-Control-Allow-Origin headers that browsers reject.
}

resource "aws_lambda_permission" "url_invoke" {
  for_each               = local.stores
  statement_id           = "public-url"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.store[each.key].function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "invoke" {
  for_each      = local.stores
  statement_id  = "public-invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.store[each.key].function_name
  principal     = "*"
}

output "function_urls" {
  value = { for k, v in aws_lambda_function_url.store : k => v.function_url }
}

output "proxy" {
  value     = var.hosting_enabled ? { host = local.core_host, path = random_password.proxy_path[0].result } : null
  sensitive = true
}
