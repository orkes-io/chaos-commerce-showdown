# Written to .state/outputs.json (gitignored) by `make up`; never committed.

output "core_public_ip" {
  value = aws_instance.core.public_ip
}

output "core_private_ip" {
  value = aws_instance.core.private_ip
}

output "sandbox_private_ips" {
  value = { for k, v in aws_instance.sandbox : k => v.private_ip }
}
