#!/bin/bash

set -e

resp=$(curl -H "Authorization: Bearer 123456789" -H "Content-Type: application/json" --request POST --data @payload.json http://localhost:5000/run)
output=$(jq '.output' <<< "${resp}")
jq -n --arg exit_code "$?" --arg resp "${resp}" --arg output "${output}" '{"exit_code":$exit_code,"response":$resp,"output": $output}'