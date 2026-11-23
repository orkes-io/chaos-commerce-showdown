# Chaos Commerce showdown. Terraform builds the machines (from your laptop);
# Conductor workflows on core run the experiment.
#
#   make up        create/update core + sandboxes (infra/terraform.tfvars)
#   make sync      copy repo, model keys and SSH key to core; install + restart workers
#   make register  load conductor/ definitions into core's Conductor
#   make pilot     toy prompt on the pilot sandboxes
#   make run       start chaos_runs for every non-pilot sandbox
#   make status    show running workflows
#   make tunnel    Conductor UI on http://localhost:8080 (via SSH)
#   make pull      copy scrubbed runs/ from core into this repo
#   make scan      full secret scan (working tree + history)
#   make push      scan, then push
#   make down      destroy everything tagged project=chaos-commerce

SHELL := /bin/bash
SSH := ssh -F .state/ssh_config
RSYNC := rsync -az -e "ssh -F .state/ssh_config"
KEY_GOOGLE ?= ~/geminitempkey.txt
KEY_ANTHROPIC ?= ~/nlclaude.txt
SSH_KEY ?= ~/.ssh/chaos_commerce
CAP ?= 90
IDLE ?= 10

.PHONY: up outputs sync register pilot run status tunnel pull scan push down

up:
	cd infra && terraform init -input=false >/dev/null && terraform apply -input=false -auto-approve
	$(MAKE) outputs

outputs:
	mkdir -p .state && cd infra && terraform output -json > ../.state/outputs.json
	python3 scripts/ssh_config.py

sync: outputs
	$(SSH) chaos-core 'until test -f /var/lib/chaos-ready; do sleep 10; done; sudo mkdir -p /srv/chaos/keys /srv/chaos/raw && sudo chown -R ubuntu:ubuntu /srv/chaos && chmod 700 /srv/chaos/keys'
	$(RSYNC) --delete --exclude .git --exclude .state --exclude 'infra/.terraform' --exclude '*.tfvars' \
	  --exclude '*.tfstate*' --exclude runs/ --exclude raw/ ./ chaos-core:/srv/chaos/repo/
	$(SSH) chaos-core 'mkdir -p /srv/chaos/repo/runs'
	$(SSH) chaos-core 'umask 077; cat > /srv/chaos/keys/google.key' < $(KEY_GOOGLE)
	$(SSH) chaos-core 'umask 077; cat > /srv/chaos/keys/anthropic.key' < $(KEY_ANTHROPIC)
	$(SSH) chaos-core 'umask 077; mkdir -p ~/.ssh; cat > ~/.ssh/id_ed25519' < $(SSH_KEY)
	scp -F .state/ssh_config -q .state/hosts.json chaos-core:/srv/chaos/hosts.json
	$(SSH) chaos-core 'set -e; test -x /srv/chaos/venv/bin/python || python3 -m venv /srv/chaos/venv; \
	  /srv/chaos/venv/bin/pip install -q -r /srv/chaos/repo/workers/requirements.txt; \
	  test -d ~/.cache/ms-playwright || (/srv/chaos/venv/bin/playwright install chromium >/dev/null && sudo /srv/chaos/venv/bin/playwright install-deps chromium >/dev/null); \
	  sudo cp /srv/chaos/repo/infra/core/chaos-workers.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now chaos-workers && sudo systemctl restart chaos-workers; \
	  echo synced'

register:
	$(SSH) chaos-core '/srv/chaos/venv/bin/python /srv/chaos/repo/scripts/register.py'

# Builds the chaos_runs input from the sandbox names: neon-* -> Gemini 4 Neon, fable-* -> Fable 5.2
define RUNS_INPUT
import json, sys
names = json.load(open(".state/hosts.json"))["sandboxes"]
pilot = sys.argv[1] == "pilot"
models = {"neon": "google/gemini-4-neon#high", "fable": "anthropic/claude-fable-5-2#high"}
runs = []
for n in sorted(names):
    if n.startswith("pilot-") != pilot:
        continue
    key = n.split("-")[1] if pilot else n.split("-")[0]
    runs.append({"run_id": n, "sandbox": n, "model": models[key]})
print(json.dumps({"runs": runs, "cap_minutes": int(sys.argv[2]), "idle_minutes": int(sys.argv[3])}))
endef
export RUNS_INPUT

pilot:
	python3 -c "$$RUNS_INPUT" pilot 10 3 | $(SSH) chaos-core 'curl -s -X POST -H "Content-Type: application/json" -d @- http://localhost:8080/api/workflow/chaos_runs; echo'

run:
	python3 -c "$$RUNS_INPUT" run $(CAP) $(IDLE) | $(SSH) chaos-core 'curl -s -X POST -H "Content-Type: application/json" -d @- http://localhost:8080/api/workflow/chaos_runs; echo'

status:
	$(SSH) chaos-core 'curl -s "http://localhost:8080/api/workflow/search?size=20&sort=startTime:DESC" | python3 -c "import json,sys; [print(r[\"workflowType\"], r[\"status\"], r[\"workflowId\"], r.get(\"startTime\",\"\")) for r in json.load(sys.stdin).get(\"results\",[])]"'

tunnel:
	@echo "Conductor UI: http://localhost:8080  (Ctrl-C to close)"
	$(SSH) -N -L 8080:localhost:8080 chaos-core

pull:
	$(RSYNC) chaos-core:/srv/chaos/repo/runs/ ./runs/
	python3 scripts/secret_scan.py --paths runs

scan:
	python3 scripts/secret_scan.py --tree --aws --gh
	python3 scripts/secret_scan.py --history --aws --gh

push: scan
	git push $(PUSH_ARGS)

down:
	cd infra && terraform destroy -input=false -auto-approve
