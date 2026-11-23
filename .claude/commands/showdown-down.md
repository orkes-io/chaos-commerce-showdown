---
description: Tear down every showdown resource
---
1. Run `make pull` so the scrubbed results are copied locally first.
2. Confirm with the user, then run `make down`.
3. Verify nothing tagged `project=chaos-commerce` remains: `aws resourcegroupstaggingapi get-resources --tag-filters Key=project,Values=chaos-commerce --query 'length(ResourceTagMappingList)'`.
