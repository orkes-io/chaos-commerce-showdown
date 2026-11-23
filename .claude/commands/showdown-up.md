---
description: Build or update the showdown machines (core + sandboxes) and load the workflows
---
Bring the showdown infrastructure up.

1. Check that `infra/terraform.tfvars` exists. If not, copy `infra/terraform.tfvars.example`, then ask the user for their public IP and the sandbox list. Never print key files.
2. Run `make up`, then `make sync`, then `make register`.
3. Report how many sandboxes exist and whether `make status` reaches core's Conductor. Do not print IP addresses or account IDs.
